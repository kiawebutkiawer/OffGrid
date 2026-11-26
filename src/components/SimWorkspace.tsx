"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Play,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  LANGUAGE_META,
  SCENARIOS,
  applyDecision,
  computeDeterministicScores,
  createInitialSession,
  executeTerminalCommand,
  type LanguageCode,
  type Severity,
  type SimulationMode,
  type SimulationSession,
} from "@/data/scenarios";
import {
  encodeReplayPayload,
  saveReplayLocally,
  type EvaluationResult,
  type ReplayPayload,
} from "@/lib/replay";
import { voiceController, type VoiceProviderState } from "@/lib/voiceClient";

export default function SimWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scenarioId = searchParams.get("scenario") || "pay-409";
  const initialMode: SimulationMode =
    searchParams.get("mode") === "crisis" ? "crisis" : "guided";
  const initialLang = (searchParams.get("lang") as LanguageCode) || "en";
  const validLang: LanguageCode = initialLang in LANGUAGE_META ? initialLang : "en";
  const candidateName = searchParams.get("handle") || "Guest SRE";

  const [session, setSession] = useState<SimulationSession>(() =>
    createInitialSession(scenarioId, initialMode, validLang, candidateName)
  );
  const [language, setLanguage] = useState<LanguageCode>(validLang);
  const [cliInput, setCliInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [logFilter, setLogFilter] = useState<Severity | "ALL">("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [stageRemainingSec, setStageRemainingSec] = useState<number>(() => {
    const sc = SCENARIOS[scenarioId] ?? SCENARIOS["pay-409"];
    return sc.nodes[sc.startNodeId].timeBudgetSec;
  });

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceProviderState>("idle");
  const [voiceProviderNote, setVoiceProviderNote] = useState<string>("Ready");
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(initialMode === "guided");

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [plainOn, setPlainOn] = useState(initialMode === "guided");
  const [conceptsOpen, setConceptsOpen] = useState(initialMode === "guided");
  const [labStarted, setLabStarted] = useState(initialMode !== "guided");

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scenario = SCENARIOS[session.scenarioId] ?? SCENARIOS["pay-409"];
  const currentNode = scenario.nodes[session.currentNodeId];
  const isTerminal = Boolean(currentNode.terminalNode);

  // Auto-scroll terminal on new lines
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.terminalLines]);

  // Reset stage countdown on node change
  useEffect(() => {
    setStageRemainingSec(currentNode.timeBudgetSec);
  }, [currentNode.id, currentNode.timeBudgetSec]);

  // Live incident clock + crisis metric bleed
  useEffect(() => {
    if (isTerminal || !labStarted) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
      setStageRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));

      // In Live Crisis mode, revenue at risk creeps up slightly every second
      if (session.mode === "crisis") {
        setSession((prev) => {
          if (prev.status !== "ACTIVE") return prev;
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              revenueAtRiskUsd: Math.min(
                99000,
                prev.metrics.revenueAtRiskUsd + 35
              ),
            },
          };
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isTerminal, session.mode, labStarted]);

  // Number keys trigger runbook actions when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTerminal || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const idx = Number(e.key) - 1;
      const choice = currentNode.choices[idx];
      if (choice) {
        setLabStarted(true);
        setSession((prev) => applyDecision(prev, choice.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTerminal, currentNode]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      voiceController.stop();
    };
  }, []);

  const playBriefing = (langOverride?: LanguageCode) => {
    if (voiceMuted) return;
    const langToUse = langOverride ?? language;
    const briefingText = currentNode.briefing[langToUse];
    voiceController.speak(briefingText, langToUse, {
      onStateChange: (st, note) => {
        setVoiceState(st);
        if (note) setVoiceProviderNote(note);
      },
      onEnd: () => {
        setVoiceState("idle");
      },
    });
  };

  // Auto-announce new stage briefing if unmuted (except initial load unless user clicks or transitions)
  const prevNodeRef = useRef<string>(currentNode.id);
  useEffect(() => {
    if (prevNodeRef.current !== currentNode.id) {
      prevNodeRef.current = currentNode.id;
      if (!voiceMuted) {
        playBriefing();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode.id]);

  const handleLanguageSwitch = (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setSession((prev) => ({ ...prev, language: nextLang }));
    if (voiceState !== "idle") {
      playBriefing(nextLang);
    }
  };

  const handleRunCommand = (cmdText: string) => {
    if (!cmdText.trim() || isTerminal) return;
    setLabStarted(true);
    const { session: nextSession, triggeredChoiceId } = executeTerminalCommand(
      session,
      cmdText
    );
    if (triggeredChoiceId) {
      const branched = applyDecision(nextSession, triggeredChoiceId);
      setSession(branched);
    } else {
      setSession(nextSession);
    }
    setCliInput("");
    setHistoryIdx(-1);
    inputRef.current?.focus();
  };

  const handleDecision = (choiceId: string) => {
    if (isTerminal) return;
    setLabStarted(true);
    const next = applyDecision(session, choiceId);
    setSession(next);
  };

  const handleReset = () => {
    voiceController.stop();
    setVoiceState("idle");
    setElapsedSec(0);
    setEvalError(null);
    if (session.mode === "guided") {
      setLabStarted(false);
      setConceptsOpen(true);
    }
    setSession(
      createInitialSession(
        scenario.id,
        session.mode,
        language,
        session.candidateName
      )
    );
  };

  const handleGenerateScorecard = async () => {
    if (evaluating) return;
    setEvaluating(true);
    setEvalError(null);

    const deterministicScores = computeDeterministicScores(session);
    const finalStatus =
      session.status === "ACTIVE" ? "RESOLVED" : session.status;

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: session.scenarioId,
          mode: session.mode,
          candidateName: session.candidateName,
          finalStatus,
          elapsedSec: Math.max(1, elapsedSec),
          commandsRun: session.commandsRun,
          cluesDiscovered: session.cluesDiscovered.map((c) => c.label),
          finalMetrics: session.metrics,
          decisions: session.decisions,
          deterministicScores,
        }),
      });

      if (!res.ok) {
        throw new Error(`Evaluation failed (${res.status})`);
      }

      const evaluation = (await res.json()) as EvaluationResult;

      const replayId = `og-${Date.now().toString(36)}`;
      const payload: ReplayPayload = {
        id: replayId,
        createdAt: new Date().toISOString(),
        scenarioId: scenario.id,
        scenarioCode: scenario.code,
        scenarioTitle: scenario.title,
        mode: session.mode,
        language,
        candidateName: session.candidateName,
        finalStatus,
        elapsedSec: Math.max(1, elapsedSec),
        commandsCount: session.commandsRun.length,
        cluesDiscovered: session.cluesDiscovered.map((c) => c.label),
        finalMetrics: session.metrics,
        decisions: session.decisions,
        scores: {
          ...deterministicScores,
          overall: evaluation.overallScore,
          grade: evaluation.grade,
          archetype: evaluation.archetype,
        },
        evaluation,
      };

      saveReplayLocally(payload);
      const encoded = encodeReplayPayload(payload);
      router.push(`/replay?data=${encoded}`);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Could not generate replay scorecard"
      );
      setEvaluating(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return session.logs.filter((log) => {
      if (logFilter !== "ALL" && log.level !== logFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.service.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [session.logs, logFilter, logSearch]);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRunCommand(cliInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (session.commandsRun.length === 0) return;
      const nextIdx =
        historyIdx === -1
          ? session.commandsRun.length - 1
          : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setCliInput(session.commandsRun[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= session.commandsRun.length) {
        setHistoryIdx(-1);
        setCliInput("");
      } else {
        setHistoryIdx(nextIdx);
        setCliInput(session.commandsRun[nextIdx]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = currentNode.availableCommands.find((c) =>
        c.command.toLowerCase().startsWith(cliInput.trim().toLowerCase())
      );
      if (match) setCliInput(match.command);
    }
  };

  const sevTag: Record<Severity, { tag: string; cls: string }> = {
    CRITICAL: { tag: "CRIT", cls: "bg-[#FF5A36]/15 text-[#C2381B]" },
    ERROR: { tag: "ERR", cls: "bg-[#FF5A36]/10 text-[#C2381B]" },
    WARN: { tag: "WARN", cls: "bg-amber-100 text-amber-800" },
    INFO: { tag: "INFO", cls: "bg-[#24112B]/5 text-[#24112B]/60" },
  };

  const m = session.metrics;
  const pill = {
    red: "bg-[#FF5A36]/15 text-[#C2381B]",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-[#1F6E58]/12 text-[#1F6E58]",
  };
  const kpis: { label: string; value: string; tone: keyof typeof pill }[] = [
    {
      label: "Errors",
      value: `${m.errorRate.toFixed(1)}%`,
      tone: m.errorRate > 15 ? "red" : m.errorRate > 3 ? "amber" : "green",
    },
    {
      label: "Slowest 1%",
      value: `${m.p99LatencyMs}ms`,
      tone: m.p99LatencyMs > 1500 ? "red" : m.p99LatencyMs > 500 ? "amber" : "green",
    },
    {
      label: "Uptime",
      value: `${m.uptimeScore.toFixed(1)}%`,
      tone: m.uptimeScore < 85 ? "red" : m.uptimeScore < 97 ? "amber" : "green",
    },
    {
      label: "Revenue at risk",
      value: `$${m.revenueAtRiskUsd.toLocaleString()}/min`,
      tone:
        m.revenueAtRiskUsd > 5000 ? "red" : m.revenueAtRiskUsd > 500 ? "amber" : "green",
    },
  ];

  const commandRows = currentNode.availableCommands.map((c) => ({
    command: c.command,
    description: c.description,
  }));
  const crisisRows = [
    { command: "help", description: "Lists the commands you can run right now." },
    { command: "status", description: "Shows the current numbers for this incident." },
  ];
  const rowsToShow = session.mode === "guided" ? commandRows : crisisRows;

  const card = "rounded-3xl bg-white shadow-[0_6px_24px_-12px_rgba(36,17,43,0.18)]";
  const label = "text-xs font-bold uppercase tracking-wide text-[#24112B]/50";

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F6F5F9] text-[#24112B] font-sans lg:overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            offgrid
          </Link>
          <span className="text-[#24112B]/25">/</span>
          <span className="text-sm font-bold truncate">{scenario.title}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              session.mode === "crisis"
                ? "bg-[#FF5A36]/15 text-[#C2381B]"
                : "bg-[#1F6E58]/12 text-[#1F6E58]"
            }`}
          >
            {session.mode === "crisis" ? "Live crisis" : "Guided"}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-full bg-white p-1 text-xs font-semibold shadow-sm">
            {(Object.keys(LANGUAGE_META) as LanguageCode[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageSwitch(code)}
                className={`rounded-full px-3 py-1 transition ${
                  language === code
                    ? "bg-[#24112B] text-white"
                    : "text-[#24112B]/60 hover:text-[#24112B]"
                }`}
              >
                {LANGUAGE_META[code].nativeLabel}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 font-mono tabular-nums text-xs font-semibold shadow-sm">
            {formatClock(elapsedSec)}
            {session.mode === "guided" && !labStarted && !isTerminal && (
              <span className="ml-2 text-[#24112B]/50">paused</span>
            )}
            {session.mode === "crisis" && !isTerminal && (
              <span
                className={`ml-2 ${
                  stageRemainingSec <= 20 ? "text-[#C2381B]" : "text-[#24112B]/50"
                }`}
              >
                stage {formatClock(stageRemainingSec)}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow-sm hover:bg-[#F3EEFF]"
          >
            Restart
          </button>
        </div>
      </header>

      {/* Status pills */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-5 pb-3">
        {kpis.map((k) => (
          <span
            key={k.label}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${pill[k.tone]}`}
          >
            {k.label}
            <span className="font-mono tabular-nums font-bold">{k.value}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold shadow-sm">
          Clues found
          <span className="font-mono tabular-nums font-bold">
            {session.cluesDiscovered.length}
          </span>
        </span>
      </div>

      {/* Workspace */}
      <main className="flex-1 min-h-0 grid gap-4 px-5 pb-5 lg:grid-cols-[minmax(300px,28%)_minmax(0,1fr)_minmax(320px,28%)]">
        {/* Logs + clues */}
        <section className={`${card} min-h-[320px] lg:min-h-0 flex flex-col overflow-hidden`}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">What the system is saying</h2>
            <span className="font-mono tabular-nums text-xs text-[#24112B]/50">
              {filteredLogs.length}
            </span>
          </div>
          <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
            {(["ALL", "CRITICAL", "ERROR", "WARN", "INFO"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setLogFilter(sev)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  logFilter === sev
                    ? "bg-[#24112B] text-white"
                    : "bg-[#F3EEFF] text-[#24112B]/70 hover:bg-[#E8DFFF]"
                }`}
              >
                {sev === "ALL" ? "All" : sevTag[sev].tag}
              </button>
            ))}
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search"
              className="w-20 rounded-full bg-[#F3EEFF] px-3 py-0.5 text-[11px] placeholder:text-[#24112B]/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setPlainOn((v) => !v)}
              className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                plainOn
                  ? "bg-[#1F6E58] text-white"
                  : "bg-[#F3EEFF] text-[#24112B]/70 hover:bg-[#E8DFFF]"
              }`}
            >
              Plain English: {plainOn ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 font-mono text-xs leading-5">
            {filteredLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedLogId(log.id === selectedLogId ? null : log.id)}
                className={`w-full text-left rounded-xl px-2 py-1.5 flex gap-2 hover:bg-[#F3EEFF]/60 ${
                  selectedLogId === log.id ? "bg-[#F3EEFF]" : ""
                }`}
              >
                <span className="text-[#24112B]/40 tabular-nums shrink-0">
                  {log.timestamp.split(".")[0]}
                </span>
                <span
                  className={`h-4 leading-4 px-1.5 rounded-full text-[10px] font-bold shrink-0 ${
                    sevTag[log.level].cls
                  }`}
                >
                  {sevTag[log.level].tag}
                </span>
                <span className="min-w-0 break-words">
                  <span className="text-[#24112B]/50">{log.service}</span>{" "}
                  <span className="text-[#24112B]">{log.message}</span>
                  {plainOn && log.plain && (
                    <span className="mt-0.5 block font-sans text-xs leading-5 text-[#1F6E58]">
                      {log.plain}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="shrink-0 max-h-[34%] min-h-[96px] flex flex-col border-t border-[#24112B]/8">
            <h3 className="px-4 pt-3 pb-1 text-sm font-extrabold">
              Clues you found ({session.cluesDiscovered.length})
            </h3>
            <div className="overflow-y-auto px-4 pb-3 space-y-2 text-xs">
              {session.cluesDiscovered.length === 0 ? (
                <p className="text-[#24112B]/50">
                  Nothing yet. Run a command in the terminal to look for clues.
                </p>
              ) : (
                session.cluesDiscovered.map((clue) => (
                  <div key={clue.id} className="rounded-2xl bg-[#1F6E58]/8 px-3 py-2">
                    <div className="font-bold text-[#1F6E58]">{clue.label}</div>
                    <div className="text-[#24112B]/70 leading-5">{clue.detail}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Terminal (stays dark for readability) */}
        <section className="min-h-[460px] lg:min-h-0 flex flex-col overflow-hidden rounded-3xl bg-[#18181B] text-zinc-300 shadow-[0_6px_24px_-12px_rgba(36,17,43,0.4)]">
          <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-white/10 text-xs">
            <span className="font-mono text-zinc-400">terminal</span>
            <span className="text-zinc-500">Tab to autocomplete | Up/Down history</span>
          </div>
          <div
            onClick={() => inputRef.current?.focus()}
            className="terminal-scroll flex-1 min-h-0 overflow-y-auto px-4 py-3 font-mono text-xs leading-5 cursor-text"
          >
            {session.terminalLines.map((line) => (
              <pre
                key={line.id}
                className={`whitespace-pre-wrap break-words mb-1 ${
                  line.type === "input"
                    ? "text-zinc-100"
                    : line.type === "system"
                    ? "text-zinc-500"
                    : line.type === "error"
                    ? "text-red-400"
                    : line.type === "success"
                    ? "text-emerald-300 border-l border-emerald-400/50 pl-2"
                    : "text-zinc-400"
                }`}
              >
                {line.text}
              </pre>
            ))}
            <div ref={terminalEndRef} />
          </div>
          {!isTerminal && (
            <div className="shrink-0 max-h-[34%] overflow-y-auto border-t border-white/10 px-2 py-2">
              <div className="px-2 pb-1 text-[11px] font-semibold text-zinc-500">
                Try a command
              </div>
              {rowsToShow.map((c) => (
                <button
                  key={c.command}
                  type="button"
                  onClick={() => handleRunCommand(c.command)}
                  className="w-full text-left rounded-xl px-2 py-1.5 hover:bg-white/5"
                >
                  <span className="block font-mono text-xs text-zinc-100">
                    $ {c.command}
                  </span>
                  <span className="block text-[11px] leading-4 text-zinc-500">
                    {c.description}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="shrink-0 h-11 flex items-center gap-2 px-4 border-t border-white/10 font-mono text-xs">
            <span className="text-emerald-400">$</span>
            <input
              ref={inputRef}
              type="text"
              onFocus={() => setLabStarted(true)}
              disabled={isTerminal}
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder={isTerminal ? "incident closed" : "type a command"}
              className="flex-1 bg-transparent text-zinc-100 caret-emerald-400 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
            />
          </div>
        </section>

        {/* Action rail */}
        <section className="min-h-0 flex flex-col gap-4 lg:overflow-y-auto">
          {session.mode === "guided" && scenario.concepts && (
            <div className={`${card} p-4`}>
              <button
                type="button"
                onClick={() => setConceptsOpen((o) => !o)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-sm font-extrabold">
                  Quick Concepts{" "}
                  <span className="font-medium text-[#24112B]/50">(1 min read)</span>
                </span>
                <span className="rounded-full bg-[#F3EEFF] px-2.5 py-0.5 text-[11px] font-bold">
                  {conceptsOpen ? "Hide" : "Show"}
                </span>
              </button>
              {conceptsOpen && (
                <div className="mt-3 space-y-2">
                  {scenario.concepts.map((c) => (
                    <div key={c.term} className="rounded-2xl bg-[#F3EEFF]/70 px-3 py-2">
                      <div className="text-xs font-bold">{c.term}</div>
                      <div className="text-xs leading-5 text-[#24112B]/75">{c.analogy}</div>
                    </div>
                  ))}
                  {!labStarted && (
                    <button
                      type="button"
                      onClick={() => {
                        setLabStarted(true);
                        setConceptsOpen(false);
                      }}
                      className="w-full rounded-full bg-[#24112B] px-4 py-2 text-xs font-bold text-white hover:bg-[#3a1c45]"
                    >
                      Got it, start lab
                    </button>
                  )}
                </div>
              )}
              {!labStarted && (
                <p className="mt-2 text-[11px] text-[#24112B]/50">
                  Timer is paused until you start the lab or use the terminal.
                </p>
              )}
            </div>
          )}<div className={`${card} p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={label}>Step {currentNode.stageIndex}</span>
              <button
                type="button"
                onClick={() => {
                  const next = !voiceMuted;
                  setVoiceMuted(next);
                  if (next) {
                    voiceController.stop();
                    setVoiceState("idle");
                  }
                }}
                title={voiceMuted ? "Unmute voice" : "Mute voice"}
                className="rounded-full bg-[#F3EEFF] p-1.5 hover:bg-[#E8DFFF]"
              >
                {voiceMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <h2 className="text-lg font-extrabold leading-snug">{currentNode.title}</h2>
            <p className="text-xs text-[#24112B]/60">{currentNode.subtitle}</p>
            {language === "en" && currentNode.plainBrief ? (
              <dl className="space-y-2 text-sm leading-6">
                {(
                  [
                    ["The situation", currentNode.plainBrief.situation],
                    ["The stakes", currentNode.plainBrief.stakes],
                    ["Your first step", currentNode.plainBrief.firstStep],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-bold uppercase tracking-wide text-[#24112B]/50">
                      {k}
                    </dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm leading-6">{currentNode.briefing[language]}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {voiceState === "idle" ? (
                <button
                  type="button"
                  disabled={voiceMuted}
                  onClick={() => playBriefing()}
                  title={voiceProviderNote}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#24112B] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#3a1c45] disabled:opacity-40"
                >
                  <Play className="h-3 w-3" /> Listen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    voiceController.stop();
                    setVoiceState("idle");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A36] px-4 py-1.5 text-xs font-bold text-white"
                >
                  <Square className="h-3 w-3" />
                  {voiceState === "loading" ? "Loading..." : "Stop"}
                </button>
              )}
              {session.mode === "guided" && !isTerminal && (
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="rounded-full bg-[#F3EEFF] px-4 py-1.5 text-xs font-bold hover:bg-[#E8DFFF]"
                >
                  {showHint ? "Hide hint" : "Need a hint?"}
                </button>
              )}
            </div>
            {session.mode === "guided" && !isTerminal && showHint && (
              <p className="rounded-2xl bg-[#3898EC]/10 px-3 py-2 text-xs leading-5">
                {currentNode.guidedHint}
              </p>
            )}
          </div>

          {!isTerminal ? (
            <div className={`${card} p-5 space-y-2`}>
              <h3 className="text-sm font-extrabold">Pick a fix</h3>
              {currentNode.choices.map((choice, i) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleDecision(choice.id)}
                  className="w-full text-left rounded-2xl bg-[#F6F5F9] px-4 py-3 hover:bg-[#F3EEFF] transition flex items-start gap-3"
                >
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#24112B] text-[11px] font-bold text-white flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-5">{choice.label}</span>
                    <span className="block text-xs leading-5 text-[#24112B]/65 mt-0.5">
                      {choice.impactSummary}
                    </span>
                    <span className="block font-mono text-[11px] text-[#24112B]/40 truncate mt-1">
                      $ {choice.commandEquivalent}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className={`${card} p-5 space-y-3`}>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                  currentNode.terminalNode?.status === "RESOLVED"
                    ? "bg-[#1F6E58]/12 text-[#1F6E58]"
                    : currentNode.terminalNode?.status === "DEGRADED"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-[#FF5A36]/15 text-[#C2381B]"
                }`}
              >
                {currentNode.terminalNode?.status === "RESOLVED"
                  ? "Fixed"
                  : currentNode.terminalNode?.status === "DEGRADED"
                  ? "Partly fixed"
                  : "Went badly"}
              </span>
              <h3 className="text-lg font-extrabold leading-snug">
                {currentNode.terminalNode?.headline}
              </h3>
              <p className="text-sm leading-6 text-[#24112B]/75">
                {currentNode.terminalNode?.summary}
              </p>
              <p className="rounded-2xl bg-[#F3EEFF] px-4 py-3 text-sm leading-6">
                <span className="font-bold">Takeaway: </span>
                {currentNode.terminalNode?.postmortemKeyTakeaway}
              </p>
              {evalError && (
                <p className="rounded-2xl bg-[#FF5A36]/10 px-3 py-2 text-xs text-[#C2381B]">
                  {evalError}
                </p>
              )}
              <button
                type="button"
                disabled={evaluating}
                onClick={handleGenerateScorecard}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#24112B] px-5 py-3 text-sm font-bold text-white hover:bg-[#3a1c45] disabled:opacity-60"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Building your result...
                  </>
                ) : (
                  <>
                    See my result <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

