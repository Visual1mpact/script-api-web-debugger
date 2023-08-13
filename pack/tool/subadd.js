const fs = require('fs')
const path = require('path')

let dir = process.argv.slice(2).join(' ')
if (!dir) throw new Error('hook requires a directory argument')
if (dir[0] === '"' && dir.at(-1) === '"') dir = dir.slice(1, -1)

console.time('added')

console.log('getting pack script entry file...')
const packdata = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')).toString())
const entry = packdata.modules.find(v => v.type === 'script')?.entry
if (!entry) throw new Error('X unable to find script entry file. Is this a resource pack / a behavior pack that does not use scripts?')

console.log('copying files...')
const subscriptPath = path.join('pack', 'subpacks', 'subscript')
fs.rmSync(subscriptPath, { recursive: true, force: true })
fs.mkdirSync(subscriptPath, { recursive: true })
fs.cpSync(dir, subscriptPath, { recursive: true, force: true })
fs.rmSync(path.join(subscriptPath, 'manifest.json'), { force: true })
fs.rmSync(path.join(subscriptPath, 'pack_icon.png'), { force: true })

console.log('overriding entry file...')
const debHookPath = path.join(subscriptPath, 'scripts', 'debug_hook')
fs.mkdirSync(debHookPath, { recursive: true })
fs.writeFileSync(path.join(debHookPath, 'drop.js'), `import "../${entry.substring(8)}"`)

console.timeEnd('added')
