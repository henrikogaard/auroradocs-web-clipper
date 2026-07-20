import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureHostPermission } from './permissions.js'

test('returns true when permission is already granted', async () => {
  let requested = false
  const permissions = {
    contains: async () => true,
    request: async () => {
      requested = true
      return true
    },
  }

  const result = await ensureHostPermission('https://example.com/v1', permissions)

  assert.equal(result, true)
  assert.equal(requested, false)
})

test('requests permission when not already granted', async () => {
  const permissions = {
    contains: async () => false,
    request: async () => true,
  }

  const result = await ensureHostPermission('https://example.com/v1', permissions)

  assert.equal(result, true)
})

test('returns false when the user denies permission', async () => {
  const permissions = {
    contains: async () => false,
    request: async () => false,
  }

  const result = await ensureHostPermission('https://example.com/v1', permissions)

  assert.equal(result, false)
})

test('requests permission for the API origin wildcard', async () => {
  const calls = []
  const permissions = {
    contains: async (payload) => {
      calls.push(['contains', payload])
      return false
    },
    request: async (payload) => {
      calls.push(['request', payload])
      return true
    },
  }

  await ensureHostPermission('https://self.example.com/api/', permissions)

  assert.deepEqual(calls, [
    ['contains', { origins: ['https://self.example.com/*'] }],
    ['request', { origins: ['https://self.example.com/*'] }],
  ])
})

test('throws when the permissions API is missing', async () => {
  await assert.rejects(
    () => ensureHostPermission('https://example.com'),
    /chrome\.permissions API is not available/,
  )
})

test('throws a clear error for a non-URL API value', async () => {
  const permissions = {
    contains: async () => true,
    request: async () => true,
  }
  await assert.rejects(
    () => ensureHostPermission('not a url', permissions),
    /valid http\(s\) API URL/,
  )
})

test('throws a clear error for a non-http(s) URL', async () => {
  const permissions = {
    contains: async () => true,
    request: async () => true,
  }
  await assert.rejects(
    () => ensureHostPermission('file:///etc/hosts', permissions),
    /must use HTTPS|valid http\(s\) API URL/,
  )
})

test('rejects non-localhost HTTP origins with a clear HTTPS-only message', async () => {
  const permissions = {
    contains: async () => true,
    request: async () => true,
  }
  await assert.rejects(
    () => ensureHostPermission('http://self-hosted.example.com', permissions),
    /must use HTTPS/,
  )
})

test('allows http://localhost for development', async () => {
  const calls = []
  const permissions = {
    contains: async (payload) => { calls.push(['contains', payload]); return false },
    request: async (payload) => { calls.push(['request', payload]); return true },
  }
  const result = await ensureHostPermission('http://localhost:3000/api', permissions)
  assert.equal(result, true)
  assert.deepEqual(calls, [
    ['contains', { origins: ['http://localhost:3000/*'] }],
    ['request', { origins: ['http://localhost:3000/*'] }],
  ])
})

test('allows http://127.0.0.1 for development', async () => {
  const permissions = {
    contains: async () => false,
    request: async () => true,
  }
  const result = await ensureHostPermission('http://127.0.0.1:8080', permissions)
  assert.equal(result, true)
})
