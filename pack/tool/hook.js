const fs = require('fs')
const path = require('path')

let dir = process.argv.slice(2).join(' ')
if (!dir) throw new Error('hook requires a directory argument')
if (dir[0] === '"' && dir.at(-1) === '"') dir = dir.slice(1, -1)

console.time('hooked')

console.log('getting pack uuid & version...')
const packdata = JSON.parse(fs.readFileSync('pack/manifest.json').toString())
const { uuid: packuuid, version } = packdata.header

console.log('reading server.properties...')
const serverProperties = fs.readFileSync(path.join(dir, 'server.properties')).toString()
const levelName = serverProperties.match(/^level-name=(.*)/m)?.[1]

console.log(`listing pack to world's behavior packs...`)
const packsDir = path.join(dir, 'worlds', levelName, 'world_behavior_packs.json')
const packs = JSON.parse(fs.readFileSync(packsDir).toString())
const packsNew = packs.filter(v => v.pack_id !== packuuid).concat([{ pack_id: packuuid, version }])
fs.writeFileSync(packsDir, JSON.stringify(packsNew))

console.log(`adding pack to development behavior packs...`)
const devDir = path.join(dir, 'development_behavior_packs', packuuid)
fs.rmSync(devDir, { force: true, recursive: true })
fs.cpSync('pack', devDir, { recursive: true, force: true })

console.timeEnd('hooked')
