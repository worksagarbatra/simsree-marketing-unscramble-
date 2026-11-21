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

Visit `https://simsree-marketing-unscramble.vercel.app/api/results?key=YOUR_ADMIN_KEY`
to download an Excel workbook with three tabs:

- **Responses** — what each student submitted (quiz letters, crossword words, treasure answers, bonus word, seconds spent per round)
- **Scores** — quiz, crossword, treasure, bonus, final /20 (as formulas) and percent
- **Answer key** — for spot-checking

Add `&format=csv` for a scores-only CSV.

## Exam rules built in

- Timers: quiz 10 min, crossword 15 min, treasure hunt 15 min. Each starts the first time a round is opened and keeps running; the round locks at zero; the exam auto-submits when all three have run out.
- Progress is saved in the browser, so a mobile reload doesn't lose answers.
- First submission per email wins; a resubmit just shows the recorded score.

## Local development

```
npm install
npm run dev
```

Without a `POSTGRES_URL` set locally, the quiz/crossword/treasure-hunt
UI and grading logic all work; only the final database write will fail
(the app still returns your score). Add a `.env.local` with a
`POSTGRES_URL` (e.g. from `vercel env pull`) to test storage locally too.
