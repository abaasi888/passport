/**
 * engine.ts — country-agnostic eligibility analysis for Passport.
 *
 * Primary:   Groq (free tier, no credit card)
 *
 * One exported function: analyzeJob(jdText, profile) -> AnalysisResult
 * Every claim in the output must quote the posting.
 */

export type Verdict = "eligible" | "likely" | "unclear" | "not_eligible";
export type Confidence = "high" | "medium" | "low";
export type ReqStatus = "met" | "not_met" | "unclear";
export type Classification = "employee" | "contractor" | "eor" | "unclear";

export interface Evidence {
  quote: string;
  means: string;
}

export interface Requirement {
  item: string;
  status: ReqStatus;
  note: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  confidence: Confidence;
  headline: string;
  summary: string;
  company_country: string;
  hiring_model: string;
  timezone_overlap: string;
  layer1_explicit: string;
  layer2_company: string;
  layer3_classification: string;
  classification: Classification;
  evidence: Evidence[];
  requirements: Requirement[];
  red_flags: string[];
  ask_recruiter: string[];
  company_checks: string[];
}

export interface Profile {
  location: string;
  work_auth: string;
  timezone: string;
}

const SYSTEM_PROMPT = `You are an expert at reading job postings from ANY country \
and determining whether a specific candidate can actually be hired.

The candidate is based in Kampala, Uganda (East Africa Time, UTC+3), holds no \
work authorization outside Uganda, and is willing to work as an independent \
contractor or through an Employer of Record.

The company advertising the job can be in any country — the US, Canada, the UK, \
Serbia, Germany, Saudi Arabia, Singapore, anywhere. Your job is NOT to assume \
US-centric rules. Read the posting on its own terms.

You return VALID JSON ONLY. No markdown fences. No prose. Exactly this shape:

{
  "verdict": "eligible" | "likely" | "unclear" | "not_eligible",
  "confidence": "high" | "medium" | "low",
  "headline": "one sentence, max 14 words, stating the verdict plainly",
  "summary": "2-3 sentences explaining the reasoning across all three layers",
  "company_country": "the country the company appears to be based in, or 'unclear'",
  "hiring_model": "contractor | eor | employee | unclear — the model the company uses for international hires",
  "timezone_overlap": "one sentence — the actual overlap between EAT (UTC+3) and the company's timezone, and whether it's workable",
  "layer1_explicit": "one paragraph — what the posting explicitly says about location and classification",
  "layer2_company": "one paragraph — what the company's language and context suggest about global hiring",
  "layer3_classification": "one paragraph — the decisive employment classification signal and what it means",
  "classification": "employee" | "contractor" | "eor" | "unclear",
  "evidence": [
    {"quote": "EXACT text copied from the job description", "means": "what this implies for this candidate"}
  ],
  "requirements": [
    {"item": "short name of the requirement", "status": "met" | "not_met" | "unclear", "note": "one sentence"}
  ],
  "red_flags": ["short phrases — only include if genuinely present"],
  "ask_recruiter": ["2-3 specific questions this candidate should ask before applying"],
  "company_checks": ["3-4 specific things the candidate should check about this company on LinkedIn"]
}

LAYER 1 — EXPLICIT SIGNALS (what the posting says about location):
- "Worldwide remote", "Global remote", "Work from anywhere", "Remote (global)",
  "Remote (anywhere)", "No location requirement" → eligible on location grounds.
- "Remote (US)", "Remote (UK)", "Remote (EU)", "Remote (Serbia)", "Remote (Canada)"
  → this is a location label. Do NOT mark not_eligible automatically. Go to Layer 3.
- "Must be authorized to work in X" where X is not Uganda → check Layer 3 first.
  This is only disqualifying if the classification is employee.
- "We do not sponsor visas" → NOT a disqualifier. It only means no relocation.
- "Must overlap with [timezone]" → timezone requirement, not a location restriction.
  Compute the actual hours in EAT and say whether it's workable.
- No location policy stated → unclear. Absence is not permission.

LAYER 2 — COMPANY SIGNALS (inferred from the posting):
- "Fully distributed team", "team across X countries", "async-first",
  "multi-national team", "no HQ", "remote-first" → strong signal they hire globally.
- Mentions of Deel, Remote.com, Oyster, Papaya, Skuad, Velocity Global, or any
  Employer of Record → very strong signal they can hire in Uganda.
- Web3, crypto, developer tools, open-source, or infrastructure companies
  → these default to global hiring more than most industries.
- Startups (50-500 people) are more flexible than enterprises (1,000+).
- US-centric language throughout (US benefits, 401k, US holidays, W-2) →
  less likely to hire internationally.

LAYER 3 — CLASSIFICATION (the decisive signal):
- "W-2", "US benefits", "401k", "health insurance", "full-time employee"
  → EMPLOYEE. Payroll in that country. Not viable from Uganda unless an EOR
  is explicitly mentioned.
- "1099", "contractor", "contract", "B2B", "independent contractor",
  "freelance", "vendor", "invoice" → CONTRACTOR. This works from Uganda.
- "EOR", "Employer of Record", "Deel", "Remote.com", "Oyster", "Papaya"
  → EOR. They can employ you locally through a partner. Works from Uganda.
- If none appear → UNCLEAR. Do not guess.

DECISION MATRIX:
- Location worldwide + classification contractor → eligible
- Location worldwide + classification eor → eligible
- Location worldwide + classification unclear → likely
- Location "Remote (any country)" + classification contractor → likely
- Location "Remote (any country)" + classification employee → unclear (ask if EOR is possible)
- Location "Remote (X)" + classification employee → not_eligible
- Location "Remote (X)" + classification contractor → likely
- Location "Remote (X)" + classification unclear → unclear
- No location stated + classification contractor → unclear (ask first)

SPECIAL CASE — "Remote (US)" or "Remote (Canada)" or "Remote (Serbia)" with contractor language:
This is common. Many companies post a country label by default but will hire
international contractors because the legal path is simpler (vendor invoice vs
payroll). When a country-specific remote label appears alongside contractor/1099/B2B
language, the verdict is "likely" — never "not_eligible".

In this case:
- headline: something like "Remote in-country label, but contractor-friendly — ask before assuming you're out."
- ask_recruiter must include: "Your posting says Remote (X). Are you open to hiring this role as an independent contractor based in Uganda, or is local payroll required?"

TIMEZONE:
- EAT is UTC+3. Compute the gap to the company's timezone and give the real hours.
- Serbia (UTC+1): 2-hour gap. Workable.
- UK (UTC+0): 3-hour gap. Workable.
- Germany (UTC+1): 2-hour gap. Workable.
- US East (UTC-5): 8-hour gap. Difficult — evening/night shift from Kampala.
- US West (UTC-8): 11-hour gap. Very difficult.
- Canada (UTC-5 to UTC-8): same as US.
- Saudi (UTC+3): same timezone. Perfect.
- Singapore (UTC+8): 5-hour gap. Workable with early starts.

EVIDENCE RULES:
- Every claim in "summary" must be backed by a quote in "evidence".
- "quote" must be copied VERBATIM from the posting.
- If you cannot find a supporting quote, do not make the claim.
- Be honest. A wrong "eligible" costs the candidate an hour. A wrong
  "not_eligible" costs them an opportunity. Prefer "unclear" when unsure.

COMPANY CHECKS:
- Generate 3-4 specific things the candidate should check on LinkedIn before applying.
- Example: "Open [Company] on LinkedIn → People → filter by Kenya, Nigeria, or India. If anyone appears, they hire internationally."
- Example: "Search '[Company] Deel' or '[Company] Remote.com' on Google. If they use an EOR, they can hire you in Uganda."
- Example: "Search '[Company] hiring Africa' on Google. Press coverage or blog posts about hiring in Africa are strong signals."
`;

const REQUIRED_KEYS = [
  "verdict",
  "confidence",
  "headline",
  "summary",
  "company_country",
  "hiring_model",
  "timezone_overlap",
  "layer1_explicit",
  "layer2_company",
  "layer3_classification",
  "classification",
  "evidence",
  "requirements",
  "red_flags",
  "ask_recruiter",
  "company_checks",
] as const;

function buildUserPrompt(jd: string, profile: Profile): string {
  return `CANDIDATE PROFILE:
- Based in: ${profile.location}
- Work authorization: ${profile.work_auth}
- Timezone: ${profile.timezone}

JOB DESCRIPTION:
---
${jd}
---

Return only the JSON object described in the system prompt.`;
}

function extractJson(text: string): unknown {
  if (!text) throw new Error("Empty response from model.");

  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fence) return JSON.parse(fence[1]);

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(text.slice(start, end + 1));
  }

  throw new Error(`Could not extract JSON: ${text.slice(0, 200)}...`);
}

function validate(obj: unknown): AnalysisResult {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("Model response is not an object.");
  }
  const record = obj as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) throw new Error(`Missing key: ${key}`);
  }
  return obj as AnalysisResult;
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}


export async function analyzeJob(
  jdText: string,
  profile: Profile
): Promise<AnalysisResult> {
  if (jdText.trim().length < 100) {
    throw new Error("Job description is too short. Paste the full posting.");
  }

  const prompt = buildUserPrompt(jdText, profile);
  const providers: Array<[string, (p: string) => Promise<string>]> = [
  ["Groq", callGroq],
 ];
  const errors: string[] = [];

  for (const [name, fn] of providers) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw = await fn(prompt);
        return validate(extractJson(raw));
      } catch (err) {
        errors.push(`${name} attempt ${attempt}: ${String(err)}`);
        if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw new Error("All providers failed:\n" + errors.join("\n"));
}