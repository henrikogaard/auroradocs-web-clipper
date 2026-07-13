# Troubleshooting

## The extension will not load

- Extract the release archive before selecting **Load unpacked**.
- Select the folder that directly contains `manifest.json`.
- Confirm Developer mode is enabled at `chrome://extensions`.
- If the browser reports a manifest error, download a fresh release archive and
  extract it to a new folder.

## Sign-in fails

- Confirm the API URL is correct. The production service is
  `https://api.auroradocs.eu`.
- Confirm the email and password belong to an AuroraDocs account, not an MCP
  integration. MCP tokens cannot sign in to the Web Clipper.
- If MFA is required, enter the current authenticator code or request an email
  code and check the account's inbox.
- For a self-hosted service, confirm the service is reachable from the browser
  and permits the extension's requests.

## A clip is not saved

- Confirm the Workspace ID belongs to an AuroraCloud or compatible self-hosted
  workspace that the signed-in account can access. Browser-only and Local
  folders workspaces are unsupported.
- Sign out and sign in again if the session is no longer valid.
- Keep the source page active until the success or error message appears.
- Browser settings pages, extension pages, web-store pages, and other protected
  URLs may block extension scripts. Try a normal `https://` page.
- To clip a selection, highlight the content before opening the extension.

## Settings or sign-in state changed

The API URL and Workspace ID use `chrome.storage.sync`, while the AuroraDocs
session uses `chrome.storage.local`. Browser profile changes, extension sync
settings, clearing site/extension data, or reinstalling the extension can
therefore affect them differently.

## Request support

For reproducible non-sensitive defects, open a GitHub issue and include the Web
Clipper version, browser version, expected result, observed result, and sanitized
reproduction steps. Never include credentials, MFA codes, session values,
workspace contents, or production user data.

Report suspected security vulnerabilities privately according to
[SECURITY.md](../SECURITY.md).
