import type { ReplayPayload } from "@/lib/replay";

export interface CaseStudy {
  id: string;
  title: string;
  field: string;
  pattern: string;
  points: string[];
  scenarioLink: string;
}

export interface InterviewFormat {
  id: string;
  title: string;
  seenAt: string;
  tests: string;
  looksLike: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "upi-surge",
    title: "UPI & Festival Flash-Sale Surges",
    field: "Fintech / Payments",
    pattern:
      "High-volume Indian payment systems see sudden 4x–10x spikes during festival sales and salary days, where a single slow lookup can cascade into timeouts.",
    points: [
      "Payment APIs use a fast idempotency store (like Redis) to check whether a transaction was already processed.",
      "Retrying failed requests without idempotency causes duplicate charges when users tap Pay again.",
      "Engineers inspect slow logs, connection pools, and recent deploys to isolate the bottleneck instead of blindly restarting servers.",
    ],
    scenarioLink: "Practised in: Peak-Hour UPI Payment Slowdown",
  },
  {
    id: "edge-auth",
    title: "Edge Auth & Key-Rotation Outages",
    field: "Cloud / API Gateways",
    pattern:
      "Global edge networks (CDNs) cache public security keys (JWKS) close to users so login verification stays fast.",
    points: [
      "When signing keys rotate, a long CDN cache TTL can keep serving the old key list for hours.",
      "Valid login passes signed with the new key look invalid at edge servers, triggering waves of 401 logouts.",
      "Stale edge caches have caused major login outages across SaaS platforms until caches are purged and two-phase rotation is enforced.",
    ],
    scenarioLink: "Practised in: Login Failures After Security Key Update",
  },
  {
    id: "broker-silos",
    title: "Broker & High-Frequency Order Silos",
    field: "Trading / Market Open",
    pattern:
      "Trading platforms face massive bursts of orders at market open, so a single degraded network link or pool cannot be allowed to take everyone down.",
    points: [
      "Traffic is partitioned into isolated silos so one overloaded group or order type cannot starve other traders.",
      "Each silo has bounded connection pools and circuit breakers to stop failures from spreading.",
      "When a primary link or pool degrades under sudden load, routers shift traffic to fallback paths and shed excess retries cleanly.",
    ],
    scenarioLink: "Same principles as: connection pools and load-shedding in the UPI lab",
  },
];

export const INTERVIEW_FORMATS: InterviewFormat[] = [
  {
    id: "bug-squash",
    title: "Live Bug-Squash & Log Triage Rounds",
    seenAt: "Used by modern fintech & API companies like Stripe and Postman",
    tests:
      "Reading unfamiliar logs, reproducing errors, and isolating root causes in a real codebase.",
    looksLike: [
      "You are given a broken service and a stream of logs or failing tests.",
      "Interviewers watch how you form hypotheses and narrow down the fault.",
      "Methodical debugging matters far more than memorizing algorithms.",
    ],
  },
  {
    id: "incident-commander",
    title: "Incident Commander & Post-Mortem (RCA) Rounds",
    seenAt: "Used by cloud & infrastructure teams like Atlassian and Cloudflare",
    tests:
      "Calm communication, safe rollback decisions, and writing clear post-incident summaries.",
    looksLike: [
      "You walk through a simulated production outage with changing symptoms.",
      "You weigh safe rollbacks against risky shortcuts under time pressure.",
      "You wrap up with a blameless root-cause analysis and prevention steps.",
    ],
  },
  {
    id: "campus-readiness",
    title: "Campus & Internship Production Readiness",
    seenAt: "Built for GitHub READMEs, portfolios, and internship applications",
    tests:
      "Showing concrete proof that you can investigate logs and reason about live systems—not just solve puzzles.",
    looksLike: [
      "Copy a formatted summary of your steps, clues found, and root-cause explanation.",
      "Attach it to a project README, portfolio, or internship application.",
      "Use it as a clear talking point when recruiters ask about debugging experience.",
    ],
  },
];

export const FORMAT_NOTE =
  "Real engineering interviews increasingly test live debugging and incident judgment alongside—or instead of—algorithm puzzles.";

const ROOT_CAUSES: Record<string, string> = {
  "INC-PAY-409":
    "Release v2.18.4 replaced an O(1) Redis EXISTS lookup with an O(N) KEYS scan and removed retry jitter. Under flash-sale load, KEYS blocked Redis's single thread, exhausting the 500-connection pool and causing 503 checkout timeouts.",
  "INC-AUTH-502":
    "After rotating JWT signing keys to v2, the CDN edge continued serving a 24-hour cached /.well-known/jwks.json containing only v1. Edge gateways rejected valid v2 tokens with 401 errors until the CDN cache was purged and TTL lowered.",
};

export function buildLabReport(replay: ReplayPayload, replayUrl: string): string {
  const mins = Math.max(1, Math.round(replay.elapsedSec / 60));
  const rootCause =
    ROOT_CAUSES[replay.scenarioCode] ?? replay.evaluation.executiveSummary;

  const steps = replay.decisions.length
    ? replay.decisions
        .map(
          (d, i) =>
            `${i + 1}. ${d.choiceLabel}\n   - Command: \`${d.commandEquivalent}\`\n   - Outcome: ${d.outcomeNote}`
        )
        .join("\n")
    : "- No decisions recorded.";

  const clues = replay.cluesDiscovered.length
    ? replay.cluesDiscovered.map((c) => `- ${c}`).join("\n")
    : "- None recorded";

  return [
    `# OffGrid Verified Lab Report — ${replay.scenarioTitle}`,
    "",
    `- **Candidate:** ${replay.candidateName}`,
    `- **Scenario:** ${replay.scenarioCode} (${replay.mode} mode)`,
    `- **Outcome:** ${replay.finalStatus} in ~${mins} min (${replay.elapsedSec}s, ${replay.commandsCount} CLI commands)`,
    `- **Score:** ${replay.evaluation.overallScore}/100 (Grade ${replay.evaluation.grade}) — ${replay.evaluation.archetype}`,
    "",
    "## Clues Found",
    clues,
    "",
    "## Steps Taken",
    steps,
    "",
    "## Root-Cause Explanation",
    rootCause,
    "",
    "## Review Summary",
    replay.evaluation.executiveSummary,
    "",
    `Interactive Replay: ${replayUrl}`,
  ].join("\n");
}
