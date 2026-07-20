export async function ensureHostPermission(apiUrl, permissions = globalThis.chrome?.permissions) {
  if (!permissions) {
    throw new Error('chrome.permissions API is not available.')
  }

  let origin
  try {
    origin = new URL(apiUrl).origin
  } catch {
    throw new Error('Enter a valid http(s) API URL.')
  }

  if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
    throw new Error('Enter a valid http(s) API URL.')
  }

  const origins = [`${origin}/*`]

  const granted = await permissions.contains({ origins })
  if (granted) {
    return true
  }

  return permissions.request({ origins })
}
