import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('package and manifest versions are both the standalone 0.1.0 release', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'))
  assert.equal(pkg.version, '0.1.0')
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

test('public release surfaces use the standalone 0.1.0 archive name', async () => {
  const expectedArchive = 'auroradocs-web-clipper-0.1.0.zip'
  const bugTemplate = await readFile(new URL('../.github/ISSUE_TEMPLATE/bug.yml', import.meta.url), 'utf8')
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  const ciWorkflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const releaseWorkflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

  assert.doesNotMatch(bugTemplate, /0\.9\.2/)
  assert.match(readme, new RegExp(expectedArchive.replaceAll('.', '\\.')))
  assert.match(ciWorkflow, new RegExp(expectedArchive.replaceAll('.', '\\.')))
  assert.match(releaseWorkflow, new RegExp(expectedArchive.replaceAll('.', '\\.')))
})
