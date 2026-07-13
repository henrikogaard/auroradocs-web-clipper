import {
  DEFAULT_API_URL,
  createRecordWithSession,
  normalizeApiUrl,
  requestEmailCode,
  signIn,
  verifyMfa,
} from './auth.js'
import { htmlToBlocks } from './tiptapHtml.js'

const form = {
  apiUrl: document.querySelector('#apiUrl'),
  workspaceId: document.querySelector('#workspaceId'),
  signedOutPanel: document.querySelector('#signedOutPanel'),
  signedInPanel: document.querySelector('#signedInPanel'),
  signedInAs: document.querySelector('#signedInAs'),
  email: document.querySelector('#email'),
  password: document.querySelector('#password'),
  signIn: document.querySelector('#signIn'),
  signOut: document.querySelector('#signOut'),
  mfaPanel: document.querySelector('#mfaPanel'),
  mfaHint: document.querySelector('#mfaHint'),
  mfaMethod: document.querySelector('#mfaMethod'),
  mfaCode: document.querySelector('#mfaCode'),
  verifyMfa: document.querySelector('#verifyMfa'),
  requestEmailCode: document.querySelector('#requestEmailCode'),
  cancelMfa: document.querySelector('#cancelMfa'),
  clipPage: document.querySelector('#clipPage'),
  clipSelection: document.querySelector('#clipSelection'),
  status: document.querySelector('#status'),
}

let currentSession = null
let pendingMfa = null
let busy = false

function setStatus(message, kind = 'info') {
  form.status.textContent = message
  form.status.style.color = kind === 'error' ? '#fca5a5' : kind === 'success' ? '#86efac' : '#c8c0b7'
}

function setBusy(nextBusy) {
  busy = nextBusy
  render()
}

function setVisible(element, visible) {
  element.classList.toggle('hidden', !visible)
}

function render() {
  const signedIn = Boolean(currentSession?.accessToken && currentSession?.refreshToken)
  const awaitingMfa = Boolean(pendingMfa?.mfaId)
  setVisible(form.signedOutPanel, !signedIn && !awaitingMfa)
  setVisible(form.mfaPanel, awaitingMfa)
  setVisible(form.signedInPanel, signedIn && !awaitingMfa)
  form.clipPage.disabled = busy || !signedIn || awaitingMfa
  form.clipSelection.disabled = busy || !signedIn || awaitingMfa
  form.signIn.disabled = busy
  form.signOut.disabled = busy
  form.verifyMfa.disabled = busy || !awaitingMfa
  form.requestEmailCode.disabled = busy || !awaitingMfa || !pendingMfa?.methods?.includes('email_otp')
  form.cancelMfa.disabled = busy
  form.signedInAs.textContent = displayUser(currentSession?.user)
  renderMfaChallenge()
}

function renderMfaChallenge() {
  if (!pendingMfa?.mfaId) return
  const methods = pendingMfa.methods?.length ? pendingMfa.methods : ['email_otp']
  const selectedMethod = methods.includes(pendingMfa.preferredMethod) ? pendingMfa.preferredMethod : methods[0]
  form.mfaMethod.replaceChildren(...methods.map((method) => {
    const option = document.createElement('option')
    option.value = method
    option.textContent = method === 'totp' ? 'Authenticator app' : 'Email code'
    option.selected = method === selectedMethod
    return option
  }))
  form.mfaHint.textContent = selectedMethod === 'totp'
    ? 'Enter the authenticator code for your AuroraDocs account, or request an email code.'
    : 'Enter the AuroraDocs sign-in code sent to your email.'
}

function displayUser(user) {
  return user?.email || user?.displayName || user?.name || 'AuroraDocs'
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    apiUrl: DEFAULT_API_URL,
    workspaceId: '',
    token: '',
  })
  form.apiUrl.value = normalizeApiUrl(settings.apiUrl)
  form.workspaceId.value = settings.workspaceId
  if (settings.token) {
    await chrome.storage.sync.remove('token')
    setStatus('Legacy auth token cleared. Sign in once to create a refreshable clipper session.')
  }

  const local = await chrome.storage.local.get({ session: null })
  currentSession = normalizeStoredSession(local.session)
  render()
}

async function readSettings({ requireWorkspace = false } = {}) {
  const settings = {
    apiUrl: normalizeApiUrl(form.apiUrl.value),
    workspaceId: form.workspaceId.value.trim(),
  }
  form.apiUrl.value = settings.apiUrl
  await chrome.storage.sync.set(settings)
  if (requireWorkspace && !settings.workspaceId) {
    throw new Error('Workspace ID is required.')
  }
  return settings
}

function normalizeStoredSession(session) {
  if (!session || typeof session.accessToken !== 'string' || typeof session.refreshToken !== 'string') {
    return null
  }
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user ?? null,
  }
}

async function saveSession(session) {
  currentSession = session
  await chrome.storage.local.set({ session })
  render()
}

async function clearSession() {
  currentSession = null
  pendingMfa = null
  await chrome.storage.local.remove('session')
  render()
}

async function handleSignIn() {
  try {
    setBusy(true)
    setStatus('Signing in...')
    const settings = await readSettings()
    const email = form.email.value.trim()
    const password = form.password.value
    if (!email || !password) {
      throw new Error('Email and password are required.')
    }

    const result = await signIn({
      apiUrl: settings.apiUrl,
      email,
      password,
    })
    form.password.value = ''
    if (result.status === 'mfa_required') {
      pendingMfa = result.challenge
      setStatus('Multi-factor authentication required.')
      render()
      form.mfaCode.focus()
      return
    }

    await saveSession(result.session)
    setStatus('Signed in to AuroraDocs.', 'success')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    setBusy(false)
  }
}

async function handleRequestEmailCode() {
  if (!pendingMfa?.mfaId) return
  try {
    setBusy(true)
    setStatus('Sending email code...')
    const settings = await readSettings()
    pendingMfa = {
      ...pendingMfa,
      ...await requestEmailCode({
        apiUrl: settings.apiUrl,
        email: pendingMfa.email || form.email.value.trim(),
        mfaId: pendingMfa.mfaId,
      }),
    }
    setStatus('Email code sent.', 'success')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    setBusy(false)
  }
}

async function handleVerifyMfa() {
  if (!pendingMfa?.mfaId) return
  try {
    setBusy(true)
    setStatus('Verifying code...')
    const settings = await readSettings()
    let method = form.mfaMethod.value || pendingMfa.preferredMethod
    if (method === 'email_otp' && !pendingMfa.otpId) {
      pendingMfa = {
        ...pendingMfa,
        ...await requestEmailCode({
          apiUrl: settings.apiUrl,
          email: pendingMfa.email || form.email.value.trim(),
          mfaId: pendingMfa.mfaId,
        }),
      }
      method = 'email_otp'
    }
    const session = await verifyMfa({
      apiUrl: settings.apiUrl,
      mfaId: pendingMfa.mfaId,
      otpId: pendingMfa.otpId,
      method,
      code: form.mfaCode.value.trim(),
    })
    pendingMfa = null
    form.mfaCode.value = ''
    await saveSession(session)
    setStatus('Signed in to AuroraDocs.', 'success')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    setBusy(false)
  }
}

async function captureActivePage() {
  const response = await chrome.runtime.sendMessage({ type: 'AURORA_CAPTURE_ACTIVE_TAB' })
  if (!response?.ok) throw new Error(response?.error || 'Could not inspect the current tab.')
  return response.page
}

async function auroraCreate(settings, collection, body) {
  const result = await createRecordWithSession({
    apiUrl: settings.apiUrl,
    session: currentSession,
    collection,
    body,
  })
  if (
    result.session.accessToken !== currentSession?.accessToken
    || result.session.refreshToken !== currentSession?.refreshToken
  ) {
    await saveSession(result.session)
  }
  return result.record
}

async function setProperty(settings, objectId, key, valueType, values) {
  return auroraCreate(settings, 'object_properties', {
    object_id: objectId,
    key,
    value_type: valueType,
    ...values,
  })
}

function selectionContent(page) {
  const quote = page.selection.trim()
  const quoteContent = htmlToBlocks(page.selectionHtml, page.url)
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: page.title || 'Web clip' }],
      },
      {
        type: 'blockquote',
        content: quoteContent.length > 0
          ? quoteContent
          : [{ type: 'paragraph', content: [{ type: 'text', text: quote }] }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Source: ' },
          {
            type: 'text',
            text: page.url,
            marks: [{ type: 'link', attrs: { href: page.url, target: '_blank' } }],
          },
        ],
      },
    ],
  }
}

async function clip(mode) {
  try {
    setBusy(true)
    setStatus('Capturing...')
    if (!currentSession) {
      throw new Error('Sign in to AuroraDocs before clipping.')
    }
    const settings = await readSettings({ requireWorkspace: true })
    const page = await captureActivePage()
    if (mode === 'selection' && !page.selection?.trim()) {
      throw new Error('Select text on the page before using Clip selection.')
    }

    setStatus('Saving to AuroraDocs...')
    const object = await auroraCreate(settings, 'objects', {
      workspace_id: settings.workspaceId,
      type: mode === 'page' ? 'bookmark' : 'page',
      title: page.title || page.url,
      icon: null,
      is_deleted: false,
      is_template: false,
      format_version: 1,
    })

    await setProperty(settings, object.id, 'inbox', 'boolean', { value_bool: true })
    await setProperty(settings, object.id, 'source_url', 'url', { value_text: page.url })
    if (page.description) {
      await setProperty(settings, object.id, 'description', 'text', { value_text: page.description })
    }
    if (mode === 'selection') {
      await auroraCreate(settings, 'content', {
        object_id: object.id,
        content_json: selectionContent(page),
      })
    }

    setStatus('Saved to AuroraDocs Inbox.', 'success')
  } catch (error) {
    if (error?.status === 401) {
      await clearSession()
    }
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    setBusy(false)
  }
}

form.signIn.addEventListener('click', handleSignIn)
form.signOut.addEventListener('click', async () => {
  await clearSession()
  setStatus('Signed out of the clipper.')
})
form.requestEmailCode.addEventListener('click', handleRequestEmailCode)
form.verifyMfa.addEventListener('click', handleVerifyMfa)
form.cancelMfa.addEventListener('click', () => {
  pendingMfa = null
  form.mfaCode.value = ''
  setStatus('Sign-in cancelled.')
  render()
})
form.mfaMethod.addEventListener('change', () => {
  if (pendingMfa) pendingMfa.preferredMethod = form.mfaMethod.value
  renderMfaChallenge()
})
form.clipPage.addEventListener('click', () => clip('page'))
form.clipSelection.addEventListener('click', () => clip('selection'))

loadSettings().catch((error) => setStatus(error.message, 'error'))
