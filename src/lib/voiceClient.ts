import { LANGUAGE_META, type LanguageCode } from "@/data/scenarios";

export type VoiceProviderState =
  | "idle"
  | "loading"
  | "elevenlabs"
  | "browser-speech"
  | "text-fallback";

export interface VoicePlaybackCallbacks {
  onStateChange: (state: VoiceProviderState, note?: string) => void;
  onEnd: () => void;
}

class VoiceController {
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private textTimer: ReturnType<typeof setTimeout> | null = null;

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    if (this.textTimer) {
      clearTimeout(this.textTimer);
      this.textTimer = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore synthesis cancel errors
      }
    }
  }

  async speak(
    text: string,
    language: LanguageCode,
    callbacks: VoicePlaybackCallbacks
  ): Promise<void> {
    this.stop();
    callbacks.onStateChange("loading", "Connecting dispatch voice...");

    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("audio/")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        this.currentObjectUrl = url;
        const audio = new Audio(url);
        this.currentAudio = audio;

        callbacks.onStateChange("elevenlabs", "ElevenLabs Multilingual v2");
        audio.onended = () => {
          callbacks.onStateChange("idle");
          callbacks.onEnd();
        };
        audio.onerror = () => {
          this.speakWithBrowserFallback(text, language, callbacks);
        };

        try {
          await audio.play();
          return;
        } catch {
          // Autoplay blocked -> instant browser/text fallback
          this.speakWithBrowserFallback(text, language, callbacks);
          return;
        }
      }

      // Server returned JSON fallback payload
      this.speakWithBrowserFallback(text, language, callbacks);
    } catch {
      this.speakWithBrowserFallback(text, language, callbacks);
    }
  }

  private speakWithBrowserFallback(
    text: string,
    language: LanguageCode,
    callbacks: VoicePlaybackCallbacks
  ): void {
    const meta = LANGUAGE_META[language];

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = meta.bcp47;
        utterance.rate = language === "en" ? 1.04 : 0.98;

        const voices = synth.getVoices();
        const langPrefix = meta.bcp47.split("-")[0].toLowerCase();
        const matched =
          voices.find((v) => v.lang.toLowerCase() === meta.bcp47.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (matched) {
          utterance.voice = matched;
        }

        let started = false;
        utterance.onstart = () => {
          started = true;
          callbacks.onStateChange(
            "browser-speech",
            `Browser Speech (${meta.bcp47})`
          );
        };
        utterance.onend = () => {
          callbacks.onStateChange("idle");
          callbacks.onEnd();
        };
        utterance.onerror = () => {
          this.triggerTextFallback(text, callbacks);
        };

        synth.speak(utterance);

        // If browser blocks speechSynthesis or has no voice for kn-IN/hi-IN, smoothly show live text fallback
        setTimeout(() => {
          if (!started && !synth.speaking) {
            this.triggerTextFallback(text, callbacks);
          }
        }, 700);
        return;
      } catch {
        // fall through to text fallback
      }
    }

    this.triggerTextFallback(text, callbacks);
  }

  private triggerTextFallback(
    text: string,
    callbacks: VoicePlaybackCallbacks
  ): void {
    callbacks.onStateChange("text-fallback", "Live Text Dispatch");
    const durationMs = Math.min(9000, Math.max(3200, text.length * 40));
    this.textTimer = setTimeout(() => {
      callbacks.onStateChange("idle");
      callbacks.onEnd();
    }, durationMs);
  }
}

export const voiceController = new VoiceController();
