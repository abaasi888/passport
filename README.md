# Passport

Paste a posting, or scan remote jobs from around the world. Passport reads
the advert, the company's hiring model, and the timezone math — and tells you
whether the company can hire you in Uganda.

## Live URLs

- **App:** https://passport-nine-sand.vercel.app
- **Repo:**  https://github.com/abaasi888/passport

## Two modes, one engine

- **Scan** (`/scan`) — pulls live jobs from Himalayas, Remotive, Jobicy; filters
  for companies that can hire from Uganda; links straight to the company's own
  application page.
- **Check** (`/check`) — paste any posting from anywhere (LinkedIn, email,
  referral) and get the same verdict.

Both call the same `analyzeJob()` engine. Same three layers. Same evidence.

## The three-layer analysis

1. **Layer 1 — What the advert says.** Explicit location and classification signals.
2. **Layer 2 — Company signals.** Language patterns, EOR mentions, industry defaults.
3. **Layer 3 — Employment classification.** Local payroll (employee), contractor (1099/B2B), or EOR (Deel/Remote.com).

The insight: "Remote (US)" — or Serbia, or Canada — describes *where the work
happens*, not *how the company pays you*. A "Remote (Serbia), contractor" posting
is often open to African contractors. Passport surfaces that instead of closing
the door.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Pure CSS Modules (no Tailwind)
- **AI:** Groq `openai/gpt-oss-120b` (primary, free), Cerebras (fallback, free)
- **Job sources:** Himalayas, Remotive, Jobicy (all free, no key)
- **Deploy:** Vercel

## Local setup

```bash
git clone https://github.com/YOUR-USERNAME/passport.git
cd passport
npm install
cp .env.local.example .env.local   # add your free Groq + Cerebras keys
npm run dev
