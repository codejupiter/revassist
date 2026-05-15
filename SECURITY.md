# Security Policy

RevAssist is a portfolio project that demonstrates AI workflow architecture for powersports dealership F&I teams. The public demo and RevAssist Pro deployment use synthetic sample data only.

## Supported Versions

| Surface | Status |
| --- | --- |
| RevAssist browser demo | Maintained for portfolio demonstration |
| RevAssist Pro `0.1.x` | Maintained for portfolio demonstration |

## Reporting A Vulnerability

Please email security-sensitive reports to info@zoriahcocio.com.

Include:

- A short summary of the issue.
- The affected URL, route, or file path.
- Reproduction steps.
- Impact and any suggested remediation.

Do not include real customer financial data, raw secrets, access tokens, or private dealership records in the report.

## Security Design Notes

- Public demo mode runs without API keys or real customer data.
- RevAssist Pro uses server-owned session claims for dealership/operator identity.
- Deal APIs do not trust client-submitted tenant identity.
- Rate limiting includes dealership, operator, and client IP dimensions.
- Structured logs avoid raw deal notes.
- Provider-backed live AI remains disabled until live eval and provider setup gates are complete.
