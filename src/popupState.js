export function derivePopupState({ session, scopedCredentials, pairing, authorization, busy = false }) {
  if (busy) return { kind: 'busy', encrypted: Boolean(authorization?.captureKey) }
  if (pairing) return { kind: 'approve', encrypted: false }
  if (scopedCredentials?.accessToken && authorization?.captureKey?.publicKey) return { kind: 'ready', encrypted: true }
  if (session?.accessToken && session?.refreshToken) return { kind: 'connect', encrypted: false }
  return { kind: 'connect', encrypted: false }
}

export function encryptedCaptureSuccessMessage() {
  return 'Encrypted clip queued. It will appear after AuroraDocs unlocks this workspace.'
}
