# RevAssist Pro Live Eval Snapshot

No provider-backed live snapshot has been captured for this checkout.

## Status

- Result: SKIPPED
- Intended model: `openai/gpt-5.4`
- Reason: Vercel AI Gateway is authenticated, but the team must finish billing/free-credit setup before live model requests can run.

## How To Refresh

```bash
vercel env pull .env.local --yes
npm run eval:live:report
```

Use `npm run eval:live:required` when a missing provider credential should fail the command.
