export const CAPTURE_PLAINTEXT_LIMIT_BYTES = 1_048_576
export const E2EE_MARKER = '__e2ee__'

const ID_PATTERN = /^[a-z0-9]{15}$/
const KDF_CONTEXT = 'aurora-clipper-capture-v1'

function b64encode(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of input) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function b64decode(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function toArrayBuffer(bytes) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function assertId(value, error = 'CAPTURE_ID_INVALID') {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new Error(error)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertEncryptedCiphertext(ciphertext) {
  if (typeof ciphertext !== 'string' || !ciphertext.startsWith(E2EE_MARKER)) throw new Error('CAPTURE_ENCRYPTION_REQUIRED')
  try {
    const blob = JSON.parse(ciphertext.slice(E2EE_MARKER.length))
    const iv = typeof blob.iv === 'string' ? b64decode(blob.iv) : null
    const ct = typeof blob.ct === 'string' ? b64decode(blob.ct) : null
    if (!isRecord(blob) || blob.v !== 2 || !iv || iv.length !== 12 || !ct || ct.length < 16) throw new Error()
  } catch {
    throw new Error('CAPTURE_ENCRYPTION_REQUIRED')
  }
}

export function validateCapturePayload(value) {
  if (!isRecord(value) || value.version !== 1) throw new Error('CAPTURE_PAYLOAD_INVALID')
  assertId(value.captureId)
  assertId(value.objectId)
  if (value.objectType !== 'bookmark' && value.objectType !== 'page') throw new Error('CAPTURE_OBJECT_TYPE_INVALID')
  if (typeof value.title !== 'string') throw new Error('CAPTURE_TITLE_INVALID')
  if (typeof value.sourceUrl !== 'string') throw new Error('CAPTURE_URL_INVALID')
  try {
    const url = new URL(value.sourceUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error('CAPTURE_URL_INVALID')
  }
  if (value.description !== null && typeof value.description !== 'string') throw new Error('CAPTURE_DESCRIPTION_INVALID')
  if (value.inbox !== true) throw new Error('CAPTURE_INBOX_INVALID')
  if (value.content !== null && (!isRecord(value.content) || value.content.type !== 'doc')) throw new Error('CAPTURE_CONTENT_INVALID')
  if (typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt)) || new Date(value.capturedAt).toISOString() !== value.capturedAt) throw new Error('CAPTURE_TIMESTAMP_INVALID')
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > CAPTURE_PLAINTEXT_LIMIT_BYTES) throw new Error('CAPTURE_TOO_LARGE')
  return value
}

function validateContext(context) {
  assertId(context.workspaceId)
  assertId(context.captureId)
  assertId(context.clientId)
  if (!Number.isSafeInteger(context.generation) || context.generation < 1) throw new Error('CAPTURE_GENERATION_INVALID')
  if (context.version !== 1) throw new Error('CAPTURE_VERSION_UNSUPPORTED')
}

export function captureEnvelopeAad(context) {
  validateContext(context)
  return `${context.workspaceId}|clipper-capture|${context.captureId}|${context.clientId}|${context.generation}|v${context.version}`
}

const X25519_PKCS8_PREFIX = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20])

function x25519Pkcs8(raw) {
  const result = new Uint8Array(X25519_PKCS8_PREFIX.length + raw.length)
  result.set(X25519_PKCS8_PREFIX)
  result.set(raw, X25519_PKCS8_PREFIX.length)
  return result
}

async function generateKeypair() {
  const pair = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  return { publicKey: b64encode(publicKey), privateKey: b64encode(privateKey.slice(-32)) }
}

async function sharedSecret(privateKey, publicKey) {
  const importedPrivate = await crypto.subtle.importKey('pkcs8', toArrayBuffer(x25519Pkcs8(b64decode(privateKey))), { name: 'X25519' }, false, ['deriveBits'])
  const importedPublic = await crypto.subtle.importKey('raw', toArrayBuffer(b64decode(publicKey)), { name: 'X25519' }, false, [])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'X25519', public: importedPublic }, importedPrivate, 256))
}

async function deriveKey(secret) {
  const base = await crypto.subtle.importKey('raw', toArrayBuffer(secret), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new ArrayBuffer(0), info: new TextEncoder().encode(KDF_CONTEXT) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptString(value, key, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: new TextEncoder().encode(aad) },
    key,
    toArrayBuffer(new TextEncoder().encode(value)),
  )
  return E2EE_MARKER + JSON.stringify({ v: 2, iv: b64encode(iv), ct: b64encode(ciphertext) })
}

async function decryptString(ciphertext, key, aad) {
  assertEncryptedCiphertext(ciphertext)
  const blob = JSON.parse(ciphertext.slice(E2EE_MARKER.length))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(b64decode(blob.iv)), additionalData: new TextEncoder().encode(aad) },
    key,
    toArrayBuffer(b64decode(blob.ct)),
  )
  return new TextDecoder().decode(plaintext)
}

export async function sealCapturePayload(payload, recipientPublicKey, context) {
  const valid = validateCapturePayload(payload)
  if (valid.captureId !== context.captureId) throw new Error('CAPTURE_CONTEXT_MISMATCH')
  const ephemeral = await generateKeypair()
  const key = await deriveKey(await sharedSecret(ephemeral.privateKey, recipientPublicKey))
  return { version: 1, ephemeralPublicKey: ephemeral.publicKey, ciphertext: await encryptString(JSON.stringify(valid), key, captureEnvelopeAad(context)) }
}

export async function openCaptureEnvelope(envelope, recipientPrivateKey, context) {
  if (!envelope || envelope.version !== 1) throw new Error('CAPTURE_VERSION_UNSUPPORTED')
  const key = await deriveKey(await sharedSecret(recipientPrivateKey, envelope.ephemeralPublicKey))
  const payload = validateCapturePayload(JSON.parse(await decryptString(envelope.ciphertext, key, captureEnvelopeAad(context))))
  if (payload.captureId !== context.captureId) throw new Error('CAPTURE_CONTEXT_MISMATCH')
  return payload
}
