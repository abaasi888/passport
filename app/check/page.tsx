"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  AnalysisResult,
  Profile,
  Verdict,
  ReqStatus,
} from "@/lib/engine";
import styles from "./check.module.css";

const VERDICT_LABELS: Record<Verdict, string> = {
  eligible: "Eligible",
  likely: "Likely eligible",
  unclear: "Unclear — ask first",
  not_eligible: "Not eligible",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  eligible: styles.verdictEligible,
  likely: styles.verdictLikely,
  unclear: styles.verdictUnclear,
  not_eligible: styles.verdictNotEligible,
};

const STATUS_DOT: Record<ReqStatus, string> = {
  met: styles.dotMet,
  not_met: styles.dotNotMet,
  unclear: styles.dotUnclear,
};

export default function CheckPage() {
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile>({
    location: "Kampala, Uganda",
    work_auth:
      "Ugandan citizen — no work authorization outside Uganda",
    timezone: "EAT (UTC+3)",
  });
  const [showProfile, setShowProfile] = useState(false);

  async function analyze() {
    if (!jdText.trim()) {
      setError("Paste a job description first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setResult(data);
      setElapsed(Math.round((performance.now() - t0) / 100) / 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setElapsed(null);
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Pass<span className={styles.logoAccent}>port</span>
        </Link>
        <Link href="/" className={styles.back}>
          ← Back
        </Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.h1}>Paste any posting, from anywhere.</h1>
        <p>
          LinkedIn, email, a referral, a company site — paste the full advert.
          Passport reads it and tells you whether the company can hire you in
          Uganda.
        </p>
      </header>

      <div className={styles.profileWrap}>
        <button
          className={styles.profileToggle}
          onClick={() => setShowProfile((v) => !v)}
        >
          {showProfile ? "Hide" : "Edit"} your profile
        </button>
        {showProfile && (
          <div className={styles.profile}>
            {(
              [
                ["location", "Where are you based?"],
                ["work_auth", "Work authorization"],
                ["timezone", "Timezone"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={styles.profileField}>
                <label className={styles.profileLabel}>{label}</label>
                <input
                  type="text"
                  value={profile[key]}
                  onChange={(e) =>
                    setProfile({ ...profile, [key]: e.target.value })
                  }
                  className={styles.profileInput}
                />
              </div>
            ))}
            <p className={styles.profileNote}>
              Stored in your browser only. Never sent anywhere except the
              model.
            </p>
          </div>
        )}
      </div>

      {!result && (
        <>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job posting here…"
            className={styles.textarea}
          />
          <button
            onClick={analyze}
            disabled={loading}
            className={styles.primaryBtn}
          >
            {loading ? "Reading all three layers…" : "Check eligibility"}
          </button>
        </>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <>
          <div className={`${styles.verdict} ${VERDICT_CLASS[result.verdict]}`}>
            <div className={styles.verdictLabel}>
              {VERDICT_LABELS[result.verdict]} · {result.confidence} confidence
            </div>
            <p className={styles.verdictHeadline}>{result.headline}</p>
            <p className={styles.verdictSummary}>{result.summary}</p>
          </div>

          <div className={styles.facts}>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Company country</div>
              <div className={styles.factValue}>{result.company_country}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Hiring model</div>
              <div className={styles.factValue}>{result.hiring_model}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Timezone</div>
              <div className={styles.factValue}>{result.timezone_overlap}</div>
            </div>
          </div>

          <div className={styles.sectionH}>How this verdict was reached</div>
          <div className={styles.layers}>
            <div className={styles.layer}>
              <div className={styles.layerLabel}>
                Layer 1 — What the advert says
              </div>
              <p className={styles.layerBody}>{result.layer1_explicit}</p>
            </div>
            <div className={styles.layer}>
              <div className={styles.layerLabel}>Layer 2 — Company signals</div>
              <p className={styles.layerBody}>{result.layer2_company}</p>
            </div>
            <div className={styles.layer}>
              <div className={styles.layerLabel}>
                Layer 3 — Employment classification
              </div>
              <p className={styles.layerBody}>
                {result.layer3_classification}
              </p>
            </div>
          </div>

          {result.evidence.length > 0 && (
            <>
              <div className={styles.sectionH}>What decided it</div>
              {result.evidence.map((ev, i) => (
                <div key={i} className={styles.evidence}>
                  <p className={styles.evidenceQuote}>
                    &ldquo;{ev.quote}&rdquo;
                  </p>
                  <p className={styles.evidenceMeans}>{ev.means}</p>
                </div>
              ))}
            </>
          )}

          {result.requirements.length > 0 && (
            <>
              <div className={styles.sectionH}>Requirements</div>
              <div className={styles.reqs}>
                {result.requirements.map((req, i) => (
                  <div key={i} className={styles.req}>
                    <div
                      className={`${styles.reqDot} ${STATUS_DOT[req.status]}`}
                    />
                    <div>
                      <div className={styles.reqName}>{req.item}</div>
                      <div className={styles.reqNote}>{req.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.red_flags.length > 0 && (
            <>
              <div className={styles.sectionH}>Red flags</div>
              <ul className={styles.list}>
                {result.red_flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </>
          )}

          {result.ask_recruiter.length > 0 && (
            <>
              <div className={styles.sectionH}>Ask before applying</div>
              <ul className={styles.list}>
                {result.ask_recruiter.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}

          {result.company_checks.length > 0 && (
            <>
              <div className={styles.sectionH}>Check this company yourself</div>
              <ul className={styles.list}>
                {result.company_checks.map((check, i) => (
                  <li key={i}>{check}</li>
                ))}
              </ul>
            </>
          )}

          <p className={styles.footnote}>
            Analyzed in {elapsed ?? "—"}s · Always verify with the recruiter
            before relying on this.
          </p>

          <button onClick={reset} className={styles.secondaryBtn}>
            Check another posting
          </button>
        </>
      )}

      <footer className={styles.pageFoot}>
        © 2026 Passport · No accounts. No tracking. Nothing stored.
      </footer>
    </main>
  );
}