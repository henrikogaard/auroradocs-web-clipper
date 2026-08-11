# Web Clipper release mirror

The release workflow has one canonical artifact: the ZIP published to the
GitHub Release for an immutable `vX.Y.Z` tag. Only after that succeeds does the
protected `mirror-downloads` job fetch the published release asset and mirror
the same SHA-256-verified bytes to:

```text
https://downloads.auroradocs.eu/web-clipper/releases/vX.Y.Z/
https://downloads.auroradocs.eu/web-clipper/latest.json
```

The workflow never replaces a versioned ZIP. A rerun accepts an existing
version directory only when its ZIP has the same verified SHA-256, then updates
`latest.json` atomically.

## One-time production setup

Create a dedicated deployment account with no sudo access and write access only
to `/var/www/auroradocs-downloads/web-clipper`. Do not reuse a broad AuroraDocs
deployment key. Pin its SSH host key and configure these secrets in this
repository's protected GitHub `production` environment:

| Secret | Value |
| --- | --- |
| `AURORA_DOWNLOADS_HOST` | AuroraDocs downloads host name or address |
| `AURORA_DOWNLOADS_USER` | Dedicated Web Clipper deploy account |
| `AURORA_DOWNLOADS_SSH_PRIVATE_KEY` | Dedicated account private key |
| `AURORA_DOWNLOADS_KNOWN_HOSTS` | Pinned SSH known-hosts entry for that host |

The deploy account needs `install`, `mv`, and limited temporary-directory
access so the workflow can stage and atomically publish one ZIP and one
manifest. It must not have sudo access or write access to the desktop download
feed.

The existing downloads vhost serves JSON with CORS enabled. Keep that behavior
for `web-clipper/latest.json`, because the marketing page reads the manifest to
select the current first-party artifact.

## Release and verification

1. Bump the public package version, commit it, and push a matching `vX.Y.Z` tag.
2. The release job runs package validation and creates the GitHub Release.
3. The protected mirror job downloads that release asset, verifies its SHA-256,
   and publishes the mirror atomically.
4. The workflow verifies `latest.json`, its CORS header, the hosted ZIP, and
   the hosted ZIP checksum before it succeeds.

If the mirror job fails, the GitHub Release remains the safe, downloadable
source of truth. Correct the protected deployment configuration and rerun the
failed workflow; do not manually overwrite an existing version directory.
