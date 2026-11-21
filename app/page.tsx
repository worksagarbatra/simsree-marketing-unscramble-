"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CrosswordEntry = { n: number; r: number; c: number; len: number; clue: string };
type Crossword = { rows: number; cols: number; cells: number[][]; across: CrosswordEntry[]; down: CrosswordEntry[] };
type Treasure = { scrambled: string; len: number; hint: string };
type Quiz = { q: string; opts: string[] };
type ExamData = { crossword: Crossword; treasure: Treasure[]; quiz: Quiz[] };

type Result = {
  quizScore: number; quizMax: number;
  xwScore: number; xwMax: number;
  thScore: number; thMax: number;
  bonus: number; total: number;
  alreadySubmitted?: boolean;
};

type Tab = "start" | "quiz" | "xw" | "th" | "done";
type Round = "quiz" | "xw" | "th";

const ROUNDS: Round[] = ["quiz", "xw", "th"];
// Round durations in seconds: quiz 10 min, crossword 15 min, treasure hunt 15 min.
const DUR: Record<Round, number> = { quiz: 600, xw: 900, th: 900 };
const ROUND_NAME: Record<Round, string> = { quiz: "Round 1 · Quiz", xw: "Round 2 · Crossword", th: "Round 3 · Treasure Hunt" };
const STORE_KEY = "unscramble-exam-v2";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Saved = {
  name: string; email: string; roll: string;
  quizSel: Record<number, number>;
  xwCells: Record<string, string>;
  treasureAns: Record<number, string>;
  goldAns: string;
  startedAt: Record<Round, number | null>;
  result: Result | null;
  tab: Tab;
};

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Page() {
  const [data, setData] = useState<ExamData | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roll, setRoll] = useState("");
  const [quizSel, setQuizSel] = useState<Record<number, number>>({});
  const [xwCells, setXwCells] = useState<Record<string, string>>({});
  const [treasureAns, setTreasureAns] = useState<Record<number, string>>({});
  const [goldAns, setGoldAns] = useState("");
  const [startedAt, setStartedAt] = useState<Record<Round, number | null>>({ quiz: null, xw: null, th: null });
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const autoSubmitted = useRef(false);

  // Load exam content
  useEffect(() => {
    fetch("/api/exam-data")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setLoadErr("Could not load the exam. Check your connection and refresh."));
  }, []);

  // Restore progress (mobile browsers often reload a tab after you switch apps)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s: Saved = JSON.parse(raw);
        setName(s.name || ""); setEmail(s.email || ""); setRoll(s.roll || "");
        setQuizSel(s.quizSel || {}); setXwCells(s.xwCells || {});
        setTreasureAns(s.treasureAns || {}); setGoldAns(s.goldAns || "");
        setStartedAt(s.startedAt || { quiz: null, xw: null, th: null });
        setResult(s.result || null);
        setTab(s.tab || "start");
      }
    } catch {}
    setReady(true);
  }, []);

  // Persist progress
  useEffect(() => {
    if (!ready) return;
    try {
      const s: Saved = { name, email, roll, quizSel, xwCells, treasureAns, goldAns, startedAt, result, tab };
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {}
  }, [ready, name, email, roll, quizSel, xwCells, treasureAns, goldAns, startedAt, result, tab]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Start a round's clock the first time it's opened
  useEffect(() => {
    if (!ready || result) return;
    if (tab === "quiz" || tab === "xw" || tab === "th") {
      setStartedAt((prev) => (prev[tab] ? prev : { ...prev, [tab]: Date.now() }));
    }
  }, [tab, ready, result]);

  const remaining = useCallback(
    (r: Round) => {
      const st = startedAt[r];
      if (!st) return DUR[r] * 1000;
      return Math.max(0, DUR[r] * 1000 - (now - st));
    },
    [startedAt, now]
  );
  const isLocked = (r: Round) => !!result || (!!startedAt[r] && remaining(r) === 0);
  const identityOk = name.trim().length > 1 && EMAIL_RE.test(email.trim());

  const submitExam = useCallback(async () => {
    if (!data || submitting || result) return;
    if (!identityOk) {
      setError("Enter your name and a valid email before submitting.");
      setTab("start");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim().toLowerCase(), roll: roll.trim(),
          quizSelections: data.quiz.map((_, i) => quizSel[i] ?? -1),
          xwCells,
          treasureAnswers: data.treasure.map((_, i) => treasureAns[i] ?? ""),
          goldAnswer: goldAns,
          timing: ROUNDS.reduce((acc, r) => {
            const st = startedAt[r];
            acc[r] = st ? Math.min(DUR[r], Math.round((Date.now() - st) / 1000)) : null;
            return acc;
          }, {} as Record<Round, number | null>),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Submission failed. Please try again.");
      setResult(j as Result);
      setTab("done");
    } catch (e: any) {
      setError(e.message || "Something went wrong submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [data, submitting, result, identityOk, name, email, roll, quizSel, xwCells, treasureAns, goldAns, startedAt]);

  // When every round's clock has run out, submit automatically
  useEffect(() => {
    if (!data || result || autoSubmitted.current) return;
    const allDone = ROUNDS.every((r) => startedAt[r] && remaining(r) === 0);
    if (allDone && identityOk) {
      autoSubmitted.current = true;
      setTab("done");
      submitExam();
    }
  }, [data, result, startedAt, remaining, identityOk, submitExam]);

  function goTo(t: Tab) {
    if (t !== "start" && t !== "done" && !identityOk) {
      setError("Enter your name and a valid email first.");
      setTab("start");
      return;
    }
    setError("");
    setTab(t);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function onCell(r: number, c: number, v: string) {
    if (!data) return;
    const letter = v.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    setXwCells((prev) => ({ ...prev, [`${r}-${c}`]: letter }));
    if (!letter) return;
    const cells = data.crossword.cells;
    const next =
      c + 1 < data.crossword.cols && cells[r][c + 1] ? `xw-${r}-${c + 1}` :
      r + 1 < data.crossword.rows && cells[r + 1][c] ? `xw-${r + 1}-${c}` : null;
    if (next) (document.getElementById(next) as HTMLInputElement | null)?.focus();
  }

  if (loadErr) return <div className="wrap"><p className="err">{loadErr}</p></div>;
  if (!data || !ready) return <div className="wrap" style={{ fontFamily: "var(--mono)" }}>Loading exam…</div>;

  const numberMap: Record<string, number> = {};
  [...data.crossword.across, ...data.crossword.down].forEach((e) => (numberMap[`${e.r}-${e.c}`] = e.n));

  const activeRound: Round | null = tab === "quiz" || tab === "xw" || tab === "th" ? tab : null;
  const rem = activeRound ? remaining(activeRound) : 0;
  const pct = activeRound ? (rem / (DUR[activeRound] * 1000)) * 100 : 0;
  const timerCls = activeRound ? (rem === 0 ? "timer done" : rem <= 60000 ? "timer low" : "timer") : "";

  return (
    <div className="wrap">
      <header className="hdr">
        <h1>The Marketing Unscramble</h1>
        <div className="sub">Internal Assessment · 20 Marks · SIMSREE Digital Marketing</div>
        <div className="ids">
          <input className="inp" placeholder="Full name" autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)} disabled={!!result} />
          <input className="inp" placeholder="Email" type="email" inputMode="email" autoComplete="email"
            autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!result} />
          <input className="inp" placeholder="Roll / Team code" value={roll}
            onChange={(e) => setRoll(e.target.value)} disabled={!!result} />
        </div>
        {error && <p className="err">{error}</p>}
      </header>

      <nav className="tabs" aria-label="Exam rounds">
        {(["start", "quiz", "xw", "th", "done"] as Tab[]).map((t) => {
          const r = t as Round;
          const suffix = ROUNDS.includes(r) && startedAt[r] && !result ? ` · ${fmt(remaining(r))}` : "";
          return (
            <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => goTo(t)}>
              {t === "start" ? "Start" : t === "done" ? "Submit" : ROUND_NAME[r]}{suffix}
            </button>
          );
        })}
      </nav>

      {activeRound && !result && (
        <div className={timerCls} role="timer" aria-live="off">
          <span className="lbl">{rem === 0 ? `${ROUND_NAME[activeRound]} — time's up` : `${ROUND_NAME[activeRound]} — time left`}</span>
          <span className="clock">{fmt(rem)}</span>
          <span className="bar" style={{ width: `${pct}%` }} />
        </div>
      )}

      {tab === "start" && (
        <section className="card">
          <h2>Before you unscramble anything</h2>
          <p>Three timed rounds, 20 marks in total. Fill in your name and email above to begin.</p>
          <ul className="rules">
            <li><b>Round 1 — Quiz</b> · 6 marks · <b>10 minutes</b></li>
            <li><b>Round 2 — Crossword</b> · 8 marks · <b>15 minutes</b></li>
            <li><b>Round 3 — Treasure Hunt</b> · 6 marks + 1 bonus · <b>15 minutes</b></li>
          </ul>
          <p className="note">Each round's clock starts the first time you open it and keeps running even if you switch rounds. When it hits zero, that round locks. Your answers are saved on this device as you go, so a refresh won't lose them. You can submit only once.</p>
          <button className="btn" onClick={() => goTo("quiz")} disabled={!identityOk}>
            {identityOk ? "Begin Round 1 →" : "Enter name + email to begin"}
          </button>
        </section>
      )}

      {tab === "quiz" && (
        <section className="card">
          <h2>Round 1 — Quiz <span className="marks">6 marks</span></h2>
          {isLocked("quiz") && !result && <p className="locked-note">Time's up — Round 1 is locked. Your selected answers are kept.</p>}
          {data.quiz.map((q, qi) => (
            <div key={qi} className="qb">
              <div className="qt">{qi + 1}. {q.q}</div>
              <div className="opts">
                {q.opts.map((o, oi) => {
                  const sel = quizSel[qi] === oi;
                  const dis = isLocked("quiz");
                  return (
                    <label key={oi} className={`opt${sel ? " sel" : ""}${dis ? " dis" : ""}`}>
                      <input type="radio" name={`q${qi}`} checked={sel} disabled={dis}
                        onChange={() => setQuizSel((p) => ({ ...p, [qi]: oi }))} />
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <button className="btn" onClick={() => goTo("xw")}>Next: Crossword →</button>
        </section>
      )}

      {tab === "xw" && (
        <section className="card">
          <h2>Round 2 — Crossword <span className="marks">8 marks</span></h2>
          {isLocked("xw") && !result && <p className="locked-note">Time's up — Round 2 is locked. Your filled letters are kept.</p>}
          <p className="note">Tap a square and type. Overlapping letters must agree.</p>
          <div className="xw-wrap">
            <table className="xw">
              <tbody>
                {Array.from({ length: data.crossword.rows }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: data.crossword.cols }).map((_, c) => {
                      const active = data.crossword.cells[r][c] === 1;
                      const num = numberMap[`${r}-${c}`];
                      return (
                        <td key={c} className={active ? "a" : ""}>
                          {active && (
                            <>
                              {num && <span className="n">{num}</span>}
                              <input id={`xw-${r}-${c}`} maxLength={2} autoComplete="off" autoCorrect="off"
                                autoCapitalize="characters" spellCheck={false} aria-label={`Row ${r + 1} column ${c + 1}`}
                                value={xwCells[`${r}-${c}`] || ""} disabled={isLocked("xw")}
                                onChange={(e) => onCell(r, c, e.target.value)} />
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="clues">
            <div>
              <h3>Across</h3>
              <ol>{data.crossword.across.map((e) => <li key={e.n}><b>{e.n}.</b> {e.clue}</li>)}</ol>
            </div>
            <div>
              <h3>Down</h3>
              <ol>{data.crossword.down.map((e) => <li key={e.n}><b>{e.n}.</b> {e.clue}</li>)}</ol>
            </div>
          </div>
          <button className="btn" onClick={() => goTo("th")}>Next: Treasure Hunt →</button>
        </section>
      )}

      {tab === "th" && (
        <section className="card">
          <h2>Round 3 — Treasure Hunt <span className="marks">6 marks</span></h2>
          {isLocked("th") && !result && <p className="locked-note">Time's up — Round 3 is locked. Your answers are kept.</p>}
          <p className="note">Unscramble each term. Then read the underlined letters, in order, for a bonus word.</p>
          {data.treasure.map((t, i) => (
            <div key={i} className="qb">
              <div className="scr"><u>{t.scrambled[0]}</u>{t.scrambled.slice(1)}</div>
              <div className="hint">{t.hint} <span style={{ fontFamily: "var(--mono)" }}>({t.len})</span></div>
              <input className="inp up" placeholder="Unscrambled word" autoComplete="off" autoCorrect="off"
                autoCapitalize="characters" spellCheck={false} value={treasureAns[i] || ""} disabled={isLocked("th")}
                onChange={(e) => setTreasureAns((p) => ({ ...p, [i]: e.target.value }))} />
            </div>
          ))}
          <div className="bonus">
            <span style={{ fontWeight: 500 }}>Bonus word:</span>
            <input className="inp up" value={goldAns} maxLength={8} autoComplete="off" autoCorrect="off"
              autoCapitalize="characters" spellCheck={false} disabled={isLocked("th")}
              onChange={(e) => setGoldAns(e.target.value)} />
          </div>
          <button className="btn" onClick={() => goTo("done")}>Next: Submit →</button>
        </section>
      )}

      {tab === "done" && (
        <section className="card">
          <h2>{result ? "Your score" : "Submit your exam"}</h2>
          {!result && (
            <>
              <p className="score-lines">
                {ROUNDS.map((r) => (
                  <span key={r}>
                    {ROUND_NAME[r]}: {startedAt[r] ? (isLocked(r) ? "time's up" : `${fmt(remaining(r))} left`) : "not opened"}<br />
                  </span>
                ))}
              </p>
              <p>Check your name and email at the top. You can submit only once.</p>
              <button className="btn" onClick={submitExam} disabled={submitting || !identityOk}>
                {submitting ? "Submitting…" : "Submit final exam"}
              </button>
            </>
          )}
          {result && (
            <>
              {result.alreadySubmitted && <p className="note">You had already submitted. This is your recorded score.</p>}
              <p className="score-lines">
                Round 1 — Quiz: {result.quizScore} / {result.quizMax}<br />
                Round 2 — Crossword: {result.xwScore} / {result.xwMax}<br />
                Round 3 — Treasure Hunt: {result.thScore} / {result.thMax}
              </p>
              <p className="total">
                Total: <b>{result.total}</b> / 20{" "}
                {result.bonus > 0 && <span style={{ fontSize: ".9rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>+ {result.bonus} bonus</span>}
              </p>
              <p className="note">Recorded. No further action needed.</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
