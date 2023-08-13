import stream = require('stream')

export function createTempWriteStream(prm: Promise<stream.Writable>) {
    const tmp = new stream.PassThrough()

    prm.then(str => {
        tmp.end()
        tmp.pipe(str, { end: false })
    })
    
    return tmp
}
