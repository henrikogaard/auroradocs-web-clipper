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
    /valid http\(s\) API URL/,
  )
})
