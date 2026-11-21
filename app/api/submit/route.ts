import { NextResponse } from "next/server";
import { crossword } from "@/lib/examContent";
import { QUIZ_ANSWERS, CROSSWORD_ANSWERS, TREASURE_ANSWERS, GOLD_WORD, MARKS } from "@/lib/answerKey";
import { upsertSubmission } from "@/lib/db";

function norm(s: unknown) {
  return String(s ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, roll, quizSelections, xwCells, treasureAnswers, goldAnswer } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // ---- Round 1: Quiz ----
    let quizScore = 0;
    const quizSel: number[] = Array.isArray(quizSelections) ? quizSelections : [];
    QUIZ_ANSWERS.forEach((correctIdx, i) => {
      if (quizSel[i] === correctIdx) quizScore += MARKS.quizEach;
    });

    // ---- Round 2: Crossword ----
    // xwCells is {"r-c": "letter"} as typed by the student
    let xwScore = 0;
    const cells: Record<string, string> = xwCells || {};
    const entries = [
      ...crossword.across.map((e) => ({ ...e, dir: "A" as const })),
      ...crossword.down.map((e) => ({ ...e, dir: "D" as const })),
    ];
    for (const e of entries) {
      const dr = e.dir === "A" ? 0 : 1;
      const dc = e.dir === "A" ? 1 : 0;
      let word = "";
      for (let k = 0; k < e.len; k++) {
        const r = e.r + k * dr;
        const c = e.c + k * dc;
        word += norm(cells[`${r}-${c}`]);
      }
      const key = `${e.r}-${e.c}-${e.dir}`;
      if (word === CROSSWORD_ANSWERS[key]) xwScore += MARKS.xwEach;
    }

    // ---- Round 3: Treasure hunt ----
    let thScore = 0;
    const tAns: string[] = Array.isArray(treasureAnswers) ? treasureAnswers : [];
    TREASURE_ANSWERS.forEach((correct, i) => {
      if (norm(tAns[i]) === correct) thScore += MARKS.treasureEach;
    });

    // ---- Bonus: gold word ----
    const bonus = norm(goldAnswer) === GOLD_WORD ? MARKS.bonus : 0;

    const total = quizScore + xwScore + thScore; // bonus reported separately, out of 20

    await upsertSubmission({
      name: String(name).slice(0, 120),
      email: String(email).slice(0, 160),
      roll: roll ? String(roll).slice(0, 60) : "",
      quiz_score: quizScore,
      xw_score: xwScore,
      th_score: thScore,
      bonus,
      total,
    });

    return NextResponse.json({
      quizScore,
      quizMax: QUIZ_ANSWERS.length * MARKS.quizEach,
      xwScore,
      xwMax: entries.length * MARKS.xwEach,
      thScore,
      thMax: TREASURE_ANSWERS.length * MARKS.treasureEach,
      bonus,
      total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not grade submission." }, { status: 500 });
  }
}
