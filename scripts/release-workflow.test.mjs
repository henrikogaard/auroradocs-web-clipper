import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('release workflow publishes and mirrors the dynamically versioned clipper ZIP', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

  assert.match(workflow, /ASSET_NAME="auroradocs-web-clipper-\$\{PACKAGE_VERSION\}\.zip"/)
  assert.match(workflow, /gh release create "\$GITHUB_REF_NAME" "\$ASSET_PATH" --generate-notes/)
  assert.match(workflow, /mirror-downloads:/)
  assert.match(workflow, /environment:\s*\n\s+name: production/)
  assert.match(workflow, /AURORA_DOWNLOADS_SSH_PRIVATE_KEY/)
  assert.match(workflow, /AURORA_DOWNLOADS_KNOWN_HOSTS/)
  assert.match(workflow, /gh release download "\$GITHUB_REF_NAME" --repo "\$GITHUB_REPOSITORY" --pattern "\$ASSET_NAME"/)
  assert.match(workflow, /sha256sum --check/)
  assert.match(workflow, /\/var\/www\/auroradocs-downloads\/web-clipper/)
  assert.match(workflow, /tr -d '\\r'/)
  assert.match(workflow, /if \[ -e "\$release_dir" \]; then/)
  assert.match(workflow, /sha256sum "\$release_dir\/\$asset"/)
})
