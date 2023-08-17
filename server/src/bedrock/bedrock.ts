import cp = require('child_process')
import crypto = require('crypto')
import fsp = require('fs/promises')
import rl = require('readline')
import path = require('path')
import stream = require('stream')
import timersp = require('timers/promises')
import TypedEventEmitter from '../lib/typedevm.js'

export default class NodeBedrock {
    constructor(dir: string) {
        this.process = cp.spawn(dir, {
            cwd: path.resolve(path.parse(dir).dir),
            shell: false,
            detached: true,
            env: {
                'LD_LIBRARY_PATH': '.'
            }
        })
        this.process.unref()
        this.process.once('exit', (code, sig) => this.events.emit('exit', { code, signal: sig }))
        process.once('exit', () => this.send('stop'))

        const rlint = rl.createInterface(this.process.stdout as stream.Readable)
        rlint.on('line', raw => {
            let rawMatch: RegExpMatchArray | null
            if (rawMatch = raw.match(/\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}:\d{3}) ([A-Z]+)\] (.*)/)) { // known
                const [, date = '', time = '', level = '', line = ''] = rawMatch
                let lineMatch: RegExpMatchArray | null

                // bedrock event
                if (lineMatch = line.match(/\{\{(\w*):(\w+)\}\}(.*)/)) {
                    const [, id = '', name = '', datastr = ''] = lineMatch
                    const data = JSON.parse(datastr === 'undefined' ? 'null' : datastr)

                    // special case: ready
                    if (id === '' && name === 'ready') {
                        const connId = crypto.randomBytes(8).toString('hex')
                        this.sendData('conn_id', connId)
                    }

                    //@ts-ignore
                    this.events.emit('data', { name, data })
                    //@ts-ignore
                    this.bedrockEvents.emit(name, data)
                }

                // script event send
                else if (lineMatch = line.match(/Script event debug:\w+ has been sent/)) {}

                // script stats receive
                else if (lineMatch = line.match(/Script stats saved to '(.*)'/)) {
                    const [, loc = ''] = lineMatch

                    fsp.readFile(loc).then(
                        buf => {
                            this.events.emit('runtime_stats', JSON.parse(buf.toString()))
                            fsp.rm(loc, { force: true })
                        },
                        () => {}
                    )
                }

                // bedrock normal line
                else  {
                    this.events.emit('line', {
                        level: logLevelEnum[level] ?? 'log',
                        date,
                        time,
                        line,
                        raw
                    })
                }
            } else if (raw) { // unknown
                this.events.emit('line', {
                    level: 'unknown',
                    raw
                })
            }
        })
    }

    readonly process: cp.ChildProcess

    readonly events = new TypedEventEmitter<Bedrock.ProcessEvents>()
    readonly bedrockEvents = new TypedEventEmitter<Bedrock.Events>()

    send(text: Buffer | Uint8Array | string) {
        this.process.stdin?.write(text)
        this.process.stdin?.write('\r\n')
    }

    sendData<K extends keyof Bedrock.Messages>(name: K, data: Bedrock.Messages[K]) {
        const str = JSON.stringify(data)
        const buf = new TextEncoder().encode(str)

        if (buf.length < 2048) {
            this.send(`scriptevent debug:${name} ${str}`)
        } else {
            const stream = this.createDataStream(name)
            stream.write(buf)
            stream.end()
        }
    }

    createDataStream(event: keyof Bedrock.Messages, id = crypto.randomBytes(8).toString('hex')) {
        this.send(`scriptevent debug:buf_start ${JSON.stringify(id)}`)

        return new stream.Writable({
            write: async (chunk: Buffer, encoding, cb) => {
                for (let i = 0; i < chunk.length; i += 880) {
                    this.send(`scriptevent debug:buf_write ${JSON.stringify({ id, chunkhex: chunk.subarray(i, i + 880).toString('hex')} )}`)
                    await timersp.setTimeout(100)
                }
                cb()
            },
            final: (cb) => {
                this.send(`scriptevent debug:buf_end ${JSON.stringify({ id, event })}`)
                cb()
            },
            destroy: (err, cb) => {
                this.send(`scriptevent debug:buf_cancel ${JSON.stringify(id)}`)
                cb(err)
            },

            highWaterMark: 440
        })
    }
}

const logLevelEnum: Record<string, LogLevel> = {
    LOG: 'log',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
}
Object.setPrototypeOf(logLevelEnum, null)
