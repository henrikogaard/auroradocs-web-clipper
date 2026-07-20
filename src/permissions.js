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

  const origins = [`${url.origin}/*`]

  const granted = await permissions.contains({ origins })
  if (granted) {
    return true
  }

  return permissions.request({ origins })
}
