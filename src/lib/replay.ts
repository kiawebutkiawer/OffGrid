import type {
  DecisionRecord,
  DeterministicScoreSummary,
  LanguageCode,
  MetricSnapshot,
  SimulationMode,
} from "@/data/scenarios";

export interface GeminiDecisionReview {
  nodeTitle: string;
  choiceLabel: string;
  verdict: "optimal" | "acceptable" | "risky";
  critique: string;
}

export interface EvaluationResult {
  overallScore: number;
  grade: "S" | "A+" | "A" | "B+" | "B" | "C";
  archetype: string;
  executiveSummary: string;
  strengths: string[];
  blindSpots: string[];
  decisionReviews: GeminiDecisionReview[];
  hiringSignal: {
    recommendation: "Strong Fast-Track" | "Interview Ready" | "Needs Deepening";
    recommendedLevel: string;
    recruiterNote: string;
  };
  source: "gemini" | "deterministic_fallback";
}

export interface ReplayPayload {
  id: string;
  createdAt: string;
  scenarioId: string;
  scenarioCode: string;
  scenarioTitle: string;
  mode: SimulationMode;
  language: LanguageCode;
  candidateName: string;
  finalStatus: "RESOLVED" | "DEGRADED" | "CATASTROPHIC";
  elapsedSec: number;
  commandsCount: number;
  cluesDiscovered: string[];
  finalMetrics: MetricSnapshot;
  decisions: DecisionRecord[];
  scores: DeterministicScoreSummary;
  evaluation: EvaluationResult;
}

export function encodeReplayPayload(payload: ReplayPayload): string {
  const json = JSON.stringify(payload);
  if (typeof window !== "undefined") {
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(json, "utf-8").toString("base64url");
}

export function decodeReplayPayload(encoded: string): ReplayPayload | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    let json = "";
    if (typeof window !== "undefined") {
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    } else {
      json = Buffer.from(padded, "base64").toString("utf-8");
    }
    const parsed = JSON.parse(json) as ReplayPayload;
    if (!parsed || !parsed.scenarioId || !parsed.evaluation) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveReplayLocally(payload: ReplayPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`offgrid_replay_${payload.id}`, JSON.stringify(payload));
    localStorage.setItem("offgrid_latest_replay", JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function loadReplayLocally(id?: string): ReplayPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const key = id ? `offgrid_replay_${id}` : "offgrid_latest_replay";
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ReplayPayload) : null;
  } catch {
    return null;
  }
}

export const SAMPLE_REPLAY_PAYLOAD: ReplayPayload = {
  id: "demo-pay409-s1",
  createdAt: "2026-11-25T18:15:00.000Z",
  scenarioId: "pay-409",
  scenarioCode: "INC-PAY-409",
  scenarioTitle: "Peak-Hour UPI Payment Slowdown",
  mode: "crisis",
  language: "en",
  candidateName: "Aarav Menon",
  finalStatus: "RESOLVED",
  elapsedSec: 164,
  commandsCount: 6,
  cluesDiscovered: [
    "Pods Alive — Redis Saturated",
    "O(N) KEYS Command Blocking Redis",
    "Regressing Commit 8a4f21c",
    "Client Retry Amplification",
    "Synthetic UPI SLA Verified",
  ],
  finalMetrics: {
    errorRate: 0.2,
    p99LatencyMs: 195,
    uptimeScore: 99.8,
    revenueAtRiskUsd: 0,
    activeConnections: 1460,
  },
  decisions: [
    {
      nodeId: "stage-1-triage",
      nodeTitle: "Stage 1 — Sudden 503 Checkout Spike",
      choiceId: "c1-rollback-canary",
      choiceLabel: "Roll back checkout-api to v2.18.3 & isolate KEYS caller",
      commandEquivalent: "kubectl rollout undo deployment/checkout-api --to-revision=41",
      riskLevel: "low",
      isOptimal: true,
      elapsedAtDecisionSec: 52,
      cluesBeforeDecision: [
        "Pods Alive — Redis Saturated",
        "O(N) KEYS Command Blocking Redis",
        "Regressing Commit 8a4f21c",
      ],
      outcomeNote: "Rollback eliminated the `KEYS *` storm within 18 seconds, cutting Redis CPU from 99% to 38%.",
      tags: ["root-cause-first", "safe-rollback", "redis-internals"],
      metricsAfter: {
        errorRate: 16.4,
        p99LatencyMs: 1720,
        uptimeScore: 83.6,
        revenueAtRiskUsd: 4800,
        activeConnections: 4880,
      },
    },
    {
      nodeId: "stage-2-stabilize",
      nodeTitle: "Stage 2 — Retry Backlog & Queue Drain",
      choiceId: "c2-adaptive-shed",
      choiceLabel: "Enable Envoy adaptive load-shedding with Retry-After jitter + status update",
      commandEquivalent: "envoyctl apply --retry-budget=15% --retry-after-jitter=2s-8s && statuspage post",
      riskLevel: "low",
      isOptimal: true,
      elapsedAtDecisionSec: 118,
      cluesBeforeDecision: [
        "Pods Alive — Redis Saturated",
        "O(N) KEYS Command Blocking Redis",
        "Regressing Commit 8a4f21c",
        "Client Retry Amplification",
      ],
      outcomeNote: "Adaptive jitter flattened the retry spike in 45 seconds without tripping NPCI bank rate limits.",
      tags: ["load-shedding", "incident-comms", "backpressure"],
      metricsAfter: {
        errorRate: 2.2,
        p99LatencyMs: 240,
        uptimeScore: 97.8,
        revenueAtRiskUsd: 200,
        activeConnections: 1680,
      },
    },
    {
      nodeId: "stage-3-verify",
      nodeTitle: "Stage 3 — Production Verification & Guardrail Lock",
      choiceId: "c3-acl-postmortem",
      choiceLabel: "Disable Redis `KEYS` via ACL, blocklist in CI, & close incident with RCA",
      commandEquivalent: "redis-cli ACL SETUSER app -keys +exists && statuspage resolve --rca",
      riskLevel: "low",
      isOptimal: true,
      elapsedAtDecisionSec: 164,
      cluesBeforeDecision: [
        "Pods Alive — Redis Saturated",
        "O(N) KEYS Command Blocking Redis",
        "Regressing Commit 8a4f21c",
        "Client Retry Amplification",
        "Synthetic UPI SLA Verified",
      ],
      outcomeNote: "Disabled dangerous O(N) `KEYS` at the Redis ACL layer and resolved the P0 with zero data loss.",
      tags: ["systemic-guardrail", "blameless-rca", "verified-recovery"],
      metricsAfter: {
        errorRate: 0.2,
        p99LatencyMs: 195,
        uptimeScore: 99.8,
        revenueAtRiskUsd: 0,
        activeConnections: 1460,
      },
    },
  ],
  scores: {
    overall: 95,
    diagnostics: 96,
    mitigation: 97,
    composure: 94,
    communication: 93,
    grade: "S",
    archetype: "Principal Incident Commander",
    tags: [
      "root-cause-first",
      "safe-rollback",
      "redis-internals",
      "load-shedding",
      "incident-comms",
      "systemic-guardrail",
      "blameless-rca",
    ],
  },
  evaluation: {
    overallScore: 95,
    grade: "S",
    archetype: "Principal Incident Commander",
    executiveSummary:
      "Demonstrated textbook Staff-level incident command under Live Crisis pressure: verified pod and Redis telemetry before touching production state, avoided premature restarts, neutralized retry amplification via Envoy backpressure, and closed the systemic gap using Redis ACLs.",
    strengths: [
      "Inspected `redis-cli info clients` and `git diff HEAD~1` before executing any remediation.",
      "Protected financial ledger integrity by never bypassing UPI idempotency.",
      "Paired immediate mitigation with a permanent Redis ACL blocklist against O(N) commands.",
    ],
    blindSpots: [
      "Could also run `pg_stat_activity` in Stage 2 to document explicit zero-lock confirmation for the postmortem appendix.",
    ],
    decisionReviews: [
      {
        nodeTitle: "Stage 1 — Sudden 503 Checkout Spike",
        choiceLabel: "Roll back checkout-api to v2.18.3 & isolate KEYS caller",
        verdict: "optimal",
        critique:
          "Spot-on root-cause isolation. Avoiding blind pod restarts prevented a thundering herd against an already pinned Redis thread.",
      },
      {
        nodeTitle: "Stage 2 — Retry Backlog & Queue Drain",
        choiceLabel: "Enable Envoy adaptive load-shedding with Retry-After jitter + status update",
        verdict: "optimal",
        critique:
          "Strong systems intuition—protected downstream NPCI rate limits while communicating clearly with merchants.",
      },
      {
        nodeTitle: "Stage 3 — Production Verification & Guardrail Lock",
        choiceLabel: "Disable Redis `KEYS` via ACL, blocklist in CI, & close incident with RCA",
        verdict: "optimal",
        critique:
          "Closed the loop at the infrastructure boundary so future deploys cannot reintroduce the same outage class.",
      },
    ],
    hiringSignal: {
      recommendation: "Strong Fast-Track",
      recommendedLevel: "Staff / Senior SRE & Distributed Systems",
      recruiterNote:
        "High-signal proof of production debugging without AI assistance. Recommended to bypass initial coding screen directly to Systems Architecture & Bar Raiser.",
    },
    source: "deterministic_fallback",
  },
};

