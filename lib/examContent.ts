// PUBLIC content only — grid shape, clue text, scrambled letters, quiz
// question/option text. No correct answers live here. This file is safe
// to import from the client-facing /api/exam-data route.

export const crossword = {
  rows: 7,
  cols: 11,
  cells: [
    [0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
    [0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  ],
  across: [
    { n: 3, r: 0, c: 7, len: 3, clue: "Acquisition spend divided by new customers (3)" },
    { n: 5, r: 1, c: 3, len: 4, clue: "Inbound is this; outbound is push (4)" },
    { n: 6, r: 3, c: 0, len: 10, clue: "Third of the 3Cs: the visitor does not act (10)" },
    { n: 7, r: 5, c: 4, len: 3, clue: "Link tag for source, medium and campaign (3)" },
    { n: 8, r: 5, c: 8, len: 3, clue: "Earn the click rather than buy it (3)" },
  ],
  down: [
    { n: 1, r: 0, c: 1, len: 7, clue: "The consumer starts the conversation (7)" },
    { n: 2, r: 0, c: 5, len: 7, clue: "One of the 3Cs: the message does not land (7)" },
    { n: 4, r: 0, c: 9, len: 7, clue: "Where a message travels, such as SEO or print (7)" },
  ],
};

export const treasure = [
  { scrambled: "OGINITNPOSI", len: 11, hint: "Product marketing's first artifact: who it is for and why it wins against alternatives." },
  { scrambled: "LYEHLEFW", len: 8, hint: "The SEO loop where each turn makes the next one cheaper." },
  { scrambled: "TSRRAHNTO", len: 9, hint: "The single metric the whole business steers by." },
  { scrambled: "OHCOTR", len: 6, hint: "Plot each signup group's share still active over time." },
];

export const quiz = [
  {
    q: "Lecture 2 classifies any business with a revenue identity. Which one is it?",
    opts: [
      "Revenue = Price x Margin",
      "Revenue = Customers x Value per customer x Frequency",
      "Revenue = Traffic x Conversion rate",
      "Revenue = Spend / Customers",
    ],
  },
  {
    q: "Which ICP lens asks: what are they afraid of losing?",
    opts: ["Firmographics", "Demographics", "Psychographics", "Geographics"],
  },
  {
    q: "A user signs up but takes nine days to reach their first moment of value. Which AARRR stage is the constraint?",
    opts: ["Acquisition", "Onboarding", "Monetization", "Retention"],
  },
  {
    q: "Which channel has a feedback loop shorter than two months?",
    opts: ["SEO", "Print media", "Performance ads", "Hoardings / OOH"],
  },
  {
    q: "Backlinks, brand mentions, PR and guest posts belong to which SEO pillar?",
    opts: ["Technical SEO", "On-page SEO", "Content SEO", "Off-page SEO"],
  },
  {
    q: "In a UTM link, which parameter answers the question 'why', meaning which promotion?",
    opts: ["utm_source", "utm_medium", "utm_campaign", "utm_term"],
  },
];
