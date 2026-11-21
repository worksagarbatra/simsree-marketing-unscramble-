import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("No database connection string set (DATABASE_URL / POSTGRES_URL).");
  return neon(url);
}

export async function ensureTable() {
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
};

export async function upsertSubmission(s: Submission) {
  const sql = getSql();
  await ensureTable();
  await sql(
    `INSERT INTO exam_submissions (name, email, roll, quiz_score, xw_score, th_score, bonus, total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       roll = EXCLUDED.roll,
       quiz_score = EXCLUDED.quiz_score,
       xw_score = EXCLUDED.xw_score,
       th_score = EXCLUDED.th_score,
       bonus = EXCLUDED.bonus,
       total = EXCLUDED.total,
       submitted_at = now();`,
    [s.name, s.email, s.roll ?? "", s.quiz_score, s.xw_score, s.th_score, s.bonus, s.total]
  );
}

export async function allSubmissions() {
  const sql = getSql();
  await ensureTable();
  return await sql(
    `SELECT name, email, roll, quiz_score, xw_score, th_score, bonus, total, submitted_at
     FROM exam_submissions ORDER BY submitted_at ASC;`
  );
}
