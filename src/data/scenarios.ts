export type LanguageCode = "en" | "hi" | "kn";
export type SimulationMode = "guided" | "crisis";
export type Severity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface MetricSnapshot {
  errorRate: number; // percentage 0 - 100
  p99LatencyMs: number;
  uptimeScore: number; // percentage 0 - 100
  revenueAtRiskUsd: number; // $/min
  activeConnections: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: Severity;
  message: string;
  highlight?: boolean;
  plain?: string; // one-sentence plain-English translation
}

export interface TerminalCommandDef {
  command: string;
  aliases?: string[];
  description: string;
  output: string[];
  unlocksClue?: {
    id: string;
    label: string;
    detail: string;
  };
  logInjection?: LogEntry[];
}

export interface BranchChoice {
  id: string;
  label: string;
  commandEquivalent: string;
  impactSummary: string;
  riskLevel: "low" | "medium" | "high";
  nextNodeId: string;
  metricDelta: Partial<MetricSnapshot>;
  scoreDelta: {
    diagnostics: number;
    mitigation: number;
    composure: number;
    communication: number;
  };
  tags: string[];
  isOptimal?: boolean;
  outcomeNote: string;
}

export interface TerminalResolution {
  status: "RESOLVED" | "DEGRADED" | "CATASTROPHIC";
  headline: string;
  summary: string;
  postmortemKeyTakeaway: string;
}

export interface ScenarioNode {
  id: string;
  stageIndex: number;
  title: string;
  subtitle: string;
  timeBudgetSec: number;
  briefing: Record<LanguageCode, string>;
  guidedHint: string;
  logs: LogEntry[];
  metrics: MetricSnapshot;
  availableCommands: TerminalCommandDef[];
  choices: BranchChoice[];
  terminalNode?: TerminalResolution;
  plainBrief?: { situation: string; stakes: string; firstStep: string };
}

export interface ScenarioDefinition {
  id: string;
  code: string;
  title: string;
  companyContext: string;
  difficulty: "P1 Critical" | "P0 Catastrophic";
  estimatedMinutes: number;
  stack: string[];
  concepts?: { term: string; analogy: string }[];
  startNodeId: string;
  nodes: Record<string, ScenarioNode>;
}

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "system" | "error" | "success";
  text: string;
  timestamp: string;
}

export interface DecisionRecord {
  nodeId: string;
  nodeTitle: string;
  choiceId: string;
  choiceLabel: string;
  commandEquivalent: string;
  riskLevel: "low" | "medium" | "high";
  isOptimal: boolean;
  elapsedAtDecisionSec: number;
  cluesBeforeDecision: string[];
  outcomeNote: string;
  tags: string[];
  metricsAfter: MetricSnapshot;
}

export interface SimulationSession {
  scenarioId: string;
  mode: SimulationMode;
  language: LanguageCode;
  candidateName: string;
  currentNodeId: string;
  metrics: MetricSnapshot;
  logs: LogEntry[];
  terminalLines: TerminalLine[];
  commandsRun: string[];
  cluesDiscovered: { id: string; label: string; detail: string }[];
  decisions: DecisionRecord[];
  scoreAccumulator: {
    diagnostics: number;
    mitigation: number;
    composure: number;
    communication: number;
  };
  startedAt: number;
  completedAt?: number;
  status: "ACTIVE" | "RESOLVED" | "DEGRADED" | "CATASTROPHIC";
}

export interface DeterministicScoreSummary {
  overall: number;
  diagnostics: number;
  mitigation: number;
  composure: number;
  communication: number;
  grade: "S" | "A+" | "A" | "B+" | "B" | "C";
  archetype: string;
  tags: string[];
}

export const LANGUAGE_META: Record<
  LanguageCode,
  { label: string; nativeLabel: string; bcp47: string; voiceHint: string }
> = {
  en: {
    label: "English",
    nativeLabel: "English",
    bcp47: "en-IN",
    voiceHint: "Incident Commander (EN)",
  },
  hi: {
    label: "Hindi",
    nativeLabel: "हिन्दी",
    bcp47: "hi-IN",
    voiceHint: "Incident Commander (HI)",
  },
  kn: {
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    bcp47: "kn-IN",
    voiceHint: "Incident Commander (KN)",
  },
};

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  "pay-409": {
    id: "pay-409",
    code: "INC-PAY-409",
    title: "Peak-Hour UPI Payment Slowdown",
    companyContext: "FinPulse Payments — Bengaluru servers",
    difficulty: "P0 Catastrophic",
    estimatedMinutes: 5,
    stack: ["Kubernetes", "Redis Cluster", "PostgreSQL", "Go Checkout API", "Envoy"],
    concepts: [
      { term: "Redis Cache", analogy: "A fast temporary notepad. Before charging someone, checkout asks it: 'did we already process this payment?' so nobody is charged twice." },
      { term: "Connection Pool", analogy: "Imagine 500 checkout lanes. When all 500 are busy, new payments wait in line until they time out." },
      { term: "Pods", analogy: "Individual copies of our payment server. We run several so the traffic is shared between them." },
    ],
    startNodeId: "stage-1-triage",
    nodes: {
      "stage-1-triage": {
        id: "stage-1-triage",
        stageIndex: 1,
        title: "Payments suddenly start failing",
        subtitle: "9:14 PM · A festival sale sent 4x the usual traffic. Shoppers are seeing checkout errors.",
        timeBudgetSec: 90,
        plainBrief: {
          situation: "Shoppers are seeing failed UPI payments and slow checkout. About 38% of payments are failing.",
          stakes: "Restarting servers blindly won't help: the same buggy code comes back and every server hits Redis at once, making things worse.",
          firstStep: "Run `kubectl get pods`, `redis-cli info clients` and `git diff HEAD~1` to see where the jam is and what changed.",
        },
        briefing: {
          en: "The situation: shoppers are seeing failed UPI payments and slow checkout, about 38 percent failing. The stakes: restarting servers blindly will not help, because the same buggy code comes back and every server hits Redis at once. Your first step: run kubectl get pods, redis-cli info clients and git diff, to see where the jam is and what changed.",
          hi: "अलर्ट! बेंगलुरु चेकआउट क्लस्टर पर P0 घटना हुई है। UPI पेमेंट फेलियर 38 प्रतिशत पार कर गए हैं और लेटेंसी 4 सेकंड से ज़्यादा है। पहले क्लस्टर, Redis पूल और हाल के डिप्लॉय की जांच करें—अंधाधुंध पॉड रीस्टार्ट न करें।",
          kn: "ಎಚ್ಚರಿಕೆ! ಬೆಂಗಳೂರು ಚೆಕ್‌ಔಟ್ ಕ್ಲಸ್ಟರ್‌ನಲ್ಲಿ P0 ಅವಘಡ ಸಂಭವಿಸಿದೆ. UPI ಪಾವತಿ ವೈಫಲ್ಯಗಳು ಶೇಕಡಾ 38 ದಾಟಿದ್ದು, ಲೇಟೆನ್ಸಿ 4 ಸೆಕೆಂಡ್‌ಗಿಂತ ಹೆಚ್ಚಾಗಿದೆ. ಪಾಡ್‌ಗಳನ್ನು ತಕ್ಷಣ ರೀಸ್ಟಾರ್ಟ್ ಮಾಡುವ ಮೊದಲು ಕ್ಲಸ್ಟರ್, Redis ಪೂಲ್ ಮತ್ತು ಇತ್ತೀಚಿನ ಡಿಪ್ಲಾಯ್ ಪರಿಶೀಲಿಸಿ.",
        },
        guidedHint:
          "Try `kubectl get pods`, `redis-cli info clients` or `git diff HEAD~1` first. They show what is slowing checkout down before you pick a fix.",
        metrics: {
          errorRate: 38.4,
          p99LatencyMs: 4420,
          uptimeScore: 61.6,
          revenueAtRiskUsd: 14200,
          activeConnections: 9980,
        },
        logs: [
          {
            id: "l1",
            timestamp: "21:14:02.114",
            service: "envoy-edge",
            level: "ERROR",
            message: "upstream connect error or disconnect/reset before headers. reset reason: overflow (checkout-api:8080)",
            plain: "The front-door proxy gave up because too many requests were waiting for checkout.",
            highlight: true,
          },
          {
            id: "l2",
            timestamp: "21:14:03.402",
            service: "checkout-api-7f9b",
            level: "CRITICAL",
            message: "redis.PoolTimeout: connection pool exhausted (active=500/500, waiters=1842) key=idemp:upi:*",
            plain: "Checkout ran out of free Redis connections (all 500 lanes busy, 1,842 payments waiting), so payments time out.",
            highlight: true,
          },
          {
            id: "l3",
            timestamp: "21:14:04.019",
            service: "checkout-api-3c2a",
            level: "WARN",
            message: "retry-middleware: retrying UPI ledger lock attempt=4/5 backoff=50ms (jitter=disabled)",
            plain: "Failed payments keep retrying with no pause, which piles on even more traffic.",
          },
          {
            id: "l4",
            timestamp: "21:14:05.880",
            service: "pg-primary-01",
            level: "INFO",
            message: "connection utilization 44% (220/500), query p95=18ms — healthy",
            plain: "The database is fine: it is using under half its capacity and answering quickly.",
          },
        ],
        availableCommands: [
          {
            command: "kubectl get pods",
            aliases: ["k get pods", "kubectl get po"],
            description: "Shows whether the checkout servers are healthy or struggling.",
            output: [
              "NAME                            READY   STATUS    RESTARTS   CPU    MEM",
              "checkout-api-7f9b8d4c6-2x8kl    1/1     Running   0          94%    612Mi",
              "checkout-api-7f9b8d4c6-3c2am    1/1     Running   0          96%    640Mi",
              "checkout-api-7f9b8d4c6-9q1pz    1/1     Running   0          92%    598Mi",
              "redis-idempotency-0             1/1     Running   0          99%    1.9Gi",
              "NOTE: All pods are Running (0 OOMKilled). CPU saturation is concentrated on redis-idempotency-0.",
            ],
            unlocksClue: {
              id: "clue-pods-healthy",
              label: "Servers are fine — the cache is jammed",
              detail: "The checkout servers are running normally. The shared cache (Redis) is at 99% load and is the real bottleneck.",
            },
          },
          {
            command: "redis-cli info clients",
            aliases: ["redis info", "redis-cli"],
            description: "Shows how many connections the cache is handling and which ones are stuck.",
            output: [
              "# Clients",
              "connected_clients:9980",
              "maxclients:10000",
              "blocked_clients:1842",
              "client_recent_max_input_buffer:65536",
              "# Slowlog Top Entry",
              "1) (integer) 48219  duration_us=184200  cmd='KEYS idemp:upi:*'",
              "WARNING: O(N) 'KEYS idemp:upi:*' executed 310 req/sec blocking single-threaded Redis event loop!",
            ],
            unlocksClue: {
              id: "clue-redis-keys",
              label: "One slow lookup is clogging the cache",
              detail: "On every retry, checkout runs a slow search over all payment keys (`KEYS`), which freezes Redis for everyone else.",
            },
            logInjection: [
              {
                id: "l-inj-1",
                timestamp: "21:14:19.004",
                service: "redis-idempotency-0",
                level: "CRITICAL",
                message: "SLOWLOG: command `KEYS idemp:upi:*` took 184ms scanning 412,900 keys",
            plain: "One Redis search took 184ms because it scanned every payment key, and that blocked everyone else.",
                highlight: true,
              },
            ],
          },
          {
            command: "git diff HEAD~1",
            aliases: ["cat deploy.diff", "git log -1 -p"],
            description: "Shows the code change shipped 12 minutes ago, right before things broke.",
            output: [
              "commit 8a4f21c (12m ago) — feat(upi): duplicate-charge guard v2.18.4",
              "--- a/internal/upi/idempotency.go",
              "+++ b/internal/upi/idempotency.go",
              "- exists, err := rdb.Exists(ctx, \"idemp:upi:\" + txnID).Result()",
              "+ // scan matching prefix for partial retries",
              "+ keys, err := rdb.Keys(ctx, \"idemp:upi:*\").Result()",
              "+ retryCfg.MaxRetries = 5 // jitter accidentally removed",
            ],
            unlocksClue: {
              id: "clue-bad-deploy",
              label: "A recent update caused this",
              detail: "Release v2.18.4 swapped a quick key check for a slow full search and removed the pause between retries.",
            },
          },
        ],
        choices: [
          {
            id: "c1-rollback-canary",
            label: "Undo the latest update (back to v2.18.3)",
            commandEquivalent: "kubectl rollout undo deployment/checkout-api --to-revision=41",
            impactSummary: "Removes the code change that caused the slowdown, and nobody gets charged twice.",
            riskLevel: "low",
            nextNodeId: "stage-2-stabilize",
            metricDelta: {
              errorRate: -22.0,
              p99LatencyMs: -2700,
              uptimeScore: 22.0,
              revenueAtRiskUsd: -9400,
              activeConnections: -5100,
            },
            scoreDelta: { diagnostics: 30, mitigation: 32, composure: 28, communication: 24 },
            tags: ["root-cause-first", "safe-rollback", "redis-internals"],
            isOptimal: true,
            outcomeNote: "Undoing the update stopped the slow lookups within 18 seconds and cut cache load from 99% to 38%.",
          },
          {
            id: "c1-restart-pods",
            label: "Restart all checkout servers",
            commandEquivalent: "kubectl rollout restart deployment/checkout-api",
            impactSummary: "Gives a brief breather, but the same buggy update comes back and every server hits the cache at once.",
            riskLevel: "high",
            nextNodeId: "stage-2-thundering-herd",
            metricDelta: {
              errorRate: 14.5,
              p99LatencyMs: 1950,
              uptimeScore: -14.5,
              revenueAtRiskUsd: 6800,
              activeConnections: 20,
            },
            scoreDelta: { diagnostics: 8, mitigation: 6, composure: 10, communication: 12 },
            tags: ["premature-restart", "thundering-herd"],
            isOptimal: false,
            outcomeNote: "Restarting without finding the cause sent every server at the cache at once and pushed failures past 52%.",
          },
          {
            id: "c1-disable-idempotency",
            label: "Turn off the duplicate-payment check",
            commandEquivalent: "curl -X POST http://flags.internal/v1/upi_idempotency=off",
            impactSummary: "Speeds things up right away, but customers who retry could be charged twice.",
            riskLevel: "high",
            nextNodeId: "stage-2-double-charge",
            metricDelta: {
              errorRate: -15.0,
              p99LatencyMs: -2900,
              uptimeScore: 12.0,
              revenueAtRiskUsd: 9500,
              activeConnections: -6200,
            },
            scoreDelta: { diagnostics: 12, mitigation: 10, composure: 12, communication: 8 },
            tags: ["data-integrity-risk", "unsafe-bypass"],
            isOptimal: false,
            outcomeNote: "Things sped up, but retried payments immediately started showing up as double charges.",
          },
        ],
      },

      "stage-2-stabilize": {
        id: "stage-2-stabilize",
        stageIndex: 2,
        title: "Retry traffic is piling up",
        subtitle: "9:16 PM · The update was undone, but 14,000 waiting payment retries are now flooding the front door.",
        timeBudgetSec: 90,
        briefing: {
          en: "Good catch! Reverting v2.18.4 stopped the Redis event-loop stall. However, 14,000 mobile clients are still retrying simultaneously without backoff. Check Envoy circuit breakers and Postgres queue depth before opening full traffic.",
          hi: "बढ़िया निर्णय! v2.18.4 को रोलबैक करने से Redis का ब्लॉकेज रुक गया। लेकिन 14,000 मोबाइल क्लाइंट बिना बैकऑफ के फिर से प्रयास कर रहे हैं। पूरा ट्रैफिक खोलने से पहले Envoy सर्किट ब्रेकर और कतार की स्थिति जांचें।",
          kn: "ಅದ್ಭುತ ನಿರ್ಧಾರ! v2.18.4 ರೋಲ್‌ಬ್ಯಾಕ್‌ನಿಂದ Redis ಬ್ಲಾಕ್ ನಿಂತಿದೆ. ಆದರೆ 14,000 ಮೊಬೈಲ್ ಕ್ಲೈಂಟ್‌ಗಳು ಒಮ್ಮೆಲೇ ಮರುಪ್ರಯತ್ನಿಸುತ್ತಿವೆ. ಸಂಪೂರ್ಣ ಟ್ರಾಫಿಕ್ ತೆರೆಯುವ ಮೊದಲು Envoy ಸರ್ಕ್ಯೂಟ್ ಬ್ರೇಕರ್ ಪರಿಶೀಲಿಸಿ.",
        },
        guidedHint:
          "Check `curl -s envoy:9901/stats` and `pg_stat_activity` to see whether the jam is at the front door or in the database.",
        metrics: {
          errorRate: 16.4,
          p99LatencyMs: 1720,
          uptimeScore: 83.6,
          revenueAtRiskUsd: 4800,
          activeConnections: 4880,
        },
        logs: [
          {
            id: "l2-1",
            timestamp: "21:16:04.221",
            service: "checkout-api-v2.18.3",
            level: "INFO",
            message: "rollout complete: O(1) EXISTS restored; redis-idempotency-0 CPU dropped to 38%",
            plain: "The rollback worked: Redis is back to quick lookups and its load dropped to 38%.",
            highlight: true,
          },
          {
            id: "l2-2",
            timestamp: "21:16:07.840",
            service: "envoy-edge",
            level: "WARN",
            message: "retry_budget_exceeded: 64% of inbound requests are client retries (threshold=20%)",
            plain: "Most incoming traffic is now apps retrying failed payments, not new customers.",
            highlight: true,
          },
          {
            id: "l2-3",
            timestamp: "21:16:09.104",
            service: "upi-gateway-worker",
            level: "WARN",
            message: "npci_partner_429: upstream bank rate limit approaching 91% of quota",
            plain: "The bank partner is close to its limit and may start rejecting payments.",
          },
        ],
        availableCommands: [
          {
            command: "curl -s envoy:9901/stats",
            aliases: ["envoy stats", "curl envoy"],
            description: "Shows how many retries the front-door proxy is handling and rejecting.",
            output: [
              "cluster.checkout.upstream_rq_retry: 89420",
              "cluster.checkout.upstream_rq_retry_overflow: 14210",
              "cluster.checkout.upstream_cx_active: 4880",
              "cluster.npci_bank.rq_429_rate: 12.4%",
              "RECOMMENDATION: Enforce adaptive rate-limit + Retry-After jitter headers to protect NPCI quota.",
            ],
            unlocksClue: {
              id: "clue-envoy-retry-storm",
              label: "Apps keep retrying and making it worse",
              detail: "Most incoming traffic is automatic retries, and the bank partner is now telling us to slow down.",
            },
          },
          {
            command: "pg_stat_activity",
            aliases: ["psql", "pg stat"],
            description: "Shows whether the payments database is stuck waiting on locks.",
            output: [
              "active_txns: 142 | waiting_on_lock: 3 | longest_query_ms: 42",
              "ledger_integrity_check: PASS (0 duplicate settlements detected)",
              "replication_lag_ms: 14ms",
            ],
            unlocksClue: {
              id: "clue-pg-clean",
              label: "The database is healthy",
              detail: "The database has no duplicate payments and is keeping up fine, so it doesn't need a bigger machine.",
            },
          },
        ],
        choices: [
          {
            id: "c2-adaptive-shed",
            label: "Slow down retries gently and post a status update",
            commandEquivalent: "envoyctl apply --retry-budget=15% --retry-after-jitter=2s-8s && statuspage post",
            impactSummary: "Spaces out retries so banks aren't overloaded, and tells merchants what's happening.",
            riskLevel: "low",
            nextNodeId: "stage-3-verify",
            metricDelta: {
              errorRate: -14.2,
              p99LatencyMs: -1480,
              uptimeScore: 14.2,
              revenueAtRiskUsd: -4600,
              activeConnections: -3200,
            },
            scoreDelta: { diagnostics: 30, mitigation: 34, composure: 32, communication: 36 },
            tags: ["load-shedding", "incident-comms", "backpressure"],
            isOptimal: true,
            outcomeNote: "Spreading out the retries calmed the spike in 45 seconds without upsetting the banks.",
          },
          {
            id: "c2-scale-db",
            label: "Switch the database to a bigger machine",
            commandEquivalent: "rds-ctl failover --cluster=pg-primary-01 --class=r6g.8xlarge",
            impactSummary: "Causes about a minute where no payments can be saved, even though the database was fine.",
            riskLevel: "high",
            nextNodeId: "end-degraded",
            metricDelta: {
              errorRate: 18.0,
              p99LatencyMs: 2100,
              uptimeScore: -18.0,
              revenueAtRiskUsd: 5200,
              activeConnections: 1100,
            },
            scoreDelta: { diagnostics: 6, mitigation: 8, composure: 10, communication: 14 },
            tags: ["misdiagnosed-db", "unnecessary-failover"],
            isOptimal: false,
            outcomeNote: "The needless database switch froze payment saving for 62 seconds, while the real jam was retry traffic.",
          },
        ],
      },

      "stage-2-thundering-herd": {
        id: "stage-2-thundering-herd",
        stageIndex: 2,
        title: "Recovering from a restart stampede",
        subtitle: "9:16 PM · Restarting made things worse. Failures are now at 52.9%.",
        timeBudgetSec: 75,
        briefing: {
          en: "Escalation! The rolling restart triggered a thundering herd on Redis and errors jumped above 52 percent. You still have one window to recover cleanly: inspect `git diff HEAD~1` or `redis-cli info clients` and execute a real root-cause fix.",
          hi: "एस्केलेशन! रोलिंग रीस्टार्ट से Redis पर थंडरिंग हर्ड बढ़ गया और एरर 52 प्रतिशत पार हो गए। अभी भी सुधार का मौका है—`git diff HEAD~1` की जांच करें और असली रूट कॉज़ ठीक करें।",
          kn: "ತುರ್ತು ಪರಿಸ್ಥಿತಿ! ಪಾಡ್ ರೀಸ್ಟಾರ್ಟ್‌ನಿಂದ Redis ಮೇಲೆ ಒತ್ತಡ ಹೆಚ್ಚಾಗಿ ದೋಷ ದರ ಶೇಕಡಾ 52 ದಾಟಿದೆ. `git diff HEAD~1` ಪರಿಶೀಲಿಸಿ ನಿಜವಾದ ಸಮಸ್ಯೆಯನ್ನು ಈಗಲೇ ಸರಿಪಡಿಸಿ.",
        },
        guidedHint:
          "Run `git diff HEAD~1` to confirm the update caused it, then undo it and slow down incoming retries.",
        metrics: {
          errorRate: 52.9,
          p99LatencyMs: 6370,
          uptimeScore: 47.1,
          revenueAtRiskUsd: 21000,
          activeConnections: 10000,
        },
        logs: [
          {
            id: "l2th-1",
            timestamp: "21:16:12.011",
            service: "checkout-api",
            level: "CRITICAL",
            message: "pod-restart-storm: 12 fresh pods opened 6,000 connections simultaneously; maxclients=10000 reached",
            plain: "Restarting made 12 new servers all connect to Redis at once and use up every connection.",
            highlight: true,
          },
          {
            id: "l2th-2",
            timestamp: "21:16:14.770",
            service: "redis-idempotency-0",
            level: "CRITICAL",
            message: "ERR max number of clients reached; SLOWLOG still flooded with KEYS idemp:upi:*",
            plain: "Redis refused new connections because its limit was reached, and slow searches are still clogging it.",
            highlight: true,
          },
        ],
        availableCommands: [
          {
            command: "git diff HEAD~1",
            aliases: ["cat deploy.diff"],
            description: "Shows what changed in update v2.18.4 (commit 8a4f21c).",
            output: [
              "commit 8a4f21c — feat(upi): duplicate-charge guard v2.18.4",
              "- exists, err := rdb.Exists(ctx, \"idemp:upi:\" + txnID).Result()",
              "+ keys, err := rdb.Keys(ctx, \"idemp:upi:*\").Result()",
              "CRITICAL: Rolling restart kept running the exact same broken image v2.18.4!",
            ],
            unlocksClue: {
              id: "clue-bad-deploy",
              label: "A recent update caused this",
              detail: "Release v2.18.4 swapped a quick key check for a slow full search.",
            },
          },
          {
            command: "redis-cli client list",
            aliases: ["redis clients"],
            description: "Shows which cache connections are idle and which are stuck.",
            output: [
              "total_clients=10000 | active_keys_scans=312 | blocked_waiters=4920",
              "TIP: Rollback deployment first, then apply Envoy circuit breaker to drain.",
            ],
            unlocksClue: {
              id: "clue-maxclients",
              label: "The cache has run out of connections",
              detail: "The restart stampede used up every connection slot the cache has.",
            },
          },
        ],
        choices: [
          {
            id: "c2th-recover",
            label: "Undo the update and let in only 70% of traffic while things drain",
            commandEquivalent: "kubectl rollout undo deploy/checkout-api && envoyctl shed --pct=30",
            impactSummary: "Removes the slow code and lets the cache clear its backlog safely.",
            riskLevel: "medium",
            nextNodeId: "stage-3-verify",
            metricDelta: {
              errorRate: -47.0,
              p99LatencyMs: -5800,
              uptimeScore: 47.0,
              revenueAtRiskUsd: -19500,
              activeConnections: -7600,
            },
            scoreDelta: { diagnostics: 24, mitigation: 26, composure: 24, communication: 22 },
            tags: ["course-correction", "safe-rollback", "load-shedding"],
            isOptimal: true,
            outcomeNote: "Undoing the update and gently limiting traffic rescued the system from a full outage.",
          },
          {
            id: "c2th-flushall",
            label: "Wipe the entire cache to free things up",
            commandEquivalent: "redis-cli FLUSHALL",
            impactSummary: "Deletes every in-progress payment record during peak traffic, so many customers could be charged twice.",
            riskLevel: "high",
            nextNodeId: "end-catastrophic",
            metricDelta: {
              errorRate: 28.0,
              p99LatencyMs: 1200,
              uptimeScore: -28.0,
              revenueAtRiskUsd: 35000,
              activeConnections: 0,
            },
            scoreDelta: { diagnostics: 2, mitigation: 0, composure: 4, communication: 4 },
            tags: ["destructive-action", "data-loss"],
            isOptimal: false,
            outcomeNote: "Wiping the cache erased 412k in-progress payment records, causing many double charges and a mandatory regulator report.",
          },
        ],
      },

      "stage-2-double-charge": {
        id: "stage-2-double-charge",
        stageIndex: 2,
        title: "Stopping the duplicate charges",
        subtitle: "9:16 PM · Skipping the duplicate-payment check caused 184 double charges in 40 seconds.",
        timeBudgetSec: 75,
        briefing: {
          en: "Critical financial alert! Disabling Redis idempotency dropped latency, but 184 customers were double-debited during retries. Immediately re-enable idempotency with a safe rollback or contain settlement exposure.",
          hi: "गंभीर वित्तीय अलर्ट! Redis इडेम्पोटेंसी बंद करने से 184 ग्राहकों से दो बार पैसे कट गए। तुरंत रोलबैक के साथ इडेम्पोटेंसी चालू करें और नुकसान रोकें।",
          kn: "ಗಂಭೀರ ಹಣಕಾಸು ಎಚ್ಚರಿಕೆ! Redis ಇಡೆಂಪೊಟೆನ್ಸಿ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿದ ಕಾರಣ 184 ಗ್ರಾಹಕರಿಂದ ಎರಡು ಬಾರಿ ಹಣ ಕಡಿತವಾಗಿದೆ. ತಕ್ಷಣ ರೋಲ್‌ಬ್ಯಾಕ್ ಮಾಡಿ ಇಡೆಂಪೊಟೆನ್ಸಿ ಮರುಸ್ಥಾಪಿಸಿ.",
        },
        guidedHint:
          "Run `pg_stat_activity` to see how many double charges happened, then undo the update and turn the check back on.",
        metrics: {
          errorRate: 23.4,
          p99LatencyMs: 1520,
          uptimeScore: 73.6,
          revenueAtRiskUsd: 23700,
          activeConnections: 3780,
        },
        logs: [
          {
            id: "l2dc-1",
            timestamp: "21:16:08.550",
            service: "ledger-reconciler",
            level: "CRITICAL",
            message: "DUPLICATE_DEBIT_DETECTED: 184 orders settled twice after upi_idempotency flag disabled",
            plain: "184 customers were charged twice because the duplicate-payment check was off.",
            highlight: true,
          },
          {
            id: "l2dc-2",
            timestamp: "21:16:11.210",
            service: "risk-engine",
            level: "ERROR",
            message: "auto-refund queue growing (+4.6 txns/sec); finance ops paged",
            plain: "Refunds are queued up and growing; the finance team has been alerted.",
          },
        ],
        availableCommands: [
          {
            command: "pg_stat_activity",
            aliases: ["ledger check"],
            description: "Shows how many customers were charged twice.",
            output: [
              "duplicate_txns_last_60s: 184",
              "total_exposure_inr: 6,42,800 INR",
              "RECOMMENDATION: Roll back to v2.18.3 (O(1) EXISTS) and re-enable upi_idempotency flag atomically.",
            ],
            unlocksClue: {
              id: "clue-double-debit-scope",
              label: "184 customers were charged twice",
              detail: "The exact list is in the ledger, so every charge can be reversed automatically.",
            },
          },
        ],
        choices: [
          {
            id: "c2dc-restore-rollback",
            label: "Undo the update, turn the check back on, and refund affected customers",
            commandEquivalent: "kubectl rollout undo deploy/checkout-api && flags set upi_idempotency=on && ledger refund --window=2m",
            impactSummary: "Stops new double charges and returns money to the people already hit.",
            riskLevel: "medium",
            nextNodeId: "end-degraded",
            metricDelta: {
              errorRate: -19.0,
              p99LatencyMs: -1100,
              uptimeScore: 19.0,
              revenueAtRiskUsd: -21500,
              activeConnections: -2000,
            },
            scoreDelta: { diagnostics: 20, mitigation: 22, composure: 20, communication: 24 },
            tags: ["containment", "reconciliation", "safe-rollback"],
            isOptimal: true,
            outcomeNote: "Double charges stopped and refunds started, though the earlier shortcut still counts against you.",
          },
          {
            id: "c2dc-leave-off",
            label: "Leave the check off until the sale ends and fix it overnight",
            commandEquivalent: "echo 'defer reconciliation to batch job'",
            impactSummary: "More customers get charged twice, which is a serious breach of trust.",
            riskLevel: "high",
            nextNodeId: "end-catastrophic",
            metricDelta: {
              errorRate: 12.0,
              p99LatencyMs: 400,
              uptimeScore: -35.0,
              revenueAtRiskUsd: 42000,
              activeConnections: 900,
            },
            scoreDelta: { diagnostics: 4, mitigation: 2, composure: 6, communication: 2 },
            tags: ["integrity-breach", "compliance-violation"],
            isOptimal: false,
            outcomeNote: "Leaving the check off during a sale made the payment gateway shut everything down.",
          },
        ],
      },

      "stage-3-verify": {
        id: "stage-3-verify",
        stageIndex: 3,
        title: "Confirm it's fixed and prevent a repeat",
        subtitle: "9:19 PM · Failures are down to 2.2% and responses take 240ms. Now make sure it can't happen again.",
        timeBudgetSec: 60,
        briefing: {
          en: "Metrics are green! Error rate is back below 2.5 percent and p99 latency is 240 milliseconds. Verify synthetic UPI transactions and lock in a CI/Redis guardrail before closing the incident.",
          hi: "मेट्रिक्स हरे हो गए हैं! एरर रेट 2.5 प्रतिशत से नीचे है और p99 लेटेंसी 240 मिलीसेकंड है। घटना बंद करने से पहले सिंथेटिक UPI ट्रांजैक्शन जांचें और Redis गार्डरेल लॉक करें।",
          kn: "ಮೆಟ್ರಿಕ್ಸ್ ಸಹಜ ಸ್ಥಿತಿಗೆ ಬಂದಿವೆ! ದೋಷ ದರ ಶೇಕಡಾ 2.5 ಕ್ಕಿಂತ ಕಡಿಮೆಯಾಗಿದೆ ಮತ್ತು p99 ಲೇಟೆನ್ಸಿ 240 ಮಿಲಿಸೆಕೆಂಡ್ ಇದೆ. ಘಟನೆ ಮುಕ್ತಾಯಗೊಳಿಸುವ ಮೊದಲು ಸಿಂಥೆಟಿಕ್ UPI ಪರೀಕ್ಷೆ ನಡೆಸಿ Redis ಗಾರ್ಡ್‌ರೈಲ್ ಸೇರಿಸಿ.",
        },
        guidedHint:
          "Run `curl -I https://api.finpulse.in/v1/health/upi` to check payments work, then block the slow command and write up what happened.",
        metrics: {
          errorRate: 2.2,
          p99LatencyMs: 240,
          uptimeScore: 97.8,
          revenueAtRiskUsd: 200,
          activeConnections: 1680,
        },
        logs: [
          {
            id: "l3-1",
            timestamp: "21:19:02.110",
            service: "envoy-edge",
            level: "INFO",
            message: "retry_ratio stabilized at 4.1%; NPCI partner 429 rate = 0.0%",
            plain: "Retries have calmed down and the bank partner is no longer pushing back.",
            highlight: true,
          },
          {
            id: "l3-2",
            timestamp: "21:19:05.908",
            service: "synthetic-probe-blr",
            level: "INFO",
            message: "UPI intent -> collect -> settle E2E latency=218ms status=200 OK",
            plain: "A full test payment worked from start to finish in 218ms.",
            highlight: true,
          },
        ],
        availableCommands: [
          {
            command: "curl -I https://api.finpulse.in/v1/health/upi",
            aliases: ["curl health", "healthcheck"],
            description: "Sends a test payment request to confirm checkout is working again.",
            output: [
              "HTTP/2 200 OK",
              "x-checkout-version: v2.18.3",
              "x-redis-pool-waiters: 0",
              "x-idempotency-integrity: VERIFIED",
              "x-p99-ms: 218",
            ],
            unlocksClue: {
              id: "clue-e2e-verified",
              label: "Payments confirmed working",
              detail: "No one is waiting on the cache, the safe version is live, and a test payment finished in 218ms.",
            },
          },
        ],
        choices: [
          {
            id: "c3-acl-postmortem",
            label: "Block the slow command in Redis, add a CI check, and close with a write-up",
            commandEquivalent: "redis-cli ACL SETUSER app -keys +exists && statuspage resolve --rca",
            impactSummary: "Stops this exact problem from returning and gives the team a clear, blame-free summary.",
            riskLevel: "low",
            nextNodeId: "end-resolved",
            metricDelta: {
              errorRate: -2.0,
              p99LatencyMs: -45,
              uptimeScore: 2.0,
              revenueAtRiskUsd: -200,
              activeConnections: -220,
            },
            scoreDelta: { diagnostics: 35, mitigation: 34, composure: 35, communication: 38 },
            tags: ["systemic-guardrail", "blameless-rca", "verified-recovery"],
            isOptimal: true,
            outcomeNote: "Blocking the slow command stopped a repeat, and the incident closed with nothing lost.",
          },
          {
            id: "c3-close-fast",
            label: "Close the incident now and skip the safety block",
            commandEquivalent: "statuspage resolve --skip-guardrail",
            impactSummary: "Faster to wrap up, but the same kind of mistake could take payments down again.",
            riskLevel: "medium",
            nextNodeId: "end-resolved",
            metricDelta: {
              errorRate: -1.8,
              p99LatencyMs: -25,
              uptimeScore: 1.8,
              revenueAtRiskUsd: -200,
              activeConnections: -150,
            },
            scoreDelta: { diagnostics: 20, mitigation: 20, composure: 22, communication: 16 },
            tags: ["fast-close", "missing-guardrail"],
            isOptimal: false,
            outcomeNote: "Closed cleanly, but skipping the Redis block leaves the door open for the same mistake later.",
          },
        ],
      },

      "end-resolved": {
        id: "end-resolved",
        stageIndex: 4,
        title: "Fixed — payments are back to normal",
        subtitle: "Incident closed. Failures at 0.2% and nobody was charged twice.",
        timeBudgetSec: 0,
        briefing: {
          en: "Outstanding composure! Checkout SLA is back to 99.8 percent with zero ledger discrepancies. Generating your Gemini evaluation and Decision Replay scorecard now.",
          hi: "शानदार प्रदर्शन! चेकआउट SLA 99.8 प्रतिशत पर वापस आ गया है और कोई डेटा त्रुटि नहीं है। अब आपका Gemini मूल्यांकन और डिसीजन रीप्ले स्कोरकार्ड तैयार हो रहा है।",
          kn: "ಅದ್ಭುತ ಕಾರ್ಯಕ್ಷಮತೆ! ಚೆಕ್‌ಔಟ್ SLA ಶೇಕಡಾ 99.8 ಕ್ಕೆ ಮರಳಿದೆ ಮತ್ತು ಯಾವುದೇ ದತ್ತಾಂಶ ದೋಷವಿಲ್ಲ. ನಿಮ್ಮ Gemini ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ಡಿಸಿಷನ್ ರೀಪ್ಲೇ ಸ್ಕೋರ್‌ಕಾರ್ಡ್ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.",
        },
        guidedHint: "Open your scorecard to read the review and copy your lab report.",
        metrics: {
          errorRate: 0.2,
          p99LatencyMs: 195,
          uptimeScore: 99.8,
          revenueAtRiskUsd: 0,
          activeConnections: 1460,
        },
        logs: [
          {
            id: "l-end-res",
            timestamp: "21:20:04.000",
            service: "incident-commander",
            level: "INFO",
            message: "INC-PAY-409 RESOLVED — SLA 99.8%, zero duplicate settlements, Redis ACL hardened.",
            plain: "The incident is closed: payments are healthy and nobody was charged twice.",
            highlight: true,
          },
        ],
        availableCommands: [],
        choices: [],
        terminalNode: {
          status: "RESOLVED",
          headline: "Fixed with no one charged twice",
          summary:
            "You found the slow lookup in the latest update, calmed the retry flood, and protected customers' money.",
          postmortemKeyTakeaway:
            "Check slow-query logs and recent code changes before restarting servers, and block risky Redis commands for good.",
        },
      },

      "end-degraded": {
        id: "end-degraded",
        stageIndex: 4,
        title: "Fixed, with some side effects",
        subtitle: "Payments are back, but an earlier choice caused extra downtime or cleanup.",
        timeBudgetSec: 0,
        briefing: {
          en: "The outage is contained, though secondary blast radius extended customer impact. Let's review your decision trace in the Gemini Decision Replay.",
          hi: "आउटेज नियंत्रित हो गया है, लेकिन अतिरिक्त प्रभाव के कारण रिकवरी धीमी रही। आइए Gemini डिसीजन रीप्ले में आपके निर्णयों की समीक्षा करें।",
          kn: "ಅವಘಡ ನಿಯಂತ್ರಣಕ್ಕೆ ಬಂದಿದೆ, ಆದರೆ ಹೆಚ್ಚುವರಿ ಪರಿಣಾಮದಿಂದ ಚೇತರಿಕೆ ನಿಧಾನವಾಯಿತು. Gemini ಡಿಸಿಷನ್ ರೀಪ್ಲೇಯಲ್ಲಿ ನಿಮ್ಮ ನಿರ್ಧಾರಗಳನ್ನು ಪರಿಶೀಲಿಸೋಣ.",
        },
        guidedHint: "Open your scorecard to see which clues would have avoided the side effects.",
        metrics: {
          errorRate: 4.4,
          p99LatencyMs: 620,
          uptimeScore: 92.6,
          revenueAtRiskUsd: 2200,
          activeConnections: 1780,
        },
        logs: [
          {
            id: "l-end-deg",
            timestamp: "21:21:18.000",
            service: "incident-commander",
            level: "WARN",
            message: "INC-PAY-409 CONTAINED (DEGRADED) — follow-up reconciliation & postmortem required.",
            plain: "Payments work again, but some cleanup and a write-up are still needed.",
            highlight: true,
          },
        ],
        availableCommands: [],
        choices: [],
        terminalNode: {
          status: "DEGRADED",
          headline: "Payments restored, with side effects",
          summary:
            "You got checkout working again, but an earlier wrong guess or shortcut caused avoidable downtime or cleanup.",
          postmortemKeyTakeaway:
            "Check the numbers (`pg_stat_activity`, `redis-cli`) before switching databases or turning off safety checks.",
        },
      },

      "end-catastrophic": {
        id: "end-catastrophic",
        stageIndex: 4,
        title: "Things got much worse — payments halted",
        subtitle: "The payment gateway was shut off to protect customers' money.",
        timeBudgetSec: 0,
        briefing: {
          en: "Emergency kill-switch engaged. Destructive remediation caused data integrity loss and escalated to executive leadership. Generating your Decision Replay for postmortem coaching.",
          hi: "आपातकालीन किल-स्विच सक्रिय हो गया है। डेटा क्षति के कारण घटना एस्केलेट हो गई। पोस्टमॉर्टम कोचिंग के लिए आपका डिसीजन रीप्ले तैयार हो रहा है।",
          kn: "ತುರ್ತು ಕಿಲ್-ಸ್ವಿಚ್ ಸಕ್ರಿಯಗೊಂಡಿದೆ. ದತ್ತಾಂಶ ಹಾನಿಯಿಂದ ಅವಘಡ ಉಲ್ಬಣಗೊಂಡಿದೆ. ಪೋಸ್ಟ್‌ಮಾರ್ಟಂ ವಿಶ್ಲೇಷಣೆಗಾಗಿ ನಿಮ್ಮ ಡಿಸಿಷನ್ ರೀಪ್ಲೇ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.",
        },
        guidedHint: "Open the replay to see why a destructive command or disabled safety check made things worse.",
        metrics: {
          errorRate: 81.2,
          p99LatencyMs: 7850,
          uptimeScore: 18.8,
          revenueAtRiskUsd: 64000,
          activeConnections: 10000,
        },
        logs: [
          {
            id: "l-end-cat",
            timestamp: "21:18:45.000",
            service: "risk-killswitch",
            level: "CRITICAL",
            message: "EMERGENCY CIRCUIT OPEN: checkout gateway halted due to duplicate settlement breach",
            plain: "The gateway was shut off as an emergency because of the double charges.",
            highlight: true,
          },
        ],
        availableCommands: [],
        choices: [],
        terminalNode: {
          status: "CATASTROPHIC",
          headline: "Payments shut off as an emergency",
          summary:
            "A destructive action or an unprotected shortcut broke payment records during peak traffic.",
          postmortemKeyTakeaway:
            "Never wipe live payment data or leave duplicate protection off during retries. Undo the change and slow traffic instead.",
        },
      },
    },
  },

  "auth-502": {
    id: "auth-502",
    code: "INC-AUTH-502",
    title: "Login Failures After Security Key Update",
    companyContext: "CloudMesh Identity — login servers across regions",
    difficulty: "P1 Critical",
    estimatedMinutes: 4,
    stack: ["API Gateway", "JWKS CDN", "Node.js Auth", "Vault KMS"],
    concepts: [
      { term: "JWT", analogy: "A digital login pass your browser shows after you sign in, so servers don't ask for your password again." },
      { term: "JWKS", analogy: "The public list of valid security keys that servers check to decide whether a login pass is real." },
      { term: "CDN Edge Cache", analogy: "Local copies of that key list stored near users (for example in Mumbai) so lookups are fast. If the copy is old, new passes look fake." },
    ],
    startNodeId: "auth-stage-1",
    nodes: {
      "auth-stage-1": {
        id: "auth-stage-1",
        stageIndex: 1,
        title: "Many users suddenly get logged out",
        subtitle: "2:02 PM · A key change finished 3 minutes ago. 41% of users have been signed out.",
        timeBudgetSec: 90,
        plainBrief: {
          situation: "About 41% of users were suddenly logged out and see 401 errors, right after a security key change.",
          stakes: "Changing keys again before finding the cause would make logins fail for even more people.",
          firstStep: "Run `curl -s https://auth.cloudmesh.io/.well-known/jwks.json` and `vault read transit/keys/jwt-prod` to compare the keys in the cache and in the vault.",
        },
        briefing: {
          en: "The situation: about 41 percent of users were suddenly logged out right after a security key change. The stakes: changing keys again before finding the cause would make logins fail for even more people. Your first step: run the curl command on the JWKS file and vault read, to compare the keys in the cache and in the vault.",
          hi: "P1 ऑथ घटना! JWT की रोटेशन के तुरंत बाद मुंबई एज पर 41 प्रतिशत अनुरोध 401 एरर दे रहे हैं। दोबारा की बदलने से पहले JWKS कैश और किड (kid) की जांच करें।",
          kn: "P1 ದೃಢೀಕರಣ ಅವಘಡ! JWT ಕೀ ಬದಲಾವಣೆಯ ನಂತರ ಮುಂಬೈ ಎಡ್ಜ್‌ನಲ್ಲಿ ಶೇಕಡಾ 41 ವಿನಂತಿಗಳು 401 ದೋಷ ನೀಡುತ್ತಿವೆ. ಕೀ ಮರು-ಬದಲಾಯಿಸುವ ಮೊದಲು JWKS ಕ್ಯಾಶ್ ಪರಿಶೀಲಿಸಿ.",
        },
        guidedHint:
          "Run `curl -s https://auth.cloudmesh.io/.well-known/jwks.json` and `vault read transit/keys/jwt-prod` to compare which keys each side knows about.",
        metrics: {
          errorRate: 41.2,
          p99LatencyMs: 680,
          uptimeScore: 58.8,
          revenueAtRiskUsd: 8900,
          activeConnections: 6420,
        },
        logs: [
          {
            id: "a1-1",
            timestamp: "14:02:11.040",
            service: "edge-gateway-bom",
            level: "ERROR",
            message: "jwt.Verify failed: unknown kid='key-2026-11-v2' (cached JWKS only contains ['key-2026-10-v1'])",
            plain: "A login pass was signed with a new key (v2), but this server only knows the old key (v1), so it rejects the pass with a 401 error.",
            highlight: true,
          },
          {
            id: "a1-2",
            timestamp: "14:02:12.889",
            service: "auth-signer-02",
            level: "INFO",
            message: "signed 18,400 tokens with active_kid='key-2026-11-v2'",
            plain: "The login server is already using the new key (v2) for every new login.",
          },
          {
            id: "a1-3",
            timestamp: "14:02:14.120",
            service: "cdn-edge-bom",
            level: "WARN",
            message: "HIT /.well-known/jwks.json age=3120s cache-control='public, max-age=86400'",
            plain: "This edge server is handing out a saved copy of the key list that is almost an hour old and may keep it for 24 hours.",
            highlight: true,
          },
        ],
        availableCommands: [
          {
            command: "curl -s https://auth.cloudmesh.io/.well-known/jwks.json",
            aliases: ["curl jwks", "jwks"],
            description: "Shows the public keys servers use to verify logins, and how long they're cached.",
            output: [
              "HTTP/2 200 | X-Cache: HIT from bom-edge-04 | Cache-Control: public, max-age=86400",
              "{ \"keys\": [ { \"kid\": \"key-2026-10-v1\", \"alg\": \"RS256\" } ] }",
              "DIAGNOSIS: CDN cached old JWKS for 24h! New key 'key-2026-11-v2' is missing at edge POPs.",
            ],
            unlocksClue: {
              id: "clue-cdn-stale-jwks",
              label: "Old key list is cached for 24 hours",
              detail: "The CDN is holding an old copy of the public key list that doesn't include the newly created key.",
            },
          },
          {
            command: "vault read transit/keys/jwt-prod",
            aliases: ["vault read", "vault"],
            description: "Shows which signing keys are currently active in the key vault.",
            output: [
              "latest_version: 2 (kid=key-2026-11-v2) — ACTIVE SIGNING",
              "previous_version: 1 (kid=key-2026-10-v1) — STILL VALID",
              "NOTE: Both v1 and v2 are cryptographically valid; origin publishes both, CDN is serving stale v1-only.",
            ],
            unlocksClue: {
              id: "clue-dual-keys-valid",
              label: "The vault has both keys active",
              detail: "Both keys are valid. Refreshing the CDN's copy fixes logins without logging anyone out.",
            },
          },
        ],
        choices: [
          {
            id: "ca1-purge-ttl",
            label: "Refresh the CDN's key list and shorten its cache time",
            commandEquivalent: "cdnctl purge /.well-known/jwks.json && cdnctl header set max-age=60",
            impactSummary: "Gets both keys to every region in seconds, with nobody logged out.",
            riskLevel: "low",
            nextNodeId: "auth-stage-2-verify",
            metricDelta: {
              errorRate: -39.5,
              p99LatencyMs: -420,
              uptimeScore: 39.5,
              revenueAtRiskUsd: -8600,
              activeConnections: -1400,
            },
            scoreDelta: { diagnostics: 45, mitigation: 48, composure: 45, communication: 42 },
            tags: ["cache-invalidation", "zero-downtime-fix", "auth-architecture"],
            isOptimal: true,
            outcomeNote: "Refreshing the stale CDN copy fixed logins everywhere in 11 seconds without ending anyone's session.",
          },
          {
            id: "ca1-rotate-again",
            label: "Create yet another new key right now",
            commandEquivalent: "vault write -f transit/keys/jwt-prod/rotate",
            impactSummary: "Makes the mismatch worse, since the CDN still serves the old list for 24 hours.",
            riskLevel: "high",
            nextNodeId: "auth-end-degraded",
            metricDelta: {
              errorRate: 24.0,
              p99LatencyMs: 310,
              uptimeScore: -24.0,
              revenueAtRiskUsd: 7100,
              activeConnections: 1200,
            },
            scoreDelta: { diagnostics: 10, mitigation: 8, composure: 14, communication: 14 },
            tags: ["compounded-split-brain", "missed-cdn-cache"],
            isOptimal: false,
            outcomeNote: "Making a third key broke even valid sessions, because the CDN was still serving the old key list.",
          },
        ],
      },

      "auth-stage-2-verify": {
        id: "auth-stage-2-verify",
        stageIndex: 2,
        title: "Make sure every region has the new keys",
        subtitle: "2:04 PM · Login errors dropped to 1.7%. Now set up a safer rotation routine.",
        timeBudgetSec: 60,
        briefing: {
          en: "Brilliant fix! Edge POPs now serve both v1 and v2 keys and 401 errors are down to 1.7 percent. Verify edge JWKS consistency and enforce a pre-publish wait before future rotations.",
          hi: "शानदार समाधान! एज POPs अब v1 और v2 दोनों की सर्व कर रहे हैं और 401 एरर 1.7 प्रतिशत पर आ गए हैं। भविष्य के लिए टू-फेज़ रोटेशन नियम लागू करें।",
          kn: "ಅದ್ಭುತ ಪರಿಹಾರ! ಎಡ್ಜ್ ಸರ್ವರ್‌ಗಳು ಈಗ v1 ಮತ್ತು v2 ಎರಡೂ ಕೀಗಳನ್ನು ನೀಡುತ್ತಿದ್ದು 401 ದೋಷ 1.7% ಕ್ಕೆ ಇಳಿದಿದೆ. ಭವಿಷ್ಯದ ರೋಟೇಶನ್ ನಿಯಮ ದೃಢೀಕರಿಸಿ.",
        },
        guidedHint:
          "Run `curl -I https://auth.cloudmesh.io/.well-known/jwks.json` to confirm the cache time is 60 seconds, then switch to publishing keys before using them.",
        metrics: {
          errorRate: 1.7,
          p99LatencyMs: 260,
          uptimeScore: 98.3,
          revenueAtRiskUsd: 300,
          activeConnections: 5020,
        },
        logs: [
          {
            id: "a2-1",
            timestamp: "14:04:05.331",
            service: "edge-gateway-bom",
            level: "INFO",
            message: "JWKS refreshed: loaded kids=['key-2026-10-v1','key-2026-11-v2'] TTL=60s",
            plain: "The key list was refreshed, now has both keys, and will refresh again every 60 seconds.",
            highlight: true,
          },
        ],
        availableCommands: [
          {
            command: "curl -I https://auth.cloudmesh.io/.well-known/jwks.json",
            aliases: ["verify jwks"],
            description: "Checks the cache time and confirms both keys are visible in every region.",
            output: [
              "HTTP/2 200 | X-Cache: MISS (fresh origin) | Cache-Control: public, max-age=60, stale-while-revalidate=30",
              "Verified active kids: ['key-2026-10-v1', 'key-2026-11-v2'] across 12/12 edge POPs",
            ],
            unlocksClue: {
              id: "clue-jwks-verified",
              label: "All 12 regions match",
              detail: "Every region now shows both keys and refreshes every 60 seconds.",
            },
          },
        ],
        choices: [
          {
            id: "ca2-two-phase",
            label: "Publish new keys 15 minutes early, then close the incident",
            commandEquivalent: "kms-policy set --prepublish-window=15m && statuspage resolve --rca",
            impactSummary: "Makes future key changes safe, with no logouts.",
            riskLevel: "low",
            nextNodeId: "auth-end-resolved",
            metricDelta: {
              errorRate: -1.6,
              p99LatencyMs: -70,
              uptimeScore: 1.6,
              revenueAtRiskUsd: -300,
              activeConnections: -400,
            },
            scoreDelta: { diagnostics: 45, mitigation: 47, composure: 46, communication: 48 },
            tags: ["two-phase-rotation", "systemic-guardrail", "blameless-rca"],
            isOptimal: true,
            outcomeNote: "Publish-then-sign is now policy, so caches can't cause this mismatch again.",
          },
        ],
      },

      "auth-end-resolved": {
        id: "auth-end-resolved",
        stageIndex: 3,
        title: "Fixed — nobody was logged out",
        subtitle: "Logins are back at 99.9%. The new safe-rotation rule is live.",
        timeBudgetSec: 0,
        briefing: {
          en: "Clean execution! Authentication SLA is back to 99.9 percent with zero forced session revocations. Generating your Decision Replay now.",
          hi: "बढ़िया काम! ऑथेंटिकेशन SLA 99.9 प्रतिशत पर लौट आया है। अब आपका डिसीजन रीप्ले तैयार हो रहा है।",
          kn: "ಅತ್ಯುತ್ತಮ ಕೆಲಸ! ದೃಢೀಕರಣ SLA ಶೇಕಡಾ 99.9 ಕ್ಕೆ ಮರಳಿದೆ. ನಿಮ್ಮ ಡಿಸಿಷನ್ ರೀಪ್ಲೇ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.",
        },
        guidedHint: "Open your scorecard to read the review and copy your lab report.",
        metrics: {
          errorRate: 0.1,
          p99LatencyMs: 190,
          uptimeScore: 99.9,
          revenueAtRiskUsd: 0,
          activeConnections: 4620,
        },
        logs: [
          {
            id: "a-end-1",
            timestamp: "14:05:10.000",
            service: "incident-commander",
            level: "INFO",
            message: "INC-AUTH-502 RESOLVED — 12/12 edge POPs synced, 2-phase rotation enforced.",
            plain: "The incident is closed: every region has the new keys and the safe process is in place.",
            highlight: true,
          },
        ],
        availableCommands: [],
        choices: [],
        terminalNode: {
          status: "RESOLVED",
          headline: "Fixed with no one logged out",
          summary:
            "You spotted the 24-hour cache holding an old key list, refreshed it everywhere, and set up safer key changes.",
          postmortemKeyTakeaway:
            "Publish new public keys before you start signing with them, and wait at least twice the cache time.",
        },
      },

      "auth-end-degraded": {
        id: "auth-end-degraded",
        stageIndex: 3,
        title: "Fixed, but people had to log in again",
        subtitle: "A third key change forced a full cache flush and everyone had to sign in again.",
        timeBudgetSec: 0,
        briefing: {
          en: "Incident was contained after senior SRE intervened with a global CDN purge, but extra key rotation forced mass re-logins. Let's inspect the replay.",
          hi: "सीनियर SRE के हस्तक्षेप से आउटेज नियंत्रित हुआ, लेकिन अतिरिक्त की रोटेशन से यूज़र्स को दोबारा लॉगिन करना पड़ा।",
          kn: "ಹಿರಿಯ SRE ಮಧ್ಯಪ್ರವೇಶದಿಂದ ಅವಘಡ ನಿಯಂತ್ರಣಕ್ಕೆ ಬಂದಿದೆ, ಆದರೆ ಹೆಚ್ಚುವರಿ ಕೀ ರೋಟೇಶನ್‌ನಿಂದ ಬಳಕೆದಾರರು ಮತ್ತೆ ಲಾಗಿನ್ ಆಗಬೇಕಾಯಿತು.",
        },
        guidedHint: "Open your scorecard to review the cache clue you missed.",
        metrics: {
          errorRate: 6.2,
          p99LatencyMs: 540,
          uptimeScore: 91.0,
          revenueAtRiskUsd: 3100,
          activeConnections: 5200,
        },
        logs: [
          {
            id: "a-end-deg",
            timestamp: "14:08:20.000",
            service: "incident-commander",
            level: "WARN",
            message: "INC-AUTH-502 CONTAINED (DEGRADED) — forced re-login event logged.",
            plain: "Fixed, but users had to log in again, and it has been recorded.",
            highlight: true,
          },
        ],
        availableCommands: [],
        choices: [],
        terminalNode: {
          status: "DEGRADED",
          headline: "Fixed, but logins were reset unnecessarily",
          summary:
            "Changing keys a third time before checking the cache made the login problems last longer.",
          postmortemKeyTakeaway:
            "Check the cache headers (`X-Cache`, `Cache-Control`) before changing any signing keys.",
        },
      },
    },
  },
};

export const SCENARIO_LIST: ScenarioDefinition[] = Object.values(SCENARIOS);

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val * 10) / 10));
}

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

export function createInitialSession(
  scenarioId: string,
  mode: SimulationMode,
  language: LanguageCode,
  candidateName: string
): SimulationSession {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS["pay-409"];
  const startNode = scenario.nodes[scenario.startNodeId];
  return {
    scenarioId: scenario.id,
    mode,
    language,
    candidateName: candidateName.trim() || "Guest SRE",
    currentNodeId: startNode.id,
    metrics: { ...startNode.metrics },
    logs: [...startNode.logs],
    terminalLines: [
      {
        id: "init-1",
        type: "system",
        text: `OFFGRID WAR-ROOM TERMINAL v2.4 — Connected to ${scenario.companyContext}`,
        timestamp: nowTimeStr(),
      },
      {
        id: "init-2",
        type: "system",
        text: `Incident: [${scenario.code}] ${scenario.title} | Mode: ${mode.toUpperCase()}`,
        timestamp: nowTimeStr(),
      },
      {
        id: "init-3",
        type: "output",
        text: `Type 'help' to list diagnostic commands, 'status' for telemetry, or run live cluster commands.`,
        timestamp: nowTimeStr(),
      },
    ],
    commandsRun: [],
    cluesDiscovered: [],
    decisions: [],
    scoreAccumulator: {
      diagnostics: 0,
      mitigation: 0,
      composure: 0,
      communication: 0,
    },
    startedAt: Date.now(),
    status: "ACTIVE",
  };
}

export function executeTerminalCommand(
  session: SimulationSession,
  rawInput: string
): { session: SimulationSession; triggeredChoiceId?: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) return { session };

  const scenario = SCENARIOS[session.scenarioId];
  const node = scenario.nodes[session.currentNodeId];
  const ts = nowTimeStr();
  const normalized = trimmed.toLowerCase();

  const nextLines: TerminalLine[] = [
    ...session.terminalLines,
    {
      id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "input",
      text: `sre@prod-blr-01:~$ ${trimmed}`,
      timestamp: ts,
    },
  ];

  const commandsRun = [...session.commandsRun, trimmed];

  if (normalized === "clear") {
    return {
      session: {
        ...session,
        commandsRun,
        terminalLines: [
          {
            id: `clr-${Date.now()}`,
            type: "system",
            text: "Terminal cleared. Type 'help' for available commands.",
            timestamp: ts,
          },
        ],
      },
    };
  }

  if (normalized === "help" || normalized === "?") {
    const cmdHelp = node.availableCommands.map(
      (c) => `  ${c.command.padEnd(42, " ")} — ${c.description}`
    );
    nextLines.push({
      id: `out-help-${Date.now()}`,
      type: "output",
      text: [
        "Available diagnostic commands for this stage:",
        ...(cmdHelp.length ? cmdHelp : ["  (No diagnostic commands remaining at terminal state)"]),
        "",
        "Built-in utilities:",
        "  status                                     — Show current incident KPIs & clues",
        "  ls                                         — List incident runbooks & log sockets",
        "  clear                                      — Clear terminal buffer",
      ].join("\n"),
      timestamp: ts,
    });
    return { session: { ...session, commandsRun, terminalLines: nextLines } };
  }

  if (normalized === "status") {
    nextLines.push({
      id: `out-stat-${Date.now()}`,
      type: "output",
      text: [
        `STAGE: ${node.title}`,
        `Error Rate: ${session.metrics.errorRate}% | P99 Latency: ${session.metrics.p99LatencyMs}ms | Uptime: ${session.metrics.uptimeScore}%`,
        `Revenue at Risk: $${session.metrics.revenueAtRiskUsd}/min | Active Connections: ${session.metrics.activeConnections}`,
        `Clues Discovered (${session.cluesDiscovered.length}): ${
          session.cluesDiscovered.map((c) => c.label).join(", ") || "None yet"
        }`,
      ].join("\n"),
      timestamp: ts,
    });
    return { session: { ...session, commandsRun, terminalLines: nextLines } };
  }

  if (normalized === "ls" || normalized === "ls -la") {
    nextLines.push({
      id: `out-ls-${Date.now()}`,
      type: "output",
      text: "deploy.diff   envoy.yaml   idempotency.go   runbook-p0.md   slowlog.txt",
      timestamp: ts,
    });
    return { session: { ...session, commandsRun, terminalLines: nextLines } };
  }

  // Match scenario node diagnostic commands
  const matchedCmd = node.availableCommands.find((cmd) => {
    const base = cmd.command.toLowerCase();
    if (normalized === base || normalized.startsWith(base)) return true;
    return cmd.aliases?.some(
      (alias) => normalized === alias.toLowerCase() || normalized.includes(alias.toLowerCase())
    );
  });

  if (matchedCmd) {
    let cluesDiscovered = [...session.cluesDiscovered];
    let logs = [...session.logs];
    let bonusDiagnostics = 0;

    if (
      matchedCmd.unlocksClue &&
      !cluesDiscovered.some((c) => c.id === matchedCmd.unlocksClue!.id)
    ) {
      cluesDiscovered.push(matchedCmd.unlocksClue);
      bonusDiagnostics = 6;
    }

    if (matchedCmd.logInjection) {
      for (const entry of matchedCmd.logInjection) {
        if (!logs.some((l) => l.id === entry.id)) {
          logs = [entry, ...logs];
        }
      }
    }

    nextLines.push({
      id: `out-cmd-${Date.now()}`,
      type: "output",
      text: matchedCmd.output.join("\n"),
      timestamp: ts,
    });

    if (matchedCmd.unlocksClue && bonusDiagnostics > 0) {
      nextLines.push({
        id: `clue-${Date.now()}`,
        type: "success",
        text: `[CLUE CAPTURED] ${matchedCmd.unlocksClue.label}: ${matchedCmd.unlocksClue.detail}`,
        timestamp: ts,
      });
    }

    return {
      session: {
        ...session,
        commandsRun,
        cluesDiscovered,
        logs,
        terminalLines: nextLines,
        scoreAccumulator: {
          ...session.scoreAccumulator,
          diagnostics: session.scoreAccumulator.diagnostics + bonusDiagnostics,
        },
      },
    };
  }

  // Allow executing a branch choice directly via its CLI equivalent
  const matchedChoice = node.choices.find(
    (ch) =>
      normalized === ch.commandEquivalent.toLowerCase() ||
      normalized.includes(ch.commandEquivalent.toLowerCase().slice(0, 22))
  );
  if (matchedChoice) {
    return {
      session: {
        ...session,
        commandsRun,
        terminalLines: nextLines,
      },
      triggeredChoiceId: matchedChoice.id,
    };
  }

  nextLines.push({
    id: `err-${Date.now()}`,
    type: "error",
    text: `bash: ${trimmed}: command not recognized in this incident scope. Type 'help' to see live cluster tools.`,
    timestamp: ts,
  });

  return { session: { ...session, commandsRun, terminalLines: nextLines } };
}

export function applyDecision(
  session: SimulationSession,
  choiceId: string
): SimulationSession {
  const scenario = SCENARIOS[session.scenarioId];
  const node = scenario.nodes[session.currentNodeId];
  const choice = node.choices.find((c) => c.id === choiceId);
  if (!choice) return session;

  const nextNode = scenario.nodes[choice.nextNodeId];
  if (!nextNode) return session;

  const ts = nowTimeStr();
  const elapsedAtDecisionSec = Math.max(
    1,
    Math.round((Date.now() - session.startedAt) / 1000)
  );

  const updatedMetrics: MetricSnapshot = {
    errorRate: clamp(
      session.metrics.errorRate + (choice.metricDelta.errorRate ?? 0),
      0.1,
      100
    ),
    p99LatencyMs: Math.round(
      clamp(
        session.metrics.p99LatencyMs + (choice.metricDelta.p99LatencyMs ?? 0),
        120,
        12000
      )
    ),
    uptimeScore: clamp(
      session.metrics.uptimeScore + (choice.metricDelta.uptimeScore ?? 0),
      0,
      99.99
    ),
    revenueAtRiskUsd: Math.round(
      clamp(
        session.metrics.revenueAtRiskUsd +
          (choice.metricDelta.revenueAtRiskUsd ?? 0),
        0,
        100000
      )
    ),
    activeConnections: Math.round(
      clamp(
        session.metrics.activeConnections +
          (choice.metricDelta.activeConnections ?? 0),
        200,
        12000
      )
    ),
  };

  // Reward inspecting at least 1 clue before acting in stage
  const stageClueBonus = session.cluesDiscovered.length > session.decisions.length ? 5 : 0;

  const decisionRecord: DecisionRecord = {
    nodeId: node.id,
    nodeTitle: node.title,
    choiceId: choice.id,
    choiceLabel: choice.label,
    commandEquivalent: choice.commandEquivalent,
    riskLevel: choice.riskLevel,
    isOptimal: Boolean(choice.isOptimal),
    elapsedAtDecisionSec,
    cluesBeforeDecision: session.cluesDiscovered.map((c) => c.label),
    outcomeNote: choice.outcomeNote,
    tags: choice.tags,
    metricsAfter: updatedMetrics,
  };

  const nextStatus = nextNode.terminalNode ? nextNode.terminalNode.status : "ACTIVE";

  const nextLogs = [
    ...nextNode.logs.filter((nl) => !session.logs.some((sl) => sl.id === nl.id)),
    ...session.logs,
  ];

  const nextTerminalLines: TerminalLine[] = [
    ...session.terminalLines,
    {
      id: `act-in-${Date.now()}`,
      type: "input",
      text: `sre@prod-blr-01:~$ ${choice.commandEquivalent}`,
      timestamp: ts,
    },
    {
      id: `act-out-${Date.now()}`,
      type: choice.isOptimal ? "success" : "error",
      text: `[ACTION EXECUTED] ${choice.outcomeNote}`,
      timestamp: ts,
    },
    {
      id: `act-stage-${Date.now()}`,
      type: "system",
      text: `>>> Transitioned to ${nextNode.title}`,
      timestamp: ts,
    },
  ];

  return {
    ...session,
    currentNodeId: nextNode.id,
    metrics: nextNode.terminalNode ? nextNode.metrics : updatedMetrics,
    logs: nextLogs,
    terminalLines: nextTerminalLines,
    decisions: [...session.decisions, decisionRecord],
    scoreAccumulator: {
      diagnostics:
        session.scoreAccumulator.diagnostics +
        choice.scoreDelta.diagnostics +
        stageClueBonus,
      mitigation:
        session.scoreAccumulator.mitigation + choice.scoreDelta.mitigation,
      composure:
        session.scoreAccumulator.composure + choice.scoreDelta.composure,
      communication:
        session.scoreAccumulator.communication + choice.scoreDelta.communication,
    },
    completedAt: nextNode.terminalNode ? Date.now() : undefined,
    status: nextStatus,
  };
}

export function computeDeterministicScores(
  session: SimulationSession
): DeterministicScoreSummary {
  const modeMultiplier = session.mode === "crisis" ? 1.08 : 1.0;
  const clueBonus = Math.min(12, session.cluesDiscovered.length * 4);

  const normalize = (raw: number) =>
    Math.min(100, Math.max(18, Math.round((raw + clueBonus * 0.5) * modeMultiplier)));

  const diagnostics = normalize(session.scoreAccumulator.diagnostics);
  const mitigation = normalize(session.scoreAccumulator.mitigation);
  const composure = normalize(session.scoreAccumulator.composure);
  const communication = normalize(session.scoreAccumulator.communication);

  let overall = Math.round(
    diagnostics * 0.3 + mitigation * 0.3 + composure * 0.2 + communication * 0.2
  );

  if (session.status === "CATASTROPHIC") {
    overall = Math.min(overall, 44);
  } else if (session.status === "DEGRADED") {
    overall = Math.min(overall, 74);
  }

  const grade: DeterministicScoreSummary["grade"] =
    overall >= 94
      ? "S"
      : overall >= 86
      ? "A+"
      : overall >= 78
      ? "A"
      : overall >= 68
      ? "B+"
      : overall >= 56
      ? "B"
      : "C";

  const tags = Array.from(
    new Set(session.decisions.flatMap((d) => d.tags))
  );

  let archetype = "Steady On-Call Responder";
  if (overall >= 90 && session.cluesDiscovered.length >= 2) {
    archetype = "Principal Incident Commander";
  } else if (overall >= 80) {
    archetype = "Data-First Systems Debugger";
  } else if (tags.includes("course-correction")) {
    archetype = "Resilient Recovery Engineer";
  } else if (session.status === "CATASTROPHIC") {
    archetype = "High-Risk Firefighter (Needs Guardrails)";
  }

  return {
    overall,
    diagnostics,
    mitigation,
    composure,
    communication,
    grade,
    archetype,
    tags,
  };
}
