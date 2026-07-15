import { sealCapturePayload } from './captureEnvelope.js'

const CREDENTIALS_KEY = 'clipperCredentials'
const AUTHORIZATIONS_KEY = 'clipperAuthorizations'
const SETTINGS_KEY = 'clipperSettings'
const RETRY_KEY = 'clipperRetryCaptures'
const RETRY_PAYLOAD_KEY = 'clipperRetryPayloadKey'

function b64encode(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function b64decode(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function toArrayBuffer(bytes) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null
}

function validEnvelope(value) {
  const item = record(value)
  return item && item.version === 1 && typeof item.ephemeralPublicKey === 'string' && typeof item.ciphertext === 'string'
}

function validContext(value) {
  const item = record(value)
  return item && typeof item.apiUrl === 'string' && typeof item.workspaceId === 'string' && typeof item.clientId === 'string' && typeof item.captureId === 'string' && Number.isSafeInteger(item.generation) && item.generation > 0
}

function sanitize(value) {
  if (!record(value) || !validContext(value.context) || !validEnvelope(value.envelope)) return null
  return {
    context: { apiUrl: value.context.apiUrl, workspaceId: value.context.workspaceId, clientId: value.context.clientId, captureId: value.context.captureId, generation: value.context.generation },
    envelope: { version: 1, ephemeralPublicKey: value.envelope.ephemeralPublicKey, ciphertext: value.envelope.ciphertext },
    receipt: typeof value.receipt === 'string' ? value.receipt : null,
    payloadCiphertext: typeof value.payloadCiphertext === 'string' ? value.payloadCiphertext : undefined,
  }
}

async function retryKey(storage) {
  const current = await storage.get([RETRY_PAYLOAD_KEY])
  if (typeof current[RETRY_PAYLOAD_KEY] === 'string') return crypto.subtle.importKey('raw', toArrayBuffer(b64decode(current[RETRY_PAYLOAD_KEY])), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  await storage.set({ [RETRY_PAYLOAD_KEY]: b64encode(new Uint8Array(await crypto.subtle.exportKey('raw', key))) })
  return key
}

async function encryptRetry(storage, payload, context) {
  const key = await retryKey(storage)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aad = new TextEncoder().encode(`${context.workspaceId}|${context.captureId}`)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) }, key, toArrayBuffer(new TextEncoder().encode(JSON.stringify(payload))))
  return `${b64encode(iv)}.${b64encode(new Uint8Array(ciphertext))}`
}

async function decryptRetry(storage, ciphertext, context) {
  const key = await retryKey(storage)
  const [ivValue, ciphertextValue] = String(ciphertext).split('.', 2)
  if (!ivValue || !ciphertextValue) throw new Error('CLIPPER_RETRY_PAYLOAD_INVALID')
  const aad = new TextEncoder().encode(`${context.workspaceId}|${context.captureId}`)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(b64decode(ivValue)), additionalData: toArrayBuffer(aad) }, key, toArrayBuffer(b64decode(ciphertextValue)))
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export function createClipperState({ storage }) {
  return {
    async completePairing(exchange) {
      if (!exchange?.authorization?.clientId || !exchange.authorization.workspaceId) throw new Error('CLIPPER_PAIRING_INVALID')
      if (!String(exchange.accessToken).startsWith('aur_clip_a_') || !String(exchange.refreshToken).startsWith('aur_clip_r_')) throw new Error('CLIPPER_CREDENTIALS_INVALID')
      await storage.remove('session')
      const credentials = { clientId: exchange.authorization.clientId, accessToken: exchange.accessToken, refreshToken: exchange.refreshToken }
      const current = await storage.get([AUTHORIZATIONS_KEY])
      const authorizations = record(current[AUTHORIZATIONS_KEY]) || {}
      await storage.set({ [CREDENTIALS_KEY]: credentials, [SETTINGS_KEY]: { apiUrl: exchange.apiUrl, deviceId: exchange.deviceId || null, deviceLabel: exchange.deviceLabel || null }, [AUTHORIZATIONS_KEY]: { ...authorizations, [exchange.authorization.workspaceId]: { workspaceId: exchange.authorization.workspaceId, captureKey: exchange.captureKey, limits: exchange.limits } } })
      return credentials
    },
    saveCredentials(credentials) {
      return storage.set({ [CREDENTIALS_KEY]: credentials })
    },
    async savePreparedCapture({ context, envelope, receipt = null, plaintext }) {
      if (!validContext(context) || !validEnvelope(envelope)) throw new Error('CLIPPER_CAPTURE_INVALID')
      const current = await storage.get([RETRY_KEY])
      const previous = Array.isArray(current[RETRY_KEY]) ? current[RETRY_KEY].map(sanitize).filter(Boolean) : []
      const prepared = { context: { ...context }, envelope: { ...envelope }, receipt, ...(plaintext === undefined ? {} : { payloadCiphertext: await encryptRetry(storage, plaintext, context) }) }
      await storage.set({ [RETRY_KEY]: [...previous.filter((item) => item.context.captureId !== context.captureId), prepared].slice(-50) })
      return prepared
    },
    openPreparedPayload(prepared) {
      if (!prepared?.payloadCiphertext) throw new Error('CLIPPER_RETRY_PAYLOAD_UNAVAILABLE')
      return decryptRetry(storage, prepared.payloadCiphertext, prepared.context)
    },
    async getPreparedCaptures() {
      const current = await storage.get([RETRY_KEY])
      return Array.isArray(current[RETRY_KEY]) ? current[RETRY_KEY].map(sanitize).filter(Boolean) : []
    },
    async clearPreparedCapture(captureId) {
      if (!captureId) return
      const captures = await this.getPreparedCaptures()
      await storage.set({ [RETRY_KEY]: captures.filter((item) => item.context.captureId !== captureId) })
    },
  }
}

export async function prepareEncryptedCapture({ state, payload, recipientPublicKey, context, receipt = null }) {
  const envelope = await sealCapturePayload(payload, recipientPublicKey, context)
  return state.savePreparedCapture({ context, envelope, receipt })
}
