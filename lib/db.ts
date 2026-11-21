import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("No database connection string set (DATABASE_URL / POSTGRES_URL).");
  return neon(url);
}

let tableReady = false;

export async function ensureTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql(`
    CREATE TABLE IF NOT EXISTS exam_submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      roll TEXT,
      quiz_score NUMERIC NOT NULL,
      xw_score NUMERIC NOT NULL,
      th_score NUMERIC NOT NULL,
      bonus NUMERIC NOT NULL DEFAULT 0,
      total NUMERIC NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await sql(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS raw_answers JSONB;`);
  await sql(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS timing JSONB;`);
  tableReady = true;
}

export type Submission = {
  name: string;
  email: string;
  roll?: string;
  quiz_score: number;
  xw_score: number;
  th_score: number;
  bonus: number;
  total: number;
  raw_answers: unknown;
  timing: unknown;
};

export type Row = {
  name: string; email: string; roll: string;
  quiz_score: string; xw_score: string; th_score: string; bonus: string; total: string;
  raw_answers: any; timing: any; submitted_at: string;
};

/** First submission wins. Returns the stored row and whether it already existed. */
export async function insertSubmission(s: Submission): Promise<{ row: Row; existed: boolean }> {
  const sql = getSql();
  await ensureTable();
  const inserted = (await sql(
    `INSERT INTO exam_submissions (name, email, roll, quiz_score, xw_score, th_score, bonus, total, raw_answers, timing)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
     ON CONFLICT (email) DO NOTHING
     RETURNING name, email, roll, quiz_score, xw_score, th_score, bonus, total, raw_answers, timing, submitted_at;`,
    [s.name, s.email, s.roll ?? "", s.quiz_score, s.xw_score, s.th_score, s.bonus, s.total,
     JSON.stringify(s.raw_answers), JSON.stringify(s.timing)]
  )) as Row[];
  if (inserted.length) return { row: inserted[0], existed: false };
  const existing = (await sql(
    `SELECT name, email, roll, quiz_score, xw_score, th_score, bonus, total, raw_answers, timing, submitted_at
     FROM exam_submissions WHERE email = $1;`,
    [s.email]
  )) as Row[];
  return { row: existing[0], existed: true };
}

export async function allSubmissions(): Promise<Row[]> {
  const sql = getSql();
  await ensureTable();
  return (await sql(
    `SELECT name, email, roll, quiz_score, xw_score, th_score, bonus, total, raw_answers, timing, submitted_at
     FROM exam_submissions ORDER BY submitted_at ASC;`
  )) as Row[];
}
