"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile, Verdict, AnalysisResult } from "@/lib/engine";
import type { Job } from "@/lib/sources";
import styles from "./scan.module.css";

interface JobWithVerdict extends Job {
  analysis?: AnalysisResult;
  analyzing?: boolean;
  analysisError?: string;
}

interface ScanResponse {
  total: number;
  jobs: Job[];
}

const VERDICT_LABELS: Record<Verdict, string> = {
  eligible: "Eligible — can hire you in Uganda",
  likely: "Likely eligible — verify with recruiter",
  unclear: "Unclear — ask before applying",
  not_eligible: "Not eligible from Uganda",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  eligible: styles.verdictEligible,
  likely: styles.verdictLikely,
  unclear: styles.verdictUnclear,
  not_eligible: styles.verdictNotEligible,
};

export default function ScanPage() {
  const [jobs, setJobs] = useState<JobWithVerdict[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile] = useState<Profile>({
    location: "Kampala, Uganda",
    work_auth: "Ugandan citizen — no work authorization outside Uganda",
    timezone: "EAT (UTC+3)",
  });

  async function scan() {
    setScanning(true);
    setError(null);
    setJobs([]);
    setTotal(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data: ScanResponse | { error: string } = await res.json();
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Scan failed.");
      }
      setJobs(data.jobs.map((j) => ({ ...j })));
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function checkJob(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.analyzing || job.analysis) return;

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, analyzing: true } : j))
    );

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: stripHtmlClient(job.description),
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, analysis: data, analyzing: false } : j
        )
      );
    } catch (err) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                analyzing: false,
                analysisError:
                  err instanceof Error ? err.message : "Analysis failed.",
              }
            : j
        )
      );
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          Pass<span className={styles.brandAccent}>port</span>
        </Link>
        <Link href="/" className={styles.back}>
          ← Back
        </Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.h1}>Pull remote jobs from around the world.</h1>
        <p>
         Passport fetches live remote jobs, then filters for companies that can hire
         someone based in Uganda — or anywhere in Africa — to work fully remote.
         Every listing links straight to the company&apos;s own application page.
</p>
      </header>

      <button onClick={scan} disabled={scanning} className={styles.primaryBtn}>
        {scanning ? "Scanning the world…" : "Scan jobs"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {total !== null && (
        <p className={styles.resultMeta}>
          Found {total} open jobs where the company might hire you · click{" "}
          <strong>Check eligibility</strong> on any job to analyze it
        </p>
      )}

      <div className={styles.jobList}>
        {jobs.map((job) => {
          const verdict = job.analysis?.verdict;
          return (
            <article key={job.id} className={styles.job}>
              <div className={styles.jobTop}>
                <div className={styles.logoWrap}>
                  {job.companyLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.companyLogo} alt={job.company} />
                  ) : (
                    job.company.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className={styles.jobMain}>
                  <div className={styles.company}>{job.company}</div>
                  <div className={styles.title}>{job.title}</div>
                  <div className={styles.meta}>
                    {job.location && <span>{job.location}</span>}
                    {job.postedAt && <span>{job.postedAt.slice(0, 10)}</span>}
                    <span className={styles.source}>{job.source}</span>
                  </div>
                </div>
              </div>

              {verdict && (
                <>
                  <div
                    className={`${styles.verdictRow} ${VERDICT_CLASS[verdict]}`}
                  >
                    {VERDICT_LABELS[verdict]}
                  </div>
                  {job.analysis?.headline && (
                    <p className={styles.verdictHeadline}>
                      {job.analysis.headline}
                    </p>
                  )}
                </>
              )}

              {job.analysisError && (
                <div className={`${styles.verdictRow} ${styles.verdictError}`}>
                  {job.analysisError}
                </div>
              )}

              <div className={styles.actions}>
                {!job.analysis && !job.analysisError && (
                  <button
                    onClick={() => checkJob(job.id)}
                    disabled={job.analyzing}
                    className={styles.checkBtn}
                  >
                    {job.analyzing ? "Checking…" : "Check eligibility"}
                  </button>
                )}
                {job.applyUrl && (
                  <a
                    className={styles.applyBtn}
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply on {job.company} →
                  </a>
                )}
                <a
                  className={styles.secondaryLink}
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${job.company} LinkedIn employees Africa`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check the company
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {total !== null && (
        <p className={styles.footnote}>
          Every <strong>Apply</strong> button goes directly to the
          company&apos;s own application page — not through Passport, not
          through the job board. Job data comes from Himalayas, Remotive, and
          Jobicy, which index thousands of company career pages legally.
          Always verify the posting is still live before applying.
        </p>
      )}

      <footer className={styles.pageFoot}>
        © 2026 Passport · No accounts. No tracking. Nothing stored.
      </footer>
    </main>
  );
}

function stripHtmlClient(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
