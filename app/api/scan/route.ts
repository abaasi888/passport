import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  try {
    const jobs = await fetchAllJobs();
    return NextResponse.json({ total: jobs.length, jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed.";
    return NextResponse.json(
      { error: `Could not fetch jobs: ${message}` },
      { status: 502 }
    );
  }
}
