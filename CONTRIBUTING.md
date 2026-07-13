# Contributing

Thank you for helping improve AuroraDocs Web Clipper.

## Before you start

- Search existing issues before opening a new one.
- Use a public issue for non-sensitive bugs and proposals.
- Follow [SECURITY.md](SECURITY.md) for suspected vulnerabilities.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

## Development

1. Fork and clone the repository.
2. Install the supported Node.js and pnpm versions for your environment.
3. Run `pnpm install --frozen-lockfile`.
4. Create a focused branch and make the smallest complete change.
5. Add or update tests for behavior changes.
6. Run `pnpm check` before opening a pull request.

`pnpm check` runs the test suite, validates the extension manifest, and builds
the release archive. Keep generated `dist/` artifacts out of pull requests.

## Test data and privacy

Use clearly synthetic values in tests, fixtures, screenshots, logs, and issue
reports. Never include real credentials, tokens, MFA codes, private keys,
workspace contents, or production user data. Do not test against another
person's workspace or account.

## Pull requests

Keep pull requests focused. Explain the user-visible effect, identify the
verification performed, and call out skipped checks or known limitations.
Documentation must be updated when installation, permissions, storage,
authentication, support, or capture behavior changes.

By submitting a contribution, you agree that it is licensed under the Apache
License 2.0 according to this repository's [LICENSE](LICENSE).
