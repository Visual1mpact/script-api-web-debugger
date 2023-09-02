import crypto = require('crypto')
import cp = require('child_process')
import express = require('express')
import fsp = require('fs/promises')
import path = require('path')
import rl = require('readline')

import TypedEventEmitter from './lib/typedevm.js'
import PromiseController from './lib/promisectrl.js'
import { port, server } from './server.js'

let { BDSTARGET: _bdsTarget = '' } = process.env
_bdsTarget = _bdsTarget.slice(1, -1)
const bdsTarget = path.isAbsolute(_bdsTarget) ? _bdsTarget : path.join(process.cwd(), '..', _bdsTarget)

namespace NBedrock {
    export const bdsPath = bdsTarget
    export const childProcess = cp.spawn(bdsTarget, {
        cwd: path.resolve(path.parse(bdsTarget).dir),
        shell: false,
        detached: true,
        env: {
            'LD_LIBRARY_PATH': '.'
        }
    })

    export const events = new TypedEventEmitter<NodeBedrock.Events>()
    export const bedrockEvents = new TypedEventEmitter<Bedrock.Events>()

    export function send(text: Buffer | Uint8Array | string) {
        childProcess.stdin.write(text)
        childProcess.stdin.write('\r\n')
    }

    export async function sendEval(script: string, keepOutput = true) {
        const id = crypto.randomUUID()
        const prm = new PromiseController<Bedrock.EvalResult>()

        sendScriptData('eval', {
            id,
            script,
            keepOutput
        })

        evalPending.set(id, prm)
        return prm.promise
    }

    export function sendScriptData<K extends keyof NodeBedrock.Messages>(name: K, data: NodeBedrock.Messages[K]) {
        const str = JSON.stringify(data)
        const buf = new TextEncoder().encode(str)

        if (buf.length < 2048) send(`scriptevent debug:${name} ${str}`)
        else {
            const id = crypto.randomUUID()
            evalInputPending.set(id, { name, data })
            send(`scriptevent debug:longdata ${JSON.stringify(id)}`)
        }
    }

    // line
    const logLevelEnum: Record<string, LogLevel> = {
        LOG: 'log',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    }

    const lineInt = rl.createInterface(childProcess.stdout)
    lineInt.on('line', raw => {
        let rawMatch: RegExpMatchArray | null
        if (rawMatch = raw.match(/\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}:\d{3}) ([A-Z]+)\] (.*)/)) { // known
            const [, date = '', time = '', level = '', line = ''] = rawMatch
            let lineMatch: RegExpMatchArray | null

            // bedrock event
            if (lineMatch = line.match(/SCRIPTDATA:---(.*?)---:(.*)/)) {
                const [, name = '', datastr = ''] = lineMatch
                const data = JSON.parse(datastr === 'undefined' ? 'null' : datastr)

                // special case: ready
                if (name === 'ready')
                    NBedrock.sendScriptData('handshake', port)

                NBedrock.events.emit('data', { name, data })
                NBedrock.bedrockEvents.emit(name, data)
            }

            // script event send
            else if (lineMatch = line.match(/Script event debug:\w+ has been sent/)) {}

            // script stats receive
            else if (lineMatch = line.match(/Script stats saved to '(.*)'/)) {
                const [, loc = ''] = lineMatch

                fsp.readFile(loc).then(
                    buf => {
                        events.emit('runtime_stats', JSON.parse(buf.toString()))
                        fsp.rm(loc, { force: true })
                    },
                    () => {}
                )
            }

            // bedrock normal line
            else  {
                NBedrock.events.emit('line', {
                    level: logLevelEnum[level] ?? 'log',
                    date,
                    time,
                    line,
                    raw
                })
            }
        }
        // unknown
        else if (raw) {
            NBedrock.events.emit('line', {
                level: 'unknown',
                raw
            })
        }
    })

    // exit handle
    childProcess.unref()
    childProcess.once('exit', (code, sig) => events.emit('exit', { code, signal: sig }))

    // main exit handle
    process.once('exit', () => send('stop'))
    process.once('SIGINT', () => send('stop'))
}
export default NBedrock

const evalInputPending = new Map<string, { name: any, data: string }>()
const evalPending = new Map<string, PromiseController<Bedrock.EvalResult>>()

server.get('/bedrock/longdata/:id',
    (req, res) => {
        const data = evalInputPending.get(req.params.id)
        if (!data) return res.status(404).end()

        res.json(data)
        evalInputPending.delete(req.params.id)
    }
)

server.post('/bedrock/event/:event',
    express.json({ type: 'application/json' }),

    (req, res) => {
        if (req.header('content-type') !== 'application/json') return res.status(415).end()

        const name = req.params.event, data = req.body
        NBedrock.events.emit('data', { name, data })
        NBedrock.bedrockEvents.emit(name, data)

        res.header('Content-Type', 'text/plain')
        res.end()
    }
)

server.post('/bedrock/eval',
    express.json({ type: 'application/json' }),

    (req, res) => {
        if (req.header('content-type') !== 'application/json') return res.status(415).end()

        const data = req.body as Bedrock.EvalResult
        const prm = evalPending.get(data.id)
        if (prm) {
            evalPending.delete(data.id)
            prm.resolve(data)
        }

        res.header('Content-Type', 'text/plain')
        res.end()
    }
)
