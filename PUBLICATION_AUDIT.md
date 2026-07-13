# Publication Audit

Date: 2026-07-13

## Decision

This repository uses a clean snapshot exported from the private AuroraDocs
monorepo on 2026-07-13. Earlier development occurred in that private monorepo.

The full-history candidate was rejected because its author metadata included a
non-public address without explicit publication approval. That history was not
pushed to this repository.

## Snapshot verification

The exported snapshot was initialized as a new repository. Its tree identity
was verified against the source tree before publication. The repository root
contains `README.md`, `manifest.json`, `package.json`, `scripts/`, and `src/`.

The snapshot and publication-audit commits use the verified GitHub noreply
address for the repository owner.

## Publication checks

The following checks were run against the clean snapshot history:

| Check | Result |
| --- | --- |
| Full-history secret scan | Pass: no leaks found |
| Author metadata audit | Pass: one GitHub noreply address |
| Secret-like commit-message audit | Pass: no matches |
| Secret-like path audit | Pass: no matches |
| Automated tests | Pass: 15 passed, 0 failed |
| Manifest validation | Pass |

No raw scanner findings, personal author metadata, private repository paths,
private issue references, or private source identifiers are included in this
report.

## Release-candidate validation

The deterministic release ZIP was loaded unpacked in a disposable Chromium
profile against an isolated AuroraCloud test runtime. The smoke verified popup
rendering, interactive sign-in with TOTP MFA, session refresh after an expired
access token, page capture, formatted selection capture, the Inbox flag, the
source URL property, and persisted-record readback.

Only synthetic localhost content was captured. The two temporary objects, six
properties, one content record, workspace, account, browser profile, database,
and test services were deleted or stopped after verification. A hosted staging
account was not created because invite-only registration rejected the request
before creating any data.
