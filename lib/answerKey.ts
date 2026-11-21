// SERVER-ONLY. Never imported by any client component — only by API
// route handlers, which run on the server in Next.js. This is where the
// actual correct answers live, so a student reading the deployed bundle
// or devtools cannot find them.

export const QUIZ_ANSWERS = [1, 2, 1, 2, 3, 2]; // 0-indexed option per question

// word placed at each crossword slot, keyed "r-c-dir" matching the
// numbering in examContent.ts (dir: "A" across, "D" down)
export const CROSSWORD_ANSWERS: Record<string, string> = {
  "0-7-A": "CAC",
  "1-3-A": "PULL",
  "3-0-A": "CONVERSION",
  "5-4-A": "UTM",
  "5-8-A": "SEO",
  "0-1-D": "INBOUND",
  "0-5-D": "CLARITY",
  "0-9-D": "CHANNEL",
};

export const TREASURE_ANSWERS = ["POSITIONING", "FLYWHEEL", "NORTHSTAR", "COHORT"];
export const GOLD_WORD = "TEST";

export const MARKS = { quizEach: 1, xwEach: 1, treasureEach: 1.5, bonus: 1 };
