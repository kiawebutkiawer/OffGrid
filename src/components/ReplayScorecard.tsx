"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Play,
  Share2,
  Sparkles,
  Terminal,
} from "lucide-react";
import {
  SAMPLE_REPLAY_PAYLOAD,
  decodeReplayPayload,
  encodeReplayPayload,
  loadReplayLocally,
  type ReplayPayload,
} from "@/lib/replay";
import {
  CASE_STUDIES,
  FORMAT_NOTE,
  INTERVIEW_FORMATS,
  buildLabReport,
} from "@/data/realWorld";

export default function ReplayScorecard() {
  const searchParams = useSearchParams();
  const encodedData = searchParams.get("data");

  const [replay, setReplay] = useState<ReplayPayload>(SAMPLE_REPLAY_PAYLOAD);
  const [isDemoReplay, setIsDemoReplay] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    if (encodedData) {
      const decoded = decodeReplayPayload(encodedData);
      if (decoded) {
        setReplay(decoded);
        setIsDemoReplay(false);
        return;
      }
    }
    const localLatest = loadReplayLocally();
    if (localLatest) {
      setReplay(localLatest);
      setIsDemoReplay(false);
    } else {
      setReplay(SAMPLE_REPLAY_PAYLOAD);
      setIsDemoReplay(true);
    }
  }, [encodedData]);

  const shareableUrl = useMemo(() => {
    const encoded = encodeReplayPayload(replay);
    if (typeof window !== "undefined") {
      return `${window.location.origin}/replay?data=${encoded}`;
    }
    return `/replay?data=${encoded}`;
  }, [replay]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      // clipboard unavailable
    }
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildLabReport(replay, shareableUrl));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2400);
    } catch {
      // clipboard unavailable
    }
  };

  const handleCopySummary = async () => {
    const summaryText = [
      `OffGrid Verified Decision Replay — ${replay.candidateName}`,
      `Incident: ${replay.scenarioCode} (${replay.scenarioTitle})`,
      `Mode: ${replay.mode.toUpperCase()} | Outcome: ${replay.finalStatus} in ${replay.elapsedSec}s`,
      `Score: ${replay.evaluation.overallScore}/100 (Grade ${replay.evaluation.grade}) — ${replay.evaluation.archetype}`,
      `Hiring Signal: ${replay.evaluation.hiringSignal.recommendation} (${replay.evaluation.hiringSignal.recommendedLevel})`,
      `Replay URL: ${shareableUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2400);
    } catch {
      // ignore
    }
  };

  const activeDecision = replay.decisions[activeStepIdx] ?? replay.decisions[0];
  const activeReview =
    replay.evaluation.decisionReviews[activeStepIdx] ??
    replay.evaluation.decisionReviews[0];

  const dimensions = [
    { label: "Diagnostics", value: replay.scores.diagnostics, color: "bg-[#3898EC]" },
    { label: "Mitigation", value: replay.scores.mitigation, color: "bg-[#1F6E58]" },
    { label: "Composure", value: replay.scores.composure, color: "bg-[#FF5A36]" },
    { label: "Communication", value: replay.scores.communication, color: "bg-[#24112B]" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F9] text-[#24112B]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#24112B]/80 hover:text-[#24112B] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-mono text-sm font-bold">OFFGRID</span>
            </Link>
            <span className="text-[#24112B]/50">/</span>
            <span className="font-mono text-xs uppercase text-[#1F6E58] font-semibold">
              Your result
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#24112B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#3a1c45] transition"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Replay Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Copy share link</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFF] px-3 py-1.5 text-xs font-medium text-[#24112B]/80  transition"
            >
              {copiedSummary ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#1F6E58]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8 space-y-8">
        {isDemoReplay && (
          <div className="rounded-xl border border-transparent bg-amber-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800">
            <span>
              Viewing a sample verified replay for <strong>{replay.candidateName}</strong>.
              Complete a live outage simulation to generate your own shareable scorecard.
            </span>
            <Link
              href="/sim?scenario=pay-409&mode=guided&lang=en"
              className="inline-flex items-center gap-1 font-mono font-bold text-amber-800 hover:underline"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run Live Incident Now</span>
            </Link>
          </div>
        )}

        {/* Scorecard Hero Summary */}
        <section className="grid lg:grid-cols-12 gap-6">
          {/* Score & Grade Card */}
          <div className="lg:col-span-5 rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)] p-6 flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded bg-[#F3EEFF] px-2 py-0.5 font-mono text-xs font-bold text-[#1E6DB3]">
                    {replay.scenarioCode}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                      replay.finalStatus === "RESOLVED"
                        ? "bg-[#1F6E58]/12 text-[#1F6E58] border border-transparent"
                        : replay.finalStatus === "DEGRADED"
                        ? "bg-amber-100 text-amber-800 border border-transparent"
                        : "bg-[#FF5A36]/15 text-[#C2381B] border border-transparent"
                    }`}
                  >
                    {replay.finalStatus}
                  </span>
                  <span className="rounded bg-[#F3EEFF] border border-[#24112B]/15 px-2 py-0.5 font-mono text-[10px] uppercase text-[#24112B]/80">
                    {replay.mode} mode
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#24112B] mt-2">
                  {replay.candidateName}
                </h1>
                <p className="text-sm text-[#1F6E58] font-medium mt-0.5">
                  {replay.evaluation.archetype}
                </p>
                <p className="text-xs text-[#24112B]/60 mt-1">
                  {replay.scenarioTitle} · Resolved in {replay.elapsedSec}s ·{" "}
                  {replay.commandsCount} CLI commands
                </p>
              </div>

              {/* Score Ring */}
              <div className="h-24 w-24 rounded-2xl border border-transparent bg-[#F3EEFF] flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-3xl font-extrabold text-[#24112B] leading-none">
                  {replay.evaluation.overallScore}
                </span>
                <span className="font-mono text-xs font-bold text-[#1F6E58] mt-1">
                  GRADE {replay.evaluation.grade}
                </span>
              </div>
            </div>

            {/* 4-Axis Dimension Bars */}
            <div className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#24112B]/80 font-medium">{dim.label}</span>
                    <span className="font-mono font-bold text-[#24112B]">
                      {dim.value}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F3EEFF] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${dim.color} transition-all`}
                      style={{ width: `${dim.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluation Source Badge */}
            <div className="pt-3 border-t border-[#24112B]/10 flex items-center justify-between text-[11px] font-mono text-[#24112B]/60">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#1E6DB3]" />
                {replay.evaluation.source === "gemini"
                  ? "Reviewed by AI"
                  : "Scored by built-in rules"}
              </span>
              <span>ID: {replay.id}</span>
            </div>
          </div>

          {/* Gemini Postmortem & Hiring Signal Card */}
          <div className="lg:col-span-7 rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24112B]/10 pb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-[#24112B]">
                  What the reviewer thought
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                  replay.evaluation.hiringSignal.recommendation ===
                  "Strong Fast-Track"
                    ? "bg-[#1F6E58]/12 text-[#1F6E58] border border-transparent"
                    : replay.evaluation.hiringSignal.recommendation ===
                      "Interview Ready"
                    ? "bg-[#3898EC]/12 text-[#1E6DB3] border border-transparent"
                    : "bg-amber-100 text-amber-800 border border-transparent"
                }`}
              >
                {replay.evaluation.hiringSignal.recommendation}
              </span>
            </div>

            <p className="text-sm text-[#24112B]/80 leading-relaxed">
              {replay.evaluation.executiveSummary}
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-transparent bg-[#1F6E58]/8 p-4 space-y-2">
                <h3 className="font-mono text-xs font-bold uppercase text-[#1F6E58] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  What went well
                </h3>
                <ul className="space-y-1.5 text-xs text-[#24112B]/80">
                  {replay.evaluation.strengths.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-transparent bg-amber-100 p-4 space-y-2">
                <h3 className="font-mono text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Things to work on
                </h3>
                <ul className="space-y-1.5 text-xs text-[#24112B]/80">
                  {replay.evaluation.blindSpots.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F6F5F9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase text-[#1E6DB3] font-semibold">
                  Recommended Level: {replay.evaluation.hiringSignal.recommendedLevel}
                </div>
                <p className="text-xs text-[#24112B]/60 mt-1">
                  {replay.evaluation.hiringSignal.recruiterNote}
                </p>
              </div>
              <div className="shrink-0 font-mono text-xs text-[#1F6E58] bg-[#1F6E58]/12 border border-transparent rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-extrabold">{replay.cluesDiscovered.length}</div>
                <div className="text-[10px] uppercase">Clues Found</div>
              </div>
            </div>
          </div>
        </section>

        {/* Your decisions, step by step */}
        <section className="rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#24112B] flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#1E6DB3]" />
                Your decisions, step by step
              </h2>
              <p className="text-xs text-[#24112B]/60 mt-0.5">
                Tap a step to see the command, the clues you had, and feedback.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#24112B]/60">
              <Clock className="h-3.5 w-3.5" />
              <span>Total Time: {replay.elapsedSec}s</span>
            </div>
          </div>

          {/* Step Scrubber Pills */}
          <div className="grid sm:grid-cols-3 gap-3">
            {replay.decisions.map((dec, idx) => {
              const active = idx === activeStepIdx;
              return (
                <button
                  key={`${dec.nodeId}-${idx}`}
                  type="button"
                  onClick={() => setActiveStepIdx(idx)}
                  className={`text-left rounded-xl border p-3.5 transition ${
                    active
                      ? "border-transparent bg-[#3898EC]/12"
                      : "border-[#24112B]/10 bg-[#F6F5F9] hover:border-[#24112B]/15"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#24112B]/60">
                      T+{dec.elapsedAtDecisionSec}s
                    </span>
                    <span
                      className={`font-bold uppercase ${
                        dec.isOptimal ? "text-[#1F6E58]" : "text-amber-600"
                      }`}
                    >
                      {dec.isOptimal ? "OPTIMAL" : "SUBOPTIMAL"}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#24112B] mt-1 truncate">
                    {dec.nodeTitle}
                  </div>
                  <div className="text-[11px] text-[#24112B]/60 mt-0.5 truncate">
                    {dec.choiceLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Step Detail */}
          {activeDecision && (
            <div className="rounded-2xl bg-[#F6F5F9] p-5 grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#1E6DB3]">
                    DECISION #{activeStepIdx + 1}
                  </span>
                  <span className="text-[#24112B]/50">·</span>
                  <span className="text-sm font-bold text-[#24112B]">
                    {activeDecision.choiceLabel}
                  </span>
                </div>

                <div className="rounded-xl bg-[#18181B] px-3 py-2 font-mono text-xs text-emerald-300">
                  $ {activeDecision.commandEquivalent}
                </div>

                <p className="text-xs text-[#24112B]/80 leading-relaxed">
                  <strong className="text-[#24112B]">System Outcome: </strong>
                  {activeDecision.outcomeNote}
                </p>

                {activeReview && (
                  <div className="rounded-xl border border-transparent bg-[#3898EC]/12 p-3 text-xs text-[#1E6DB3] leading-relaxed">
                    <span className="font-mono font-bold text-[#1E6DB3] uppercase block mb-1">
                      Feedback ({activeReview.verdict})
                    </span>
                    {activeReview.critique}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-[#24112B]/10 pt-4 lg:pt-0 lg:pl-5">
                <div className="font-mono text-[11px] uppercase text-[#24112B]/60 font-semibold">
                  Numbers after this decision
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="rounded-xl border border-[#24112B]/10 bg-[#F3EEFF] p-2.5">
                    <div className="text-[10px] text-[#24112B]/50">ERROR RATE</div>
                    <div className="text-sm font-bold text-[#24112B]">
                      {activeDecision.metricsAfter.errorRate}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24112B]/10 bg-[#F3EEFF] p-2.5">
                    <div className="text-[10px] text-[#24112B]/50">P99 LATENCY</div>
                    <div className="text-sm font-bold text-[#24112B]">
                      {activeDecision.metricsAfter.p99LatencyMs}ms
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24112B]/10 bg-[#F3EEFF] p-2.5">
                    <div className="text-[10px] text-[#24112B]/50">UPTIME SLA</div>
                    <div className="text-sm font-bold text-[#1F6E58]">
                      {activeDecision.metricsAfter.uptimeScore}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24112B]/10 bg-[#F3EEFF] p-2.5">
                    <div className="text-[10px] text-[#24112B]/50">CLUES USED</div>
                    <div className="text-sm font-bold text-[#1E6DB3]">
                      {activeDecision.cluesBeforeDecision.length}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeDecision.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#24112B]/15 bg-[#F3EEFF] px-2.5 py-0.5 font-mono text-[10px] text-[#24112B]/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 1: real-world case studies */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold">Real-World Outages Like This</h2>
            <p className="text-sm text-[#24112B]/60 mt-1">
              The bugs in the lab are simplified versions of patterns real teams deal with.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {CASE_STUDIES.map((cs) => (
              <article
                key={cs.id}
                className="rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)] p-5 flex flex-col gap-3"
              >
                <span className="self-start rounded-full bg-[#F3EEFF] px-3 py-1 text-xs font-bold">
                  {cs.field}
                </span>
                <h3 className="text-base font-extrabold leading-snug">{cs.title}</h3>
                <p className="text-sm leading-6 text-[#24112B]/75">{cs.pattern}</p>
                <ul className="space-y-1.5 text-sm leading-6 text-[#24112B]/80">
                  {cs.points.map((pt) => (
                    <li key={pt}>• {pt}</li>
                  ))}
                </ul>
                <p className="mt-auto pt-1 text-xs font-semibold text-[#1F6E58]">
                  {cs.scenarioLink}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: interview formats */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold">
              Interviews That Test This Skill (Beyond LeetCode)
            </h2>
            <p className="text-sm text-[#24112B]/60 mt-1">{FORMAT_NOTE}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {INTERVIEW_FORMATS.map((fmt) => (
              <article
                key={fmt.id}
                className="rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)] p-5 flex flex-col gap-3"
              >
                <h3 className="text-base font-extrabold leading-snug">{fmt.title}</h3>
                <p className="text-xs font-semibold text-[#1E6DB3]">{fmt.seenAt}</p>
                <p className="text-sm leading-6 text-[#24112B]/75">
                  <span className="font-bold">Tests: </span>
                  {fmt.tests}
                </p>
                <ul className="space-y-1.5 text-sm leading-6 text-[#24112B]/80">
                  {fmt.looksLike.map((pt) => (
                    <li key={pt}>• {pt}</li>
                  ))}
                </ul>
                {fmt.id === "campus-readiness" && (
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#24112B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3a1c45] transition"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="h-4 w-4" /> Report copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Verified Lab Report
                      </>
                    )}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}

