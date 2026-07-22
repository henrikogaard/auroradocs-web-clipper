export async function ensureHostPermission(apiUrl, permissions = globalThis.chrome?.permissions) {
  if (!permissions) {
    throw new Error('chrome.permissions API is not available.')
  }

  let url
  try {
    url = new URL(apiUrl)
  } catch {
    throw new Error('Enter a valid http(s) API URL.')
  }

  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost)) {
    throw new Error('Self-hosted APIs must use HTTPS. Only http://localhost and http://127.0.0.1 are allowed for development.')
  }

  // Chrome match patterns do not accept ports. Omitting the port also makes
  // localhost patterns match every development port.
  const origin = `${url.protocol}//${url.hostname}`
  const origins = [`${origin}/*`]

  // Request before any await so Chrome can associate the optional permission
  // prompt with the user's click gesture. Requesting an already-granted
  // origin resolves true without displaying another prompt.
  return permissions.request({ origins })
}
