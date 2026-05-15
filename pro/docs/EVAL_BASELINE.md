# RevAssist Pro Eval Baseline

This report captures the deterministic regression baseline for the RevAssist Pro deal-analysis workflow. It is designed to be readable in GitHub while still mapping directly to the CI eval gate.

## Summary

- Source: Deterministic mock resolver
- Refresh command: `npm run eval:report`
- Pass rate: 5/5
- Average score: 100
- Lowest score: 100
- Result: PASS

## Case Coverage

| Case | Minimum | Score | Result | Category coverage |
| --- | ---: | ---: | --- | --- |
| yamaha-first-time-sportbike | 88 | 100 | PASS | Routing 10/10; Schema 15/15; Summary 15/15; Add-ons 25/25; Compliance 25/25; SMS 10/10 |
| polaris-family-trade | 88 | 100 | PASS | Routing 10/10; Schema 15/15; Summary 15/15; Add-ons 25/25; Compliance 25/25; SMS 10/10 |
| seadoo-zero-down-long-term | 88 | 100 | PASS | Routing 10/10; Schema 15/15; Summary 15/15; Add-ons 25/25; Compliance 25/25; SMS 10/10 |
| polaris-lowercase-rzr | 82 | 100 | PASS | Routing 10/10; Schema 15/15; Summary 15/15; Add-ons 25/25; Compliance 25/25; SMS 10/10 |
| watercraft-without-brand | 82 | 100 | PASS | Routing 10/10; Schema 15/15; Summary 15/15; Add-ons 25/25; Compliance 25/25; SMS 10/10 |

## Open Risks

- No failing checks in the deterministic baseline.

## Interview Notes

- The eval suite guards the behaviors most likely to regress when prompts, routing rules, or models change: profile routing, schema validity, sales relevance, compliance coverage, and SMS usefulness.
- The deterministic baseline is intentionally separate from future live-model snapshots so local development and CI stay stable without provider credentials.
- A production rollout should add live-model snapshots per provider/model and compare them against this baseline before changing prompts or model routing.
