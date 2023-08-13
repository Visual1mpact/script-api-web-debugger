const child_process = require('child_process')
const config = require('./packages.json')
const fsp = require('fs/promises')
const path = require('path')

/**
 * Creates a new child process and execute a command
 * @param {string} cmd Command
 * @returns {Promise<string>}
 */
function run(cmd) {
    return new Promise( (res, rej) => child_process.exec(cmd, (err, stdo) => err ? rej(err) : res(stdo) ) )
}

/**
 * Pads the string if input `str` is not empty
 * @param {string} str String input
 * @param {string} start Pad start
 * @param {string} end Pad end
 * @returns 
 */
function padIf(str, start = '', end = '') {
    return str ? start + str + end : ''
}

/**
 * @param {string} module Module name
 * @param {string | object} data Module data
 */
function package(module, data) {
    return module + padIf( typeof data === 'string' ? data + '.' + config.minecraft_version : data.version + padIf(data.minecraft_version_override ?? config.minecraft_version, '.'), '@')
}

/**
 * @param {Record<string, string> | [name: string, data: string | object][]} list Package list
 */
function packages(list) {
    list = Array.isArray(list) ? list : Object.entries(list)
    return list.map( ([m, d]) => package(m, d) ).join(' ')
}

/**
 * 
 * @param {string} dir 
 * @returns 
 */
function folder(dir) {
    const data = path.parse(dir)
    return data.dir
}

const packageArr = Object.entries(config.packages)

const packageDev = packages( packageArr.filter( ([, data]) => typeof data === 'string' || data.mode === 'npm-dev' ) )
const packageSave = packages( packageArr.filter( ([, data]) => typeof data !== 'string' && data.mode === 'npm' ) )
const packageCustom = packageArr.filter( ([, data]) => typeof data !== 'string' && data.mode === 'custom' )

;(async() => {
    if (packageSave) {
        console.log('installing packages...')
        await run(`npm i ${packageSave}`)
        console.log('packages installed.')
    }
    
    if (packageDev) {
        console.log('installing dev packages...')
        await run(`npm i --save-dev ${packageDev}`)
        console.log('dev packages installed.')
    }
})()

if (packageCustom.length) (async() => {
    console.log('installing custom packages...')

    await fsp.rm('__t', { force: true, recursive: true })
    await fsp.mkdir('__t', { recursive: true })

    await run(`npm i --prefix ./__t ${packages(packageCustom)}`)

    await Promise.all(
        packageCustom.map(
            async ([module, { location, initial = '', deletes = [], renames = {} }]) => {
                const rel = `__t/node_modules/${module}/`

                // delete
                await Promise.all(
                    deletes.map(
                        v => fsp.rm(rel + v, { force: true, recursive: true })
                    )
                )

                // rename
                await Promise.all(
                    Object.entries(renames).map(
                        ([k, v]) => fsp.rename(rel + k, rel + v, { force: true, recursive: true })
                    )
                )
                
                // move
                await fsp.rm(location, { force: true, recursive: true })
                await fsp.mkdir(folder(location), { recursive: true })
                await fsp.rename(rel + initial, location)
            }
        )
    )

    await fsp.rm('__t', { force: true, recursive: true })

    console.log('custom packages installed.')
})()
