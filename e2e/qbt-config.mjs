// Writes a qBittorrent.conf for end-to-end tests: known WebUI credentials and Torvia as the
// alternative WebUI. Usage: node e2e/qbt-config.mjs <profile-dir> <webui-root-inside-container>
// Password hash format (qBittorrent ≥ 4.2): @ByteArray(base64(salt):base64(PBKDF2-HMAC-SHA512, 100000 iters, 64 bytes)).
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const E2E_USER = 'admin'
export const E2E_PASSWORD = 'torvia-e2e-password' // test-only container, never a real credential

const [profile, root = '/torvia'] = process.argv.slice(2)
if (!profile) throw new Error('Usage: node e2e/qbt-config.mjs <profile-dir> [webui-root]')
const salt = randomBytes(16)
const key = pbkdf2Sync(E2E_PASSWORD, salt, 100_000, 64, 'sha512')
const dir = join(profile, 'qBittorrent', 'config')
mkdirSync(dir, { recursive: true })
writeFileSync(
  join(dir, 'qBittorrent.conf'),
  `[LegalNotice]
Accepted=true

[BitTorrent]
Session\\DefaultSavePath=/downloads
Session\\QueueingSystemEnabled=true

[Preferences]
WebUI\\Port=8080
WebUI\\Username=${E2E_USER}
WebUI\\Password_PBKDF2="@ByteArray(${salt.toString('base64')}:${key.toString('base64')})"
WebUI\\AlternativeUIEnabled=true
WebUI\\RootFolder=${root}
WebUI\\LocalHostAuth=true
WebUI\\HostHeaderValidation=false
`,
)
console.log(`Wrote ${join(dir, 'qBittorrent.conf')}`)
