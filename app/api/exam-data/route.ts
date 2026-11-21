import { NextResponse } from "next/server";
import { crossword, treasure, quiz } from "@/lib/examContent";

export async function GET() {
  // Only public content goes out: grid shape, clue text, scrambled
  // letters, question/option text. No answer key.
  return NextResponse.json({ crossword, treasure, quiz });
}
