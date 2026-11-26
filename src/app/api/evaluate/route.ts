import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  SCENARIOS,
  type DecisionRecord,
  type DeterministicScoreSummary,
  type MetricSnapshot,
  type SimulationMode,
} from "@/data/scenarios";
import type { EvaluationResult } from "@/lib/replay";

export const runtime = "nodejs";

interface EvaluateRequestBody {
  scenarioId: string;
  mode: SimulationMode;
  candidateName: string;
  finalStatus: "RESOLVED" | "DEGRADED" | "CATASTROPHIC";
  elapsedSec: number;
  commandsRun: string[];
  cluesDiscovered: string[];
  finalMetrics: MetricSnapshot;
  decisions: DecisionRecord[];
  deterministicScores: DeterministicScoreSummary;
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

function buildDeterministicEvaluation(body: EvaluateRequestBody): EvaluationResult {
  const { deterministicScores, decisions, cluesDiscovered, finalStatus, mode, commandsRun } =
    body;

  const optimalCount = decisions.filter((d) => d.isOptimal).length;
  const totalDecisions = Math.max(1, decisions.length);

  const strengths: string[] = [];
  const blindSpots: string[] = [];

  if (cluesDiscovered.length >= 2) {
    strengths.push(
      `Evidence-driven debugging: uncovered ${cluesDiscovered.length} telemetry clues (${cluesDiscovered
        .slice(0, 2)
        .join(", ")}) before mutating production.`
    );
  } else {
    blindSpots.push(
      "Acted with limited diagnostic evidence—run cluster inspection commands (`kubectl`, `redis-cli`, `git diff`, `curl`) before taking remediation actions."
    );
  }

  if (optimalCount === totalDecisions && finalStatus === "RESOLVED") {
    strengths.push(
      "Executed optimal low-blast-radius mitigations at every branching stage without triggering cascading regressions."
    );
  } else if (optimalCount > 0) {
    strengths.push(
      `Made ${optimalCount}/${totalDecisions} optimal branching calls and stabilized critical customer flows.`
    );
  }

  if (mode === "crisis" && finalStatus === "RESOLVED") {
    strengths.push(
      "Maintained high composure in Live Crisis Mode with zero coach hints and active revenue burn."
    );
  }

  if (commandsRun.length === 0) {
    blindSpots.push(
      "Did not run direct CLI commands in the terminal—recruiter signal strengthens dramatically when you verify logs & slowlogs firsthand."
    );
  }

  if (finalStatus !== "RESOLVED") {
    blindSpots.push(
      finalStatus === "CATASTROPHIC"
        ? "A destructive remediation or uncontained safety bypass escalated blast radius into a critical integrity halt."
        : "Secondary blast radius extended recovery time—double-check which subsystem is truly saturated before failing over or toggling guards."
    );
  }

  if (strengths.length === 0) {
    strengths.push("Completed the full incident lifecycle and produced an auditable decision trace.");
  }
  if (blindSpots.length === 0) {
    blindSpots.push(
      "Consider checking secondary subsystem health (e.g., DB locks & replication lag) even when the primary bottleneck is obvious."
    );
  }

  const decisionReviews = decisions.map((d) => ({
    nodeTitle: d.nodeTitle,
    choiceLabel: d.choiceLabel,
    verdict: (d.isOptimal
      ? "optimal"
      : d.riskLevel === "high"
      ? "risky"
      : "acceptable") as "optimal" | "acceptable" | "risky",
    critique: d.isOptimal
      ? `${d.outcomeNote} Strong diagnostic sequencing (${d.cluesBeforeDecision.length} clues captured prior to execution).`
      : `${d.outcomeNote} Prefer verifying root cause in logs/diffs before executing high-blast-radius actions.`,
  }));

  const recommendation: EvaluationResult["hiringSignal"]["recommendation"] =
    deterministicScores.overall >= 82 && finalStatus === "RESOLVED"
      ? "Strong Fast-Track"
      : deterministicScores.overall >= 65
      ? "Interview Ready"
      : "Needs Deepening";

  const recommendedLevel =
    deterministicScores.overall >= 90
      ? "Staff / Senior SRE & Distributed Systems"
      : deterministicScores.overall >= 76
      ? "Senior Backend / Platform Engineer (SDE-3)"
      : deterministicScores.overall >= 60
      ? "Backend / Cloud Reliability Engineer (SDE-2)"
      : "Production Engineering Resident";

  const scenario = SCENARIOS[body.scenarioId];

  return {
    overallScore: deterministicScores.overall,
    grade: deterministicScores.grade,
    archetype: deterministicScores.archetype,
    executiveSummary: `${body.candidateName} completed ${
      scenario?.code ?? body.scenarioId
    } in ${body.elapsedSec}s (${mode.toUpperCase()} mode) with outcome ${finalStatus}. Captured ${
      cluesDiscovered.length
    } forensic clues across ${commandsRun.length} terminal commands and scored ${
      deterministicScores.overall
    }/100 (${deterministicScores.grade}).`,
    strengths,
    blindSpots,
    decisionReviews,
    hiringSignal: {
      recommendation,
      recommendedLevel,
      recruiterNote:
        recommendation === "Strong Fast-Track"
          ? "Verified hands-on production debugging signal under pressure. Recommended to fast-track past initial screening."
          : recommendation === "Interview Ready"
          ? "Solid incident fundamentals with clear room to sharpen blast-radius containment. Ready for technical loop."
          : "Demonstrated willingness to act under pressure; recommend targeted chaos-engineering & observability practice.",
    },
    source: "deterministic_fallback",
  };
}

export async function POST(req: NextRequest) {
  let body: EvaluateRequestBody;
  try {
    body = (await req.json()) as EvaluateRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for /api/evaluate" },
      { status: 400 }
    );
  }

  if (!body.scenarioId || !body.deterministicScores) {
    return NextResponse.json(
      { error: "Missing scenarioId or deterministicScores" },
      { status: 400 }
    );
  }

  const fallbackResult = buildDeterministicEvaluation(body);
  const apiKey = process.env.GEMINI_API_KEY;

  if (isPlaceholderKey(apiKey)) {
    return NextResponse.json(fallbackResult, { status: 200 });
  }

  const scenario = SCENARIOS[body.scenarioId];

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const prompt = `You are a Principal Site Reliability Engineer and Engineering Hiring Bar-Raiser evaluating a candidate's live production outage simulation on OffGrid (an AI-free debugging assessment).

Return ONLY valid JSON matching this exact schema (no markdown fences):
{
  "overallScore": number (0-100, stay within +/-8 points of deterministic baseline ${body.deterministicScores.overall}),
  "grade": "S" | "A+" | "A" | "B+" | "B" | "C",
  "archetype": string (3-5 words describing their debugging style),
  "executiveSummary": string (2 concise sentences tailored to their actual commands and choices),
  "strengths": string[] (2-3 concrete bullet items referencing exact commands/decisions),
  "blindSpots": string[] (1-2 constructive bullet items),
  "decisionReviews": [
    {
      "nodeTitle": string,
      "choiceLabel": string,
      "verdict": "optimal" | "acceptable" | "risky",
      "critique": string (1-2 crisp sentences)
    }
  ],
  "hiringSignal": {
    "recommendation": "Strong Fast-Track" | "Interview Ready" | "Needs Deepening",
    "recommendedLevel": string,
    "recruiterNote": string (1-2 crisp sentences for hiring managers)
  }
}

CANDIDATE TELEMETRY:
- Candidate: ${body.candidateName}
- Incident: ${scenario?.code ?? body.scenarioId} — ${scenario?.title ?? ""}
- Mode: ${body.mode}
- Final Status: ${body.finalStatus}
- Total Duration: ${body.elapsedSec}s
- Deterministic Baseline: ${JSON.stringify(body.deterministicScores)}
- Terminal Commands Run: ${JSON.stringify(body.commandsRun)}
- Forensic Clues Discovered: ${JSON.stringify(body.cluesDiscovered)}
- Final Production Metrics: ${JSON.stringify(body.finalMetrics)}
- Decision Trace: ${JSON.stringify(
      body.decisions.map((d) => ({
        stage: d.nodeTitle,
        choice: d.choiceLabel,
        command: d.commandEquivalent,
        isOptimal: d.isOptimal,
        riskLevel: d.riskLevel,
        elapsedSec: d.elapsedAtDecisionSec,
        cluesBeforeActing: d.cluesBeforeDecision,
        outcome: d.outcomeNote,
      }))
    )}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return NextResponse.json(fallbackResult, { status: 200 });
    }

    const parsed = JSON.parse(rawText) as Omit<EvaluationResult, "source">;

    const merged: EvaluationResult = {
      overallScore:
        typeof parsed.overallScore === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
          : fallbackResult.overallScore,
      grade: parsed.grade || fallbackResult.grade,
      archetype: parsed.archetype || fallbackResult.archetype,
      executiveSummary: parsed.executiveSummary || fallbackResult.executiveSummary,
      strengths:
        Array.isArray(parsed.strengths) && parsed.strengths.length > 0
          ? parsed.strengths
          : fallbackResult.strengths,
      blindSpots:
        Array.isArray(parsed.blindSpots) && parsed.blindSpots.length > 0
          ? parsed.blindSpots
          : fallbackResult.blindSpots,
      decisionReviews:
        Array.isArray(parsed.decisionReviews) && parsed.decisionReviews.length > 0
          ? parsed.decisionReviews
          : fallbackResult.decisionReviews,
      hiringSignal:
        parsed.hiringSignal && parsed.hiringSignal.recommendation
          ? parsed.hiringSignal
          : fallbackResult.hiringSignal,
      source: "gemini",
    };

    return NextResponse.json(merged, { status: 200 });
  } catch {
    return NextResponse.json(fallbackResult, { status: 200 });
  }
}
