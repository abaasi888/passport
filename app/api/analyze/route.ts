import { NextRequest, NextResponse } from "next/server";
import { analyzeJob, type Profile } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  jdText: string;
  profile: Profile;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { jdText, profile } = body;

  if (!jdText || typeof jdText !== "string") {
    return NextResponse.json(
      { error: "Missing job description." },
      { status: 400 }
    );
  }

  if (!profile || typeof profile !== "object") {
    return NextResponse.json({ error: "Missing profile." }, { status: 400 });
  }

  try {
    const result = await analyzeJob(jdText, profile);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}