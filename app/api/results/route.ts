import { NextResponse } from "next/server";
import { allSubmissions } from "@/lib/db";

// Admin-only CSV export. Visit /api/results?key=YOUR_ADMIN_KEY
// Opens directly in Excel/Google Sheets, or Claude Code can fetch it
// with curl and turn it into an .xlsx.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rows = await allSubmissions();
  const header = ["name", "email", "roll", "quiz_score", "xw_score", "th_score", "bonus", "total", "submitted_at"];
  const csvRows = [header.join(",")];
  for (const r of rows as any[]) {
    csvRows.push(
      header
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return /[,"\n]/.test(s) ? `"${s}"` : s;
        })
        .join(",")
    );
  }
  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="simsree-exam-results.csv"`,
    },
  });
}
