import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const projectRoot = fileURLToPath(new URL('..', import.meta.url))

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

test('release package contains only public extension files', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

  await execFileAsync(process.execPath, ['scripts/package.mjs'], { cwd: projectRoot })

  const archivePath = `dist/auroradocs-web-clipper-${pkg.version}.zip`
  const archiveUrl = new URL(`../${archivePath}`, import.meta.url)
  const { stdout } = await execFileAsync('unzip', ['-Z1', archivePath], { cwd: projectRoot })
  const entries = stdout.trim().split('\n').sort()
  const firstHash = sha256(await readFile(archiveUrl))

  assert.deepEqual(entries, [
    'LICENSE',
    'NOTICE',
    'README.md',
    'manifest.json',
    'src/auth.js',
    'src/background.js',
    'src/popup.html',
    'src/popup.js',
    'src/tiptapHtml.js',
  ])

  await new Promise((resolve) => setTimeout(resolve, 2200))
  await execFileAsync(process.execPath, ['scripts/package.mjs'], { cwd: projectRoot })
  const secondHash = sha256(await readFile(archiveUrl))

  assert.equal(secondHash, firstHash)
})
