# RevAssist

**An AI co-pilot for powersports dealership F&I teams.**

Drop in raw deal notes, get back a structured deal summary, suggested F&I add-ons, compliance flags, and a ready-to-send customer follow-up SMS — streamed token-by-token in seconds.

---

## Why this exists

Powersports F&I managers spend hours every week retyping the same customer info into lender portals, hand-writing follow-up texts, and remembering which add-ons make sense for which customer profile. RevAssist collapses that work into one structured AI response.

It's a focused exploration of what AI-augmented internal tooling looks like inside the modern dealership stack — built for the people who actually close deals, not for the marketing team.

## What it does

Given a deal description like:

> *"Customer wants a 2024 Yamaha YZF-R1, \$2k down, 60-month term, 720 FICO. First-time sportbike buyer, no trade-in."*

RevAssist returns a schema-locked JSON response containing:

- **Deal summary** — 2–3 sentence plain-English recap
- **Suggested add-ons** — 3 F&I products tailored to the customer profile, with rationale and price ranges
- **Compliance flags** — items to verify (info / warn / block severity)
- **Customer follow-up SMS** — a warm, professional 1–2 sentence text ready to copy and send

All four sections render progressively as the response streams in.

## Stack

- **React 18** with hooks
- **Anthropic Claude API** for structured JSON generation
- **Tailwind CSS** for styling
- **Lucide React** for iconography
- **Token-streaming UX** with partial-JSON parsing as content arrives

## Architecture notes

- **Schema-locked output**: the system prompt forces the model to return strict JSON. The frontend parses the stream incrementally and renders each section as soon as it's structurally valid.
- **Optimistic partial render**: as tokens arrive, an attempt to parse runs on every chunk. The first valid parse swaps the raw stream view for the structured render.
- **Latency surfaced**: response time and token count are exposed in the UI for transparency.
- **Three sample deals included** for fast demo / testing.

## What's next

- Real SSE streaming via the \`stream: true\` API parameter
- Persistent deal history with Postgres
- DMS / credit-bureau integrations to pre-fill from a real lead
- Voice input for the deal desk

---

Built by [Zoriah Cocio](https://github.com/codejupiter) — info@zoriahcocio.com
