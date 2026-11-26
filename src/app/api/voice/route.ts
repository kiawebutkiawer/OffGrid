import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_META, type LanguageCode } from "@/data/scenarios";

export const runtime = "nodejs";

// ElevenLabs multilingual v2 natively supports English, Hindi, and Kannada
const DEFAULT_VOICE_IDS: Record<LanguageCode, string> = {
  en: "21m00Tcm4TlvDq8ikWAM", // Rachel — crisp operational clarity
  hi: "pNInz6obpgDQGcFmaJgB", // Adam — strong multilingual Hindi cadence
  kn: "EXAVITQu4vr4xnSDxMaL", // Bella — clear multilingual Kannada cadence
};

interface VoiceRequestBody {
  text?: string;
  language?: LanguageCode;
  voiceId?: string;
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  return (
    trimmed.length < 10 ||
    trimmed.toLowerCase().includes("your_") ||
    trimmed.toLowerCase().includes("placeholder")
  );
}

export async function POST(req: NextRequest) {
  let body: VoiceRequestBody;
  try {
    body = (await req.json()) as VoiceRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for /api/voice" },
      { status: 400 }
    );
  }

  const text = (body.text ?? "").trim().slice(0, 1200);
  const language: LanguageCode =
    body.language && body.language in LANGUAGE_META ? body.language : "en";
  const meta = LANGUAGE_META[language];

  if (!text) {
    return NextResponse.json(
      { error: "Missing required `text` field" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Instant graceful fallback when API key is unset or placeholder
  if (isPlaceholderKey(apiKey)) {
    return NextResponse.json(
      {
        fallback: true,
        provider: "browser-fallback",
        reason: "ELEVENLABS_API_KEY not configured",
        language,
        langTag: meta.bcp47,
        text,
      },
      {
        status: 200,
        headers: {
          "X-Voice-Provider": "browser-fallback",
        },
      }
    );
  }

  const voiceId =
    body.voiceId ||
    process.env.ELEVENLABS_VOICE_ID ||
    DEFAULT_VOICE_IDS[language];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey!,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.48,
            similarity_boost: 0.78,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorSnippet = await response.text().catch(() => "");
      return NextResponse.json(
        {
          fallback: true,
          provider: "browser-fallback",
          reason: `ElevenLabs returned ${response.status}`,
          detail: errorSnippet.slice(0, 200),
          language,
          langTag: meta.bcp47,
          text,
        },
        {
          status: 200,
          headers: {
            "X-Voice-Provider": "browser-fallback",
          },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Provider": "elevenlabs",
        "X-Voice-Language": language,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        fallback: true,
        provider: "browser-fallback",
        reason: err instanceof Error ? err.message : "Voice synthesis request failed",
        language,
        langTag: meta.bcp47,
        text,
      },
      {
        status: 200,
        headers: {
          "X-Voice-Provider": "browser-fallback",
        },
      }
    );
  }
}
