import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const requiredPermissions = new Set(['activeTab', 'scripting', 'storage'])

const broadHostPatterns = new Set(['<all_urls>', '*://*/*', 'https://*/*', 'http://*/*', '*://*/'])

export async function validateManifest({ manifest, packageVersion }) {
  for (const permission of requiredPermissions) {
    if (!manifest.permissions?.includes(permission)) {
      throw new Error(`manifest.json is missing permission: ${permission}`)
    }
  }

  if (manifest.manifest_version !== 3) {
    throw new Error('AuroraDocs Web Clipper must stay on Manifest V3')
  }

  if (manifest.version !== packageVersion) {
    throw new Error(`manifest.json version ${manifest.version} does not match package.json version ${packageVersion}`)
  }

  if (!manifest.action?.default_popup) {
    throw new Error('manifest.json must define action.default_popup')
  }

  if (!manifest.background?.service_worker) {
    throw new Error('manifest.json must define background.service_worker')
  }

  const requiredHosts = manifest.host_permissions ?? []
  const broadRequired = requiredHosts.find((host) => broadHostPatterns.has(host))
  if (broadRequired) {
    throw new Error(`AuroraDocs Web Clipper must not request broad host access (${broadRequired})`)
  }

  if (!manifest.optional_host_permissions?.includes('https://*/*')) {
    throw new Error('manifest.json must declare optional_host_permissions containing "https://*/*"')
  }

  await readFile(new URL(`../${manifest.action.default_popup}`, import.meta.url), 'utf8')
  await readFile(new URL(`../${manifest.background.service_worker}`, import.meta.url), 'utf8')
}

async function main() {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'))
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

  await validateManifest({ manifest, packageVersion: pkg.version })

  console.log('AuroraDocs Web Clipper manifest is valid.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
