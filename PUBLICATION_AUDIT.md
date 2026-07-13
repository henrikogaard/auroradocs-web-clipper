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
| Automated tests | Pass: 12 passed, 0 failed |
| Manifest validation | Pass |

No raw scanner findings, personal author metadata, private repository paths,
private issue references, or private source identifiers are included in this
report.

## Deferred tracking

Project tracking updates were deferred because the GitHub GraphQL quota was
exhausted at audit time. No partial project-status or issue-label mutation was
attempted after that failure.
