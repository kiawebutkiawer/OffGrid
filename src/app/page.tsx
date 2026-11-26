"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, Flame, Trophy } from "lucide-react";
import {
  LANGUAGE_META,
  SCENARIO_LIST,
  type LanguageCode,
  type SimulationMode,
} from "@/data/scenarios";
import { CASE_STUDIES } from "@/data/realWorld";

const MODES: {
  id: SimulationMode;
  title: string;
  tag: string;
  blurb: string;
  points: string[];
  cta: string;
  icon: typeof Compass;
}[] = [
  {
    id: "guided",
    title: "Guided",
    tag: "Beginner friendly",
    blurb: "A calm walkthrough with hints and one-click commands.",
    points: [
      "Hints explain what to check next",
      "Click a command or type it yourself",
      "No countdown, take your time",
    ],
    cta: "Start guided",
    icon: Compass,
  },
  {
    id: "crisis",
    title: "Live crisis",
    tag: "Under pressure",
    blurb: "A real on-call feel with a timer and money on the line.",
    points: [
      "Countdown for every stage",
      "No hints, only logs and your instincts",
      "Small score bonus for staying calm",
    ],
    cta: "Start crisis",
    icon: Flame,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<SimulationMode>("guided");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    SCENARIO_LIST[0].id
  );
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [candidateName, setCandidateName] = useState<string>("");

  const handleLaunch = (overrideMode?: SimulationMode) => {
    const modeToUse = overrideMode ?? selectedMode;
    const params = new URLSearchParams({
      scenario: selectedScenarioId,
      mode: modeToUse,
      lang: language,
    });
    if (candidateName.trim()) {
      params.set("handle", candidateName.trim());
    }
    router.push(`/sim?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3EEFF] text-[#24112B]">
      <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          offgrid
        </Link>
        <Link
          href="/replay"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:shadow transition"
        >
          <Trophy className="h-4 w-4" />
          See a sample result
        </Link>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 pb-16 space-y-16">
        <section className="grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center pt-6">
          <div className="relative">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Practice real tech fixes before your first job
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#24112B]/70">
              Step into a made-up outage, read the logs, type real commands and
              choose how to fix it. A voice mentor explains each step in English,
              Hindi or Kannada.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-[#FF5A36] px-5 py-2.5 text-sm font-bold text-white -rotate-2 shadow-sm">
                Payment Drops
              </span>
              <span className="rounded-full bg-[#3898EC] px-5 py-2.5 text-sm font-bold text-white rotate-1 shadow-sm">
                Login Outages
              </span>
              <span className="rounded-full bg-[#1F6E58] px-5 py-2.5 text-sm font-bold text-white -rotate-1 shadow-sm">
                Voice Mentor
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-[0_10px_40px_-12px_rgba(36,17,43,0.18)] space-y-6">
            <div>
              <h2 className="text-xl font-extrabold">Set up your practice</h2>
              <p className="text-sm text-[#24112B]/60 mt-1">
                Pick a scenario and language, then jump in.
              </p>
            </div>

            <div>
              <label
                htmlFor="candidate-handle"
                className="block text-sm font-semibold mb-2"
              >
                Your name
              </label>
              <input
                id="candidate-handle"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Shown on your result page"
                className="w-full rounded-full border border-[#24112B]/15 bg-[#F3EEFF]/50 px-5 py-3 text-sm placeholder:text-[#24112B]/40 focus:border-[#24112B] focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-sm font-semibold mb-2">Scenario</span>
              <div className="space-y-2">
                {SCENARIO_LIST.map((sc) => {
                  const active = sc.id === selectedScenarioId;
                  const hard = sc.difficulty === "P0 Catastrophic";
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition ${
                        active
                          ? "border-[#24112B] bg-[#F3EEFF]"
                          : "border-transparent bg-[#F3EEFF]/50 hover:bg-[#F3EEFF]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{sc.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            hard
                              ? "bg-[#FF5A36]/15 text-[#C2381B]"
                              : "bg-[#3898EC]/15 text-[#1E6DB3]"
                          }`}
                        >
                          {hard ? "Hard" : "Medium"}
                        </span>
                      </div>
                      <p className="text-xs text-[#24112B]/60 mt-1">
                        {sc.companyContext} · about {sc.estimatedMinutes} min
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold mb-2">
                Mentor language
              </span>
              <div className="flex gap-2">
                {(Object.keys(LANGUAGE_META) as LanguageCode[]).map((code) => {
                  const active = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-[#24112B] text-white"
                          : "bg-[#F3EEFF] text-[#24112B] hover:bg-[#E8DFFF]"
                      }`}
                    >
                      {LANGUAGE_META[code].nativeLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLaunch()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#24112B] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#3a1c45] transition"
            >
              {selectedMode === "crisis" ? "Start live crisis" : "Start guided practice"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold">How do you want to practise?</h2>
            <p className="text-sm text-[#24112B]/60 mt-1">
              Tap a card to choose, or start straight from it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {MODES.map((m) => {
              const active = selectedMode === m.id;
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMode(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedMode(m.id);
                  }}
                  className={`cursor-pointer rounded-3xl bg-white p-6 transition shadow-[0_6px_24px_-10px_rgba(36,17,43,0.15)] border-2 ${
                    active ? "border-[#24112B]" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center text-white ${
                        m.id === "guided" ? "bg-[#1F6E58]" : "bg-[#FF5A36]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold">{m.title}</h3>
                      <span className="inline-block rounded-full bg-[#F3EEFF] px-2.5 py-0.5 text-xs font-semibold">
                        {m.tag}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-[#24112B]/70">{m.blurb}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-[#24112B]/80">
                    {m.points.map((pt) => (
                      <li key={pt}>• {pt}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunch(m.id);
                    }}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#24112B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3a1c45] transition"
                  >
                    {m.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Why this matters in real life</h2>
              <p className="text-sm text-[#24112B]/60 mt-1">
                Outages like these happen in payments, login systems and trading platforms.
              </p>
            </div>
            <Link
              href="/replay"
              className="inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4"
            >
              See a sample result <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {CASE_STUDIES.map((cs) => (
              <div
                key={cs.id}
                className="rounded-3xl bg-white p-5 shadow-[0_6px_24px_-10px_rgba(36,17,43,0.15)]"
              >
                <span className="rounded-full bg-[#F3EEFF] px-3 py-1 text-xs font-bold">
                  {cs.field}
                </span>
                <h3 className="mt-3 text-base font-extrabold">{cs.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#24112B]/70">{cs.pattern}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
