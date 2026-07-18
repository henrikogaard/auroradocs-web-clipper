import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldStopPairingPoll } from './popupState.js'

const futureExpiry = '2026-07-18T15:00:00.000Z'
const now = Date.parse('2026-07-18T14:00:00.000Z')

test('keeps polling when AuroraCloud reports an unapproved pairing as unavailable', () => {
  assert.equal(shouldStopPairingPoll({ status: 410 }, futureExpiry, now), false)
})

test('stops polling for malformed or unauthorized pairing requests', () => {
  assert.equal(shouldStopPairingPoll({ status: 400 }, futureExpiry, now), true)
  assert.equal(shouldStopPairingPoll({ status: 403 }, futureExpiry, now), true)
})

test('stops polling once the local pairing expiry has passed', () => {
  assert.equal(shouldStopPairingPoll({ status: 410 }, futureExpiry, Date.parse(futureExpiry)), true)
})
