# AuroraDocs Web Clipper

Manifest V3 browser extension for capturing the active browser tab into AuroraDocs.

## Local install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select `apps/clipper`.
4. Open the extension popup and enter:
   - AuroraCloud API URL, for example `https://api.auroradocs.eu`
   - Workspace ID
   - your AuroraDocs email and password
5. Complete MFA in the popup if your account requires it.

The clipper stores its AuroraDocs session in browser-extension local storage and
uses the AuroraCloud refresh token to renew expired access tokens while clipping.
It no longer requires copying a short-lived bearer token from a separate API
login response.

## What it captures

- **Clip page** creates a `bookmark` object, marks it as Inbox, and stores `source_url`.
- **Clip selection** creates a `page` object with the current selection as a quote, marks it as Inbox, and stores `source_url`. The selected quote preserves basic formatting such as bold text, links, and ordered/unordered lists. Relative links inside the selection are resolved against the clipped page URL before they are saved.

This is the first production slice. Store packaging, screenshot capture, richer article extraction, and Firefox/Safari variants are intentionally follow-up work.
