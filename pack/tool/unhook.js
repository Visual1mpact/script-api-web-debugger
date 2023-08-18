const fs = require('fs')
const path = require('path')

let dir = process.argv.slice(2).join(' ')
if (!dir) throw new Error('unhook requires a directory argument')
if (dir[0] === '"' && dir.at(-1) === '"') dir = dir.slice(1, -1)

dir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), '..', dir)

console.time('unhooked')

console.log('getting pack uuid...')
const packdata = JSON.parse(fs.readFileSync('pack/manifest.json').toString())
const { uuid: packuuid } = packdata.header

console.log('reading server.properties...')
const serverProperties = fs.readFileSync(path.join(dir, 'server.properties')).toString()
const levelName = serverProperties.match(/^level-name=(.*)/m)?.[1]

console.log(`unlisting pack to world's behavior packs...`)
const packsDir = path.join(dir, 'worlds', levelName, 'world_behavior_packs.json')
const packs = JSON.parse(fs.readFileSync(packsDir).toString())
const packsNew = packs.filter(v => v.pack_id !== packuuid)
fs.writeFileSync(packsDir, JSON.stringify(packsNew))

console.log(`deleting pack to development behavior packs...`)
const devDir = path.join(dir, 'development_behavior_packs', packuuid)
fs.rmSync(devDir, { force: true, recursive: true })

console.timeEnd('unhooked')
