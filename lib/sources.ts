/**
 * sources.ts — pulls remote jobs from free, legal aggregator APIs.
 *
 * Sources:
 *  - Himalayas  (public API, no key, explicit expiry dates)
 *  - Remotive   (public API, no key, active-only feed)
 *  - Jobicy     (public API, no key, batch status check)
 *
 * LinkedIn and most company career pages are intentionally excluded:
 * scraping them violates their terms of service and breaks constantly.
 * The aggregators index tens of thousands of company career pages legally.
 */

export interface Job {
  id: string;
  company: string;
  companyLogo: string;
  title: string;
  location: string;
  applyUrl: string;
  sourceUrl: string;
  description: string;
  postedAt: string;
  source: "himalayas" | "remotive" | "jobicy";
}

const UA = "Passport/0.1 (+https://github.com/)";
const MAX_AGE_DAYS = 60;

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------------ */
/* Himalayas                                                          */
/* ------------------------------------------------------------------ */

interface HimalayasJob {
  guid?: string;
  title?: string;
  companyName?: string;
  companyLogo?: string;
  applicationLink?: string;
  description?: string;
  pubDate?: string;
  expiryDate?: string;
  locationRestrictions?: string[];
}

async function fetchHimalayas(): Promise<Job[]> {
  try {
    const data = (await fetchJson(
      "https://himalayas.app/jobs/api?limit=100"
    )) as { jobs?: HimalayasJob[] };

    const now = Date.now();
    const jobs = data.jobs ?? [];

    return jobs
      .filter((j) => {
        if (j.expiryDate) {
          const expiry = new Date(j.expiryDate).getTime();
          if (!Number.isNaN(expiry) && expiry < now) return false;
        }
        return true;
      })
      .map((j, i) => ({
        id: `himalayas-${j.guid ?? i}`,
        company: j.companyName ?? "Unknown",
        companyLogo: j.companyLogo ?? "",
        title: j.title ?? "Untitled role",
        location: (j.locationRestrictions ?? []).join(", ") || "Worldwide",
        applyUrl: j.applicationLink ?? "",
        sourceUrl: j.guid ? `https://himalayas.app/jobs/${j.guid}` : "",
        description: j.description ?? "",
        postedAt: j.pubDate ?? "",
        source: "himalayas",
      }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Remotive                                                           */
/* ------------------------------------------------------------------ */

interface RemotiveJob {
  id?: number;
  title?: string;
  company_name?: string;
  company_logo?: string;
  url?: string;
  description?: string;
  publication_date?: string;
  candidate_required_location?: string;
}

async function fetchRemotive(): Promise<Job[]> {
  try {
    const data = (await fetchJson(
      "https://remotive.com/api/remote-jobs?limit=100"
    )) as { jobs?: RemotiveJob[] };

    const jobs = data.jobs ?? [];
    return jobs.map((j, i) => ({
      id: `remotive-${j.id ?? i}`,
      company: j.company_name ?? "Unknown",
      companyLogo: j.company_logo ?? "",
      title: j.title ?? "Untitled role",
      location: j.candidate_required_location ?? "Worldwide",
      applyUrl: j.url ?? "",
      sourceUrl: j.url ?? "",
      description: j.description ?? "",
      postedAt: j.publication_date ?? "",
      source: "remotive",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Jobicy                                                             */
/* ------------------------------------------------------------------ */

interface JobicyJob {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  url?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  jobGeo?: string;
}

async function fetchJobicy(): Promise<Job[]> {
  try {
    const data = (await fetchJson(
      "https://jobicy.com/api/v2/remote-jobs?count=50"
    )) as { jobs?: JobicyJob[] };

    const jobs = data.jobs ?? [];
    return jobs.map((j, i) => ({
      id: `jobicy-${j.id ?? i}`,
      company: j.companyName ?? "Unknown",
      companyLogo: j.companyLogo ?? "",
      title: j.jobTitle ?? "Untitled role",
      location: j.jobGeo ?? "Anywhere",
      applyUrl: j.url ?? "",
      sourceUrl: j.url ?? "",
      description: j.jobDescription ?? j.jobExcerpt ?? "",
      postedAt: j.pubDate ?? "",
      source: "jobicy",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Jobicy status filter                                               */
/* ------------------------------------------------------------------ */

interface JobicyStatusResponse {
  jobs?: Array<{ id: number; status: "active" | "closed" | "unknown" }>;
}

async function filterActiveJobicyJobs(jobs: Job[]): Promise<Job[]> {
  if (jobs.length === 0) return jobs;

  const idMap = new Map<string, string>();
  for (const job of jobs) {
    const match = job.id.match(/^jobicy-(\d+)$/);
    if (match) idMap.set(match[1], job.id);
  }

  if (idMap.size === 0) return jobs;

  try {
    const ids = Array.from(idMap.keys()).slice(0, 100).join(",");
    const data = (await fetchJson(
      `https://jobicy.com/api/v2/remote-jobs/status?ids=${ids}`
    )) as JobicyStatusResponse;

    const activeIds = new Set(
      (data.jobs ?? [])
        .filter((j) => j.status === "active")
        .map((j) => String(j.id))
    );

    return jobs.filter((job) => {
      const match = job.id.match(/^jobicy-(\d+)$/);
      if (!match) return true;
      return activeIds.has(match[1]);
    });
  } catch {
    return jobs;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

const BLOCKLIST = [
  /\bus[-\s]?only\b/i,
  /\busa[-\s]?only\b/i,
  /\buk[-\s]?only\b/i,
  /\beu[-\s]?only\b/i,
  /\beurope[-\s]?only\b/i,
  /must be (based|located|residing) in the (us|usa|united states|uk|canada|eu)/i,
  /must (have|possess) (us|uk|eu|canadian) work authorization/i,
  /only (us|uk|eu|canadian) (citizens|residents)/i,
];

function isLikelyOpenToUganda(job: Job): boolean {
  // Staleness backstop: drop anything posted more than 60 days ago
  if (job.postedAt) {
    const posted = new Date(job.postedAt).getTime();
    const ageDays = (Date.now() - posted) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_AGE_DAYS) return false;
  }

  const haystack = `${job.location} ${job.title}`.toLowerCase();

  for (const rx of BLOCKLIST) {
    if (rx.test(haystack)) return false;
  }

  if (/worldwide|anywhere|global|remote$/i.test(job.location)) return true;

  return true;
}

function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const j of jobs) {
    const key = `${j.company.toLowerCase()}|${j.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export async function fetchAllJobs(): Promise<Job[]> {
  const [h, r, j] = await Promise.all([
    fetchHimalayas(),
    fetchRemotive(),
    fetchJobicy(),
  ]);

  const activeJobicy = await filterActiveJobicyJobs(j);

  const all = dedupe([...h, ...r, ...activeJobicy]);
  return all.filter(isLikelyOpenToUganda);
}

export function stripHtml(html: string): string {
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
