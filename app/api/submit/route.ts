import { NextResponse } from "next/server";
import { crossword, quiz, treasure } from "@/lib/examContent";
import { QUIZ_ANSWERS, CROSSWORD_ANSWERS, TREASURE_ANSWERS, GOLD_WORD, MARKS } from "@/lib/answerKey";
import { insertSubmission } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function norm(s: unknown) {
  return String(s ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

const MAX = {
  quiz: QUIZ_ANSWERS.length * MARKS.quizEach,
  xw: Object.keys(CROSSWORD_ANSWERS).length * MARKS.xwEach,
  th: TREASURE_ANSWERS.length * MARKS.treasureEach,
};

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim().slice(0, 120);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 160);
  const roll = String(body?.roll ?? "").trim().slice(0, 60);
  if (name.length < 2 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A name and a valid email are required." }, { status: 400 });
  }

  // ---- Sanitise raw answers ----
  const quizSel: number[] = quiz.map((q, i) => {
    const v = Number(body?.quizSelections?.[i]);
    return Number.isInteger(v) && v >= 0 && v < q.opts.length ? v : -1;
  });
  const cellsIn = body?.xwCells && typeof body.xwCells === "object" ? body.xwCells : {};
  const xwCells: Record<string, string> = {};
  for (let r = 0; r < crossword.rows; r++)
    for (let c = 0; c < crossword.cols; c++)
      if (crossword.cells[r][c]) {
        const v = norm(cellsIn[`${r}-${c}`]).slice(0, 1);
        if (v) xwCells[`${r}-${c}`] = v;
      }
  const tAns: string[] = treasure.map((_, i) => norm(body?.treasureAnswers?.[i]).slice(0, 20));
  const gold = norm(body?.goldAnswer).slice(0, 12);
  const timing: Record<string, number | null> = {};
  for (const r of ["quiz", "xw", "th"]) {
    const v = Number(body?.timing?.[r]);
    timing[r] = Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), 3600) : null;
  }

  // ---- Grade ----
  let quizScore = 0;
  QUIZ_ANSWERS.forEach((correct, i) => { if (quizSel[i] === correct) quizScore += MARKS.quizEach; });

  let xwScore = 0;
  const entries = [
    ...crossword.across.map((e) => ({ ...e, dir: "A" as const })),
    ...crossword.down.map((e) => ({ ...e, dir: "D" as const })),
  ];
  const xwWords: Record<string, string> = {};
  for (const e of entries) {
    const dr = e.dir === "A" ? 0 : 1;
    const dc = e.dir === "A" ? 1 : 0;
    let word = "";
    for (let k = 0; k < e.len; k++) word += xwCells[`${e.r + k * dr}-${e.c + k * dc}`] || "_";
    const key = `${e.r}-${e.c}-${e.dir}`;
    xwWords[`${e.n}${e.dir === "A" ? " Across" : " Down"}`] = word;
    if (word === CROSSWORD_ANSWERS[key]) xwScore += MARKS.xwEach;
  }

  let thScore = 0;
  TREASURE_ANSWERS.forEach((correct, i) => { if (tAns[i] === correct) thScore += MARKS.treasureEach; });
  const bonus = gold === GOLD_WORD ? MARKS.bonus : 0;
  const total = quizScore + xwScore + thScore;

  try {
    const { row, existed } = await insertSubmission({
      name, email, roll,
      quiz_score: quizScore, xw_score: xwScore, th_score: thScore, bonus, total,
      raw_answers: { quiz: quizSel, crossword: xwWords, treasure: tAns, bonusWord: gold },
      timing,
    });
    return NextResponse.json({
      quizScore: Number(row.quiz_score), quizMax: MAX.quiz,
      xwScore: Number(row.xw_score), xwMax: MAX.xw,
      thScore: Number(row.th_score), thMax: MAX.th,
      bonus: Number(row.bonus), total: Number(row.total),
      alreadySubmitted: existed,
    });
  } catch (err) {
    console.error("submit failed", err);
    return NextResponse.json({ error: "Could not save your submission. Please tell the invigilator." }, { status: 500 });
  }
}
