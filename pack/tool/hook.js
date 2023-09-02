const fs = require('fs')
const path = require('path')

let dir = process.argv.slice(2).join(' ')
if (!dir) throw new Error('hook requires a directory argument')
if (dir[0] === '"' && dir.at(-1) === '"') dir = dir.slice(1, -1)

dir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), '..', dir)

console.time('hooked')

/* ----- ----- ----- ----- */ console.log('getting pack uuid & version...')

// reads pack manifest & parse
const packdata = JSON.parse(fs.readFileSync('pack/manifest.json').toString())
// gets pack uuid & version
const { uuid: packuuid, version } = packdata.header

/* ----- ----- ----- ----- */ console.log('reading server.properties...')

// reads server properties
const serverProperties = fs.readFileSync(path.join(dir, 'server.properties')).toString()
// gets level-name config
const levelName = serverProperties.match(/^level-name=(.*)/m)?.[1]

/* ----- ----- ----- ----- */ console.log('listing pack to world\'s behavior packs...')

// directory for bds world's behavior pack list (world_behavior_packs.json)
const packsDir = path.join(dir, 'worlds', levelName, 'world_behavior_packs.json')

// read bds world's behavior pack list
const packs = JSON.parse(fs.readFileSync(packsDir).toString())
// add pack to bds world's behavior pack list
const packsNew = packs.filter(v => v.pack_id !== packuuid).concat([{ pack_id: packuuid, version }])
// write bds world's behavior pack list
fs.writeFileSync(packsDir, JSON.stringify(packsNew))

/* ----- ----- ----- ----- */ console.log('adding pack to development behavior packs...')

// directory for bds development behavior packs (development_behavior_packs)
const devDir = path.join(dir, 'development_behavior_packs', packuuid)

// remove if exist
fs.rmSync(devDir, { force: true, recursive: true })
// copy pack to bds development behavior packs
fs.cpSync('pack', devDir, { recursive: true, force: true })

/* ----- ----- ----- ----- */ console.log('allowing modules...')

// diretory for bds pack configs
const confDir = path.join(dir, 'config', packuuid)

// make dir
fs.mkdirSync(confDir, { force: true, recursive: true })
// write
fs.writeFileSync(path.join(confDir, 'permissions.json'), JSON.stringify({
    allowed_modules: [
        "@minecraft/server",
        "@minecraft/server-gametest",
        "@minecraft/server-ui",
        "@minecraft/server-net",
        "@minecraft/server-admin",
    ]
}))

console.timeEnd('hooked')
