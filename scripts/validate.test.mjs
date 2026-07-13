import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('package and manifest versions match', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'))
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
