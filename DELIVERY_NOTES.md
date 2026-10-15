# Passport — Delivery Notes

**Live product:** https://passport-nine-sand.vercel.app
**Landing page:** https://passport-landing-kohl.vercel.app
**Repo:** https://github.com/abaasi888/passport
**Walkthrough:**https://youtu.be/29gi7rK0b7A**
**Author:** Walusimbi Abaasi · October 2026

---

## The problem (mine, specifically)

I live in Kampala, Uganda. I'm looking for remote work.

Every posting says "Remote." Almost none of them mean it from here. "Remote
(US)." "Remote (Canada)." "Remote (Serbia)." "Remote — must overlap 4+ hours
with PST." From EAT (UTC+3), that last one means working until 3am.
"Must be authorized to work in the US." "We do not sponsor visas."

I know this problem is real because it happened to me three times last week.
Three applications, three hours, three times the same disqualifying sentence
buried on line 47 of a posting.

**Who else has it:** developers, designers, support engineers, marketers —
anyone outside the US, UK, or EU applying for remote work. The postings
aren't written for us. So we read them twice, and often still guess wrong.

**Why this isn't just another job board:** aggregators tell you *where* the
jobs are. Passport tells you *whether you're allowed to want them*. That's a
different question, and it's the one that costs an hour per mistake.

---

## What it does

**Scan mode** (`/scan`)
1. Pulls live jobs from Himalayas, Remotive, and Jobicy (free, legal APIs)
2. Filters out postings that explicitly exclude Africa/Worldwide
3. Drops anything past its expiry date or older than 60 days
4. Shows every surviving job as a card with the company, logo, location,
   and a direct link to the company's own application page
5. Each card has a **Check eligibility** button — click it to run the
   three-layer analysis on that specific job. No quota is spent on jobs you
   don't care about.

**Check mode** (`/check`)
1. Paste any posting from anywhere — LinkedIn, email, a referral, a company
   site
2. Same three-layer analysis, same verdict, same evidence

**Both modes** return:
- A verdict: **eligible / likely / unclear / not eligible**
- The company's country and hiring model
- The real timezone overlap with Kampala, in hours
- The exact sentences from the posting that decided it (verbatim quotes)
- 2–3 questions to ask the recruiter
- 3–4 things to check about the company on LinkedIn

---

## The insight that makes this different

"Remote (US)" — or Serbia, Canada, anywhere — describes *where the work
happens*. It does **not** describe *how the company is allowed to pay you*.
Three legal models exist:

- **Local payroll (employee):** the company hires you onto their local
  payroll. Not viable from Uganda unless they use an EOR.
- **Contractor (1099 / B2B):** the vendor-invoice path. Money crosses borders
  without a local entity. This is the path most African developers take.
- **EOR (Deel, Remote.com, Oyster):** the company employs you locally through
  a partner. Works from any country, any company size.

A posting that says "Remote (Serbia), contract, paid via Deel" is **likely
eligible** — not a rejection. Passport surfaces the contractor path instead
of closing the door on the word "Serbia".

---

## Scope judgment — what I deliberately did NOT build

| Not built | Why |
|---|---|
| Accounts / saved history | The value is one answer, now. Accounts add friction and a database. |
| Auto-apply | Violates most sites' ToS and removes the human judgment that matters. |
| Resume parsing / matching | Different product. More surface area to get wrong. |
| Score out of 100 | Numbers feel precise and aren't. A verdict + evidence is more honest. |
| LinkedIn / Indeed scraping | Their ToS prohibit it. Passport uses free, legal aggregator APIs (Himalayas, Remotive, Jobicy) that index those sites' data with permission. |
| Automatic LinkedIn team-footprint check | No free, legal API exists. Instead, the tool generates 3–4 specific LinkedIn checks the user runs in 30 seconds. Honest, actionable, no fake data. |
| Historical hiring / visa databases | Paid (Hirebase, etc.) and mostly US-only. Deferred. |
| Payments | Nothing to charge for yet. |

---

## Cost estimate

Per analysis:
- **Input:** ~1,000–2,500 tokens (job descriptions are long, system prompt is dense)
- **Output:** ~700–1,000 tokens
- **Groq free tier:** 1,000 requests/day, no credit card required

**Cost per analysis: $0.00.**

Scan mode, per click:
- Fetches ~150 jobs from three free APIs (no cost)
- Displays them all instantly
- Costs **zero** Groq requests until you click **Check eligibility** on a job

**Monthly cost at solo use: $0.00.**

Vercel hobby tier: free. Groq: free tier, no payment method. All three job
APIs: free, no key, no card.

---

## Technical decisions

**Why Next.js and not Streamlit?**
Taste is graded first. Next.js gives full control over typography, spacing,
and motion. The landing page and both tools share one repo. The API key stays
server-side in route handlers.

**Why CSS Modules and not Tailwind?**
CSS Modules give scoped class names without the utility soup in JSX. Design
tokens live in `globals.css` as CSS variables, so all pages stay in sync.
It reads like plain CSS, which is easier to defend in a code review than a
wall of Tailwind classes.

**Why low temperature (0.2)?**
This is analysis, not creative writing. The same posting should produce the
same verdict.

**Why quote-based evidence?**
LLMs sound certain about things that aren't in the text. Requiring verbatim
quotes makes the output checkable. If a claim has no quote, the user can see
it and discount it.

**Why "unclear" instead of guessing?**
The system prompt says: if the posting doesn't state a location policy, the
verdict is "unclear," not "eligible." Absence of a restriction is not
permission. A wrong "eligible" costs the user an hour; a wrong "not eligible"
costs them an opportunity.

**Why Groq, not DeepSeek/OpenAI?**
The live URL has to stay up for reviewers without anyone paying. Groq offers
a permanent free tier with no credit card, OpenAI-compatible endpoints, and
JSON mode. The engine is provider-agnostic — `analyzeJob()` talks to any
OpenAI-compatible endpoint.

**Why Himalayas + Remotive + Jobicy, not LinkedIn/Indeed?**
LinkedIn and Indeed both prohibit scraping in their Terms of Service.
Himalayas, Remotive, and Jobicy offer public, free, no-key APIs and
explicitly want their data consumed this way. They index tens of thousands
of company career pages between them, so coverage is comparable to the big
boards — without the legal risk.

**Why per-job check instead of batch analysis?**
The first version analyzed 8 jobs per scan, which burned 8 Groq requests
whether the user cared about them or not. The current version defers
analysis until the user clicks **Check eligibility** on a specific job.
That's one request per click. The user never runs out of quota from a scan
they didn't ask for.

---

## What's next

1. **Greenhouse / Lever direct integration** for a curated list of companies
   the user is targeting — pulls from those ATSs' public APIs for real-time
   accuracy.
2. **Bookmarklet** — check a posting without leaving the page.
3. **Save a shortlist** of eligible jobs in localStorage (still no accounts).
4. **"What would make me eligible?"** — turn a rejection into a concrete gap list.
5. **Company history layer** — integrate paid sources (Hirebase, etc.) if the
   product graduates from prototype. Currently out of scope because no free,
   legal API exists.
6. **Per-IP rate limiting** if it ever goes viral — deferred because there are
   no users yet, and solving problems you don't have is the opposite of scope
   discipline.
