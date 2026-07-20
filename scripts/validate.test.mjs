import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { validateManifest } from '../scripts/validate.mjs'

test('package and manifest versions are both the standalone 0.2.1 release', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'))
  assert.equal(pkg.version, '0.2.1')
  assert.equal(manifest.version, pkg.version)
})

test('README documents public installation, authentication, and privacy behavior', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  const requiredStatements = [
    'Load unpacked',
    'https://api.auroradocs.eu',
    'Workspace ID',
    'MFA',
    'chrome.storage.local',
    'activeTab',
    'MCP tokens are not used by the Web Clipper',
  ]

  for (const statement of requiredStatements) {
    assert.match(readme, new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('dedicated setup guide covers install, connection, verification, updates, and removal', async () => {
  const [readme, setup] = await Promise.all([
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/setup.md', import.meta.url), 'utf8'),
  ])

  assert.match(readme, /\[Setup guide\]\(docs\/setup\.md\)/)
  for (const text of [
    '# Setup',
    'auroradocs-web-clipper-0.2.1.zip',
    'chrome://extensions',
    'Load unpacked',
    'https://api.auroradocs.eu',
    'Workspace ID',
    'Settings → Workspace',
    'email and password',
    'MFA',
    'Clip page',
    'Clip selection',
    'MCP tokens are not used',
    'Update the extension',
    'preserves the existing local session',
    'sign in again',
    'Uninstall',
  ]) {
    assert.ok(setup.includes(text), `docs/setup.md is missing required setup guidance: ${text}`)
  }
})

test('public release surfaces use the standalone 0.2.1 archive name', async () => {
  const expectedArchive = 'auroradocs-web-clipper-0.2.1.zip'
  const bugTemplate = await readFile(new URL('../.github/ISSUE_TEMPLATE/bug.yml', import.meta.url), 'utf8')
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  const ciWorkflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const releaseWorkflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

  assert.doesNotMatch(bugTemplate, /0\.9\.2/)
  assert.match(readme, new RegExp(expectedArchive.replaceAll('.', '\\.')))
  assert.match(ciWorkflow, new RegExp(expectedArchive.replaceAll('.', '\\.')))
  assert.match(releaseWorkflow, new RegExp(expectedArchive.replaceAll('.', '\\.')))
})

const validManifest = {
  manifest_version: 3,
  version: '0.2.1',
  action: { default_popup: 'src/popup.html' },
  background: { service_worker: 'src/background.js' },
  permissions: ['activeTab', 'scripting', 'storage'],
  host_permissions: ['https://api.auroradocs.eu/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  optional_host_permissions: ['https://*/*'],
}

test('validateManifest accepts the expected standalone release manifest', async () => {
  await validateManifest({ manifest: validManifest, packageVersion: '0.2.1' })
})

test('validateManifest rejects host_permissions containing <all_urls>', async () => {
  const manifest = { ...validManifest, host_permissions: ['<all_urls>'] }
  await assert.rejects(
    () => validateManifest({ manifest, packageVersion: '0.2.1' }),
    /must not request broad host access/,
  )
})

test('validateManifest rejects host_permissions containing https://*/*', async () => {
  const manifest = { ...validManifest, host_permissions: ['https://*/*'] }
  await assert.rejects(
    () => validateManifest({ manifest, packageVersion: '0.2.1' }),
    /must not request broad host access/,
  )
})

test('validateManifest rejects host_permissions containing *://*/*', async () => {
  const manifest = { ...validManifest, host_permissions: ['*://*/*'] }
  await assert.rejects(
    () => validateManifest({ manifest, packageVersion: '0.2.1' }),
    /must not request broad host access/,
  )
})

test('validateManifest rejects missing optional_host_permissions', async () => {
  const { optional_host_permissions, ...manifest } = validManifest
  await assert.rejects(
    () => validateManifest({ manifest, packageVersion: '0.2.1' }),
    /optional_host_permissions/,
  )
})

test('validateManifest rejects optional_host_permissions without https wildcard', async () => {
  const manifest = { ...validManifest, optional_host_permissions: ['https://api.example.com/*'] }
  await assert.rejects(
    () => validateManifest({ manifest, packageVersion: '0.2.1' }),
    /optional_host_permissions/,
  )
})
