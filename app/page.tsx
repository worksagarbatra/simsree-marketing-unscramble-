"use client";

import { useEffect, useState } from "react";

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
};

const TABS = ["start", "quiz", "xw", "th", "done"] as const;
type Tab = typeof TABS[number];

// Sagar's design system: Signal Orange, Ink Primary, Field Base.
// Law: never white text directly on Signal Orange — use onSignal instead.
const T = {
  signal: "#E85002",
  ink: "#16181A",
  field: "#FAFAF7",
  onSignal: "#0E0F10",
  line: "#E4E0D6",
  cardBg: "#FFFFFF",
  muted: "#6B6F73",
  headFont: "'Space Grotesk', sans-serif",
  bodyFont: "'Inter', sans-serif",
  monoFont: "'Space Mono', monospace",
};

export default function Page() {
  const [data, setData] = useState<ExamData | null>(null);
  const [tab, setTab] = useState<Tab>("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roll, setRoll] = useState("");
  const [quizSel, setQuizSel] = useState<Record<number, number>>({});
  const [xwCells, setXwCells] = useState<Record<string, string>>({});
  const [treasureAns, setTreasureAns] = useState<Record<number, string>>({});
  const [goldAns, setGoldAns] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exam-data").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ padding: 40, fontFamily: T.monoFont, background: T.field, color: T.ink, minHeight: "100vh" }}>
        Loading exam…
      </div>
    );
  }

  const entries = [
    ...data.crossword.across.map((e) => ({ ...e, dir: "A" as const })),
    ...data.crossword.down.map((e) => ({ ...e, dir: "D" as const })),
  ];

  const numberMap: Record<string, number> = {};
  entries.forEach((e) => (numberMap[`${e.r}-${e.c}`] = e.n));

  async function submitExam() {
    if (!name || !email) {
      setError("Please enter your name and email before submitting.");
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
          name, email, roll,
          quizSelections: data.quiz.map((_, i) => quizSel[i] ?? -1),
          xwCells,
          treasureAnswers: data.treasure.map((_, i) => treasureAns[i] ?? ""),
          goldAnswer: goldAns,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed.");
      }
      const j: Result = await res.json();
      setResult(j);
      setTab("done");
    } catch (e: any) {
      setError(e.message || "Something went wrong submitting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ fontFamily: T.bodyFont, background: T.field, color: T.ink, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px 80px" }}>
        <header style={{ borderBottom: `4px solid ${T.ink}`, paddingBottom: 14, marginBottom: 18 }}>
          <h1 style={{ fontFamily: T.headFont, fontWeight: 700, fontSize: "1.6rem", margin: "0 0 4px", color: T.ink }}>
            The Marketing Unscramble
          </h1>
          <div style={{ fontSize: ".85rem", color: T.signal, fontFamily: T.monoFont, fontWeight: 700 }}>
            Internal Assessment · 20 Marks · Quiz + Crossword + Treasure Hunt · SIMSREE Digital Marketing Elective
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Roll / Team code" value={roll} onChange={(e) => setRoll(e.target.value)} style={inputStyle} />
          </div>
          {error && <p style={{ color: T.signal, fontSize: ".85rem", fontFamily: T.monoFont }}>{error}</p>}
        </header>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "18px 0" }}>
          {(["start", "quiz", "xw", "th", "done"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
              {label(t)}
            </button>
          ))}
        </div>

        {tab === "start" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Before you unscramble anything</h2>
            <p style={pStyle}>Three rounds, 20 marks total — enter your name and email above, then work through each round. Submit once, at the end, from the Final Score tab.</p>
            <ul style={{ ...pStyle, paddingLeft: 20 }}>
              <li><b>Round 1 — Quiz (6 marks).</b> Six scenario questions, one correct option each.</li>
              <li><b>Round 2 — Crossword (8 marks).</b> Eight terms from six lectures.</li>
              <li><b>Round 3 — Treasure Hunt (6 marks).</b> Four scrambled terms; the underlined letters spell a bonus fifth word.</li>
            </ul>
            <button onClick={() => setTab("quiz")} style={btnStyle}>Begin Round 1 →</button>
          </div>
        )}

        {tab === "quiz" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Round 1 — Quiz <span style={marksStyle}>6 marks</span></h2>
            {data.quiz.map((q, qi) => (
              <div key={qi} style={qBlockStyle}>
                <div style={{ ...pStyle, fontWeight: 500, marginBottom: 8 }}>{qi + 1}. {q.q}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {q.opts.map((o, oi) => (
                    <label key={oi} style={optStyle(quizSel[qi] === oi)}>
                      <input
                        type="radio"
                        name={`q${qi}`}
                        checked={quizSel[qi] === oi}
                        onChange={() => setQuizSel({ ...quizSel, [qi]: oi })}
                        style={{ accentColor: T.signal }}
                      />{" "}
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setTab("xw")} style={btnStyle}>Next: Crossword →</button>
          </div>
        )}

        {tab === "xw" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Round 2 — Crossword <span style={marksStyle}>8 marks</span></h2>
            <p style={noteStyle}>Fill the grid using the clues below. Overlapping letters must agree.</p>
            <div style={{ overflowX: "auto", margin: "14px 0" }}>
              <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
                <tbody>
                  {Array.from({ length: data.crossword.rows }).map((_, r) => (
                    <tr key={r}>
                      {Array.from({ length: data.crossword.cols }).map((_, c) => {
                        const active = data.crossword.cells[r][c] === 1;
                        const num = numberMap[`${r}-${c}`];
                        return (
                          <td key={c} style={{ width: 34, height: 34, position: "relative", border: active ? `1.3px solid ${T.ink}` : "none" }}>
                            {active && (
                              <>
                                {num && <span style={{ position: "absolute", top: 1, left: 2, fontSize: ".55rem", color: T.muted, fontFamily: T.monoFont }}>{num}</span>}
                                <input
                                  maxLength={1}
                                  value={xwCells[`${r}-${c}`] || ""}
                                  onChange={(e) =>
                                    setXwCells({ ...xwCells, [`${r}-${c}`]: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })
                                  }
                                  style={{ width: "100%", height: "100%", border: "none", textAlign: "center", fontFamily: T.monoFont, fontWeight: 700, background: "#FBF9F4", color: T.ink }}
                                />
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div>
                <h3 style={clueHeadStyle}>Across</h3>
                <ol style={{ paddingLeft: 20, fontSize: ".86rem", fontFamily: T.bodyFont, color: T.ink }}>
                  {data.crossword.across.map((e) => <li key={e.n}>{e.n}. {e.clue}</li>)}
                </ol>
              </div>
              <div>
                <h3 style={clueHeadStyle}>Down</h3>
                <ol style={{ paddingLeft: 20, fontSize: ".86rem", fontFamily: T.bodyFont, color: T.ink }}>
                  {data.crossword.down.map((e) => <li key={e.n}>{e.n}. {e.clue}</li>)}
                </ol>
              </div>
            </div>
            <button onClick={() => setTab("th")} style={btnStyle}>Next: Treasure Hunt →</button>
          </div>
        )}

        {tab === "th" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Round 3 — Treasure Hunt <span style={marksStyle}>6 marks</span></h2>
            <p style={noteStyle}>Each term is scrambled, with one letter underlined. Unscramble all four, then read the underlined letters in order for a bonus word.</p>
            {data.treasure.map((t, i) => (
              <div key={i} style={qBlockStyle}>
                <div style={{ fontFamily: T.monoFont, fontSize: "1.3rem", letterSpacing: 4, fontWeight: 700, color: T.signal }}>
                  <u>{t.scrambled[0]}</u>{t.scrambled.slice(1)}
                </div>
                <div style={{ ...pStyle, fontSize: ".88rem", color: T.muted, margin: "6px 0 10px" }}>{t.hint}</div>
                <input
                  placeholder="Type the unscrambled word"
                  value={treasureAns[i] || ""}
                  onChange={(e) => setTreasureAns({ ...treasureAns, [i]: e.target.value })}
                  style={{ ...inputStyle, width: "100%", textTransform: "uppercase" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0" }}>
              <span style={{ ...pStyle, fontWeight: 500 }}>Bonus word:</span>
              <input
                value={goldAns}
                onChange={(e) => setGoldAns(e.target.value)}
                maxLength={8}
                style={{ ...inputStyle, width: 120, textTransform: "uppercase", borderColor: T.signal }}
              />
            </div>
            <button onClick={() => setTab("done")} style={btnStyle}>Next: Final Score →</button>
          </div>
        )}

        {tab === "done" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Final Score</h2>
            {!result && (
              <>
                <p style={pStyle}>Double-check your name and email at the top, then submit once.</p>
                <button onClick={submitExam} disabled={submitting} style={btnStyle}>
                  {submitting ? "Submitting…" : "Submit Final Exam"}
                </button>
              </>
            )}
            {result && (
              <>
                <p style={{ fontFamily: T.monoFont, fontSize: ".9rem", lineHeight: 1.8, color: T.ink }}>
                  Round 1 — Quiz: {result.quizScore} / {result.quizMax}<br />
                  Round 2 — Crossword: {result.xwScore} / {result.xwMax}<br />
                  Round 3 — Treasure Hunt: {result.thScore} / {result.thMax}
                </p>
                <p style={{ fontFamily: T.headFont, fontSize: "1.4rem", fontWeight: 700, color: T.ink }}>
                  Total: <span style={{ color: T.signal }}>{result.total}</span> / 20{" "}
                  {result.bonus > 0 && <span style={{ fontSize: ".9rem", color: T.muted, fontFamily: T.monoFont }}>+ {result.bonus} bonus</span>}
                </p>
                <p style={noteStyle}>Your submission has been recorded. No further action needed.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function label(t: Tab) {
  return { start: "Start", quiz: "Round 1 · Quiz", xw: "Round 2 · Crossword", th: "Round 3 · Treasure Hunt", done: "Final Score" }[t];
}

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 140, padding: "10px 12px", border: `1.5px solid ${T.ink}`, background: T.cardBg,
  fontFamily: T.monoFont, fontSize: ".9rem", borderRadius: 3, color: T.ink,
};
const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "9px 16px", border: `1.5px solid ${active ? T.signal : T.ink}`,
  background: active ? T.signal : T.cardBg, color: active ? T.onSignal : T.ink,
  cursor: "pointer", fontSize: ".85rem", fontFamily: T.monoFont, fontWeight: active ? 700 : 400, borderRadius: 3,
});
const cardStyle: React.CSSProperties = { background: T.cardBg, border: `1.5px solid ${T.line}`, borderRadius: 8, padding: 20, marginBottom: 14 };
const h2Style: React.CSSProperties = { fontFamily: T.headFont, fontWeight: 600, fontSize: "1.15rem", color: T.ink, margin: "0 0 10px" };
const pStyle: React.CSSProperties = { fontFamily: T.bodyFont, fontSize: ".95rem", color: T.ink, lineHeight: 1.5 };
const qBlockStyle: React.CSSProperties = { marginBottom: 20, paddingBottom: 16, borderBottom: `1px dashed ${T.line}` };
const optStyle = (sel: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
  border: `1.3px solid ${sel ? T.signal : T.line}`, borderRadius: 4, cursor: "pointer",
  fontFamily: T.bodyFont, fontSize: ".92rem", background: sel ? "#FDEFE7" : "#FBF9F4",
  fontWeight: sel ? 600 : 400, color: T.ink,
});
// Signal Orange fill + onSignal text: the design system's "never white on orange" rule.
const btnStyle: React.CSSProperties = {
  padding: "10px 18px", border: `1.5px solid ${T.signal}`, background: T.signal, color: T.onSignal,
  cursor: "pointer", fontFamily: T.monoFont, fontWeight: 700, fontSize: ".85rem", borderRadius: 4, marginTop: 8,
};
const marksStyle: React.CSSProperties = { fontFamily: T.monoFont, fontSize: ".8rem", color: T.signal, marginLeft: 10, fontWeight: 700 };
const noteStyle: React.CSSProperties = { fontFamily: T.bodyFont, fontSize: ".82rem", color: T.muted, fontStyle: "italic" };
const clueHeadStyle: React.CSSProperties = { fontFamily: T.monoFont, fontSize: ".85rem", color: T.ink, borderBottom: `1.3px solid ${T.ink}`, paddingBottom: 4 };
