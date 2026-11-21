import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { allSubmissions } from "@/lib/db";
import { quiz, crossword, treasure } from "@/lib/examContent";
import { QUIZ_ANSWERS, MARKS, TREASURE_ANSWERS, CROSSWORD_ANSWERS } from "@/lib/answerKey";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INK = "FF16181A";
const SIGNAL = "FFE85002";
const ON_SIGNAL = "FF0E0F10";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function styleHeader(ws: ExcelJS.Worksheet, fill: string, font: string) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: font }, name: "Arial" };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

// Admin-only. GET /api/results?key=ADMIN_KEY  -> .xlsx (Responses + Scores tabs)
//               /api/results?key=ADMIN_KEY&format=csv -> scores as CSV
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.ADMIN_KEY || url.searchParams.get("key") !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rows = await allSubmissions();
  const xwSlots = [
    ...crossword.across.map((e) => `${e.n} Across`),
    ...crossword.down.map((e) => `${e.n} Down`),
  ];
  const maxXw = Object.keys(CROSSWORD_ANSWERS).length * MARKS.xwEach;
  const maxQuiz = QUIZ_ANSWERS.length * MARKS.quizEach;
  const maxTh = TREASURE_ANSWERS.length * MARKS.treasureEach;

  if (url.searchParams.get("format") === "csv") {
    const head = ["name", "email", "roll", "quiz", "crossword", "treasure", "bonus", "total_out_of_20", "submitted_at"];
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [head.join(","), ...rows.map((r) =>
      [r.name, r.email, r.roll, r.quiz_score, r.xw_score, r.th_score, r.bonus, r.total, new Date(r.submitted_at).toISOString()].map(esc).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="simsree-exam-scores.csv"', "Cache-Control": "no-store" } });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "The Marketing Unscramble";
  wb.created = new Date();

  // ---- Tab 1: Responses (what each student submitted) ----
  const resp = wb.addWorksheet("Responses");
  resp.columns = [
    { header: "Submitted at (IST)", key: "at", width: 20 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Roll / Team", key: "roll", width: 14 },
    ...quiz.map((_, i) => ({ header: `Q${i + 1}`, key: `q${i}`, width: 6 })),
    ...xwSlots.map((s) => ({ header: `XW ${s}`, key: `xw_${s}`, width: 14 })),
    ...treasure.map((_, i) => ({ header: `TH ${i + 1}`, key: `th${i}`, width: 14 })),
    { header: "Bonus word", key: "gold", width: 12 },
    { header: "Quiz time (s)", key: "tq", width: 12 },
    { header: "Crossword time (s)", key: "tx", width: 16 },
    { header: "Treasure time (s)", key: "tt", width: 16 },
  ];
  for (const r of rows) {
    const ra = r.raw_answers || {};
    const t = r.timing || {};
    const rec: Record<string, unknown> = {
      at: new Date(r.submitted_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      name: r.name, email: r.email, roll: r.roll,
      gold: ra.bonusWord || "",
      tq: t.quiz ?? "", tx: t.xw ?? "", tt: t.th ?? "",
    };
    quiz.forEach((_, i) => { const v = ra.quiz?.[i]; rec[`q${i}`] = Number.isInteger(v) && v >= 0 ? LETTERS[v] : ""; });
    xwSlots.forEach((s) => { rec[`xw_${s}`] = ra.crossword?.[s] || ""; });
    treasure.forEach((_, i) => { rec[`th${i}`] = ra.treasure?.[i] || ""; });
    resp.addRow(rec);
  }
  styleHeader(resp, INK, "FFFAFAF7");

  // ---- Tab 2: Scores (correct scores + final score per student) ----
  const sc = wb.addWorksheet("Scores");
  sc.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Roll / Team", key: "roll", width: 14 },
    { header: `Quiz (/${maxQuiz})`, key: "q", width: 11 },
    { header: `Crossword (/${maxXw})`, key: "x", width: 15 },
    { header: `Treasure (/${maxTh})`, key: "t", width: 14 },
    { header: "Bonus (+1)", key: "b", width: 11 },
    { header: "Final (/20)", key: "total", width: 12 },
    { header: "Final incl. bonus", key: "withBonus", width: 16 },
    { header: "Percent", key: "pct", width: 10 },
  ];
  rows.forEach((r, i) => {
    const n = i + 2;
    sc.addRow({
      name: r.name, email: r.email, roll: r.roll,
      q: Number(r.quiz_score), x: Number(r.xw_score), t: Number(r.th_score), b: Number(r.bonus),
      total: { formula: `D${n}+E${n}+F${n}`, result: Number(r.total) },
      withBonus: { formula: `H${n}+G${n}`, result: Number(r.total) + Number(r.bonus) },
      pct: { formula: `H${n}/20`, result: Number(r.total) / 20 },
    });
  });
  sc.getColumn("pct").numFmt = "0%";
  styleHeader(sc, SIGNAL, ON_SIGNAL);

  // ---- Tab 3: Answer key (reference for checking) ----
  const key = wb.addWorksheet("Answer key");
  key.columns = [{ header: "Item", key: "i", width: 18 }, { header: "Correct answer", key: "a", width: 24 }];
  QUIZ_ANSWERS.forEach((a, i) => key.addRow({ i: `Q${i + 1}`, a: `${LETTERS[a]} — ${quiz[i].opts[a]}` }));
  const keyEntries = [
    ...crossword.across.map((e) => ({ label: `XW ${e.n} Across`, k: `${e.r}-${e.c}-A` })),
    ...crossword.down.map((e) => ({ label: `XW ${e.n} Down`, k: `${e.r}-${e.c}-D` })),
  ];
  keyEntries.forEach((e) => key.addRow({ i: e.label, a: CROSSWORD_ANSWERS[e.k] }));
  TREASURE_ANSWERS.forEach((a, i) => key.addRow({ i: `TH ${i + 1}`, a }));
  styleHeader(key, INK, "FFFAFAF7");

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="simsree-exam-results-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
