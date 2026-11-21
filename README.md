# The Marketing Unscramble — SIMSREE Internal Exam

A 20-mark internal assessment for the SIMSREE Digital Marketing elective:
a quiz, a crossword and a treasure hunt, graded server-side and recorded
to a Postgres table that exports as CSV (opens straight in Excel or
Google Sheets).

## How grading works

The browser only ever sees question text, the crossword grid shape, and
scrambled letters — never the answer key. `lib/answerKey.ts` holds the
correct answers and is imported only by the `/api/submit` route, which
runs server-side in Next.js and is never shipped to the browser. A
student opening devtools cannot read the answers off the page.

## One-time setup (Vercel)

1. Push this repo to GitHub, then import it into Vercel
   (vercel.com → Add New → Project → pick this repo).
2. In the Vercel project: **Storage → Create Database** and pick the
   Postgres option (Vercel's native integration now runs on Neon),
   then connect it to this project. This sets `DATABASE_URL` /
   `POSTGRES_URL` for you automatically.
3. **Settings → Environment Variables**: add `ADMIN_KEY` with any long
   random string you choose (not the DB credentials — a password you
   invent for yourself).
4. Redeploy (Vercel does this automatically after you add env vars, or
   trigger it from the Deployments tab).

## Giving students the link

Share the Vercel URL (e.g. `https://simsree-marketing-unscramble.vercel.app`)
directly. No login is required; each student enters name, email and
roll/team code, works through the three rounds, and submits once.
Submitting again with the same email overwrites their previous score
(useful if someone's connection drops mid-exam).

## Pulling results

Visit:

```
https://<your-deployment>.vercel.app/api/results?key=YOUR_ADMIN_KEY
```

This downloads a CSV with every student's name, email, roll, per-round
scores, bonus and total — open it directly in Excel, or ask Claude Code
to fetch it and build a formatted .xlsx:

```
curl -s "https://<your-deployment>.vercel.app/api/results?key=YOUR_ADMIN_KEY" -o results.csv
```

## Local development

```
npm install
npm run dev
```

Without a `POSTGRES_URL` set locally, the quiz/crossword/treasure-hunt
UI and grading logic all work; only the final database write will fail
(the app still returns your score). Add a `.env.local` with a
`POSTGRES_URL` (e.g. from `vercel env pull`) to test storage locally too.
