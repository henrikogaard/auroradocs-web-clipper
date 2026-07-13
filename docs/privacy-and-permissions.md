# Privacy and permissions

AuroraDocs Web Clipper captures content only when you open the extension and
choose a capture action. It does not run continuous page collection and does
not include telemetry or analytics.

## Browser permissions

| Permission | Why it is required |
| --- | --- |
| `activeTab` | Gives temporary access to the active page after you invoke the extension. |
| `scripting` | Runs the capture script in that user-invoked active page to read its title, URL, description, and selected content. |
| `storage` | Stores connection settings and the signed-in extension session in browser-managed extension storage. |
| `<all_urls>` | Allows capture on user-selected web pages and network requests to the production or a user-configured/self-hosted API target. This is broad host access, but capture still occurs only when you invoke the clipper. |

The `activeTab` and `scripting` permissions inspect only the active page in
response to a user-invoked clip action. The extension does not inspect other
tabs in the background. Browser-protected pages may reject capture even though
the extension declares `<all_urls>`.

## Data stored in the browser

- `chrome.storage.sync` stores the API URL and Workspace ID so those connection
  settings can follow the browser profile where extension sync is enabled.
- `chrome.storage.local` stores the refreshable AuroraDocs session, including
  its access and refresh tokens and basic signed-in user information. It stays
  in browser-managed local extension storage and is used to authenticate and
  renew the interactive clipper session.
- The email and password entered during sign-in are sent to the configured API
  for authentication; they are not saved in extension storage.

The clipper's interactive browser session is separate from AuroraDocs MCP
authentication. MCP tokens are not used by the Web Clipper.

## Data sent when clipping

When you choose **Clip page** or **Clip selection**, the extension reads the
active page's title, URL, description, and current selection. It sends the
fields required for the selected capture to the configured API and Workspace
ID to create an Inbox object. Selection capture may include basic HTML
formatting and resolved links from the selected content.

Review the active page and selection before clipping confidential information.
A self-hosted API URL is controlled by its operator, whose privacy and retention
terms apply to data sent there.

## Sign-out, uninstall, and server data

- **Sign out** deletes the AuroraDocs session from `chrome.storage.local`. It
  does not delete the API URL or Workspace ID from `chrome.storage.sync`.
- **Uninstall** removes the extension and clears its `chrome.storage.local`
  data from that browser profile, including the session. Because connection
  settings use browser sync, they may already exist in another synced browser
  profile; remove the extension there as well if needed.
- Neither action deletes clips already stored in AuroraDocs. Manage those
  records and account data through AuroraDocs or the relevant workspace
  administrator.

AuroraDocs Web Clipper contains no telemetry, analytics, advertising SDK, or
background browsing-history collection.
