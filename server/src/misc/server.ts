import express = require('express')
import sse = require('better-sse')
import timersp = require('timers/promises')
import { bedrock, bedrockInterpreter } from '../main.js'

const server = express()

let port = 7070
const portArg = process.argv[3] || ''
if (portArg) {
    const portNew = +portArg

    if (isNaN(portNew)) console.warn('Port is not a number, ignoring')
    if (portNew < 0 || portNew > 65535) console.warn('Port is not within 0-65535, ignoring')

    port = portNew
}

server.listen(port, () => console.log(`server started on port ${port}`))

server.get('/', (req, res) => res.redirect('/app'))
server.use('/app', express.static('../client/app', { index: 'main.html' }))

server.get('/data', async (req, res) => {
    const { bdsConsoleLog, consoleLog, eventLog, eventListeners, systemRuns, propertyRegistry, worldProperties } = bedrockInterpreter
    const { pid = -1, killed, exitCode, signalCode } = bedrock.process

    const regAwaited = await propertyRegistry.promise

    const data: NodeBedrockInterpreter.GetData = {
        pid,
        killed,
        exitCode,
        signalCode,

        consoleLog: bdsConsoleLog,

        script: {
            consoleLog,
            eventLog,
            eventListeners: {
                world: {
                    after: Array.from(eventListeners.world.after, ([k, v]) => [k, Array.from(v.list.values())]),
                    before: Array.from(eventListeners.world.before, ([k, v]) => [k, Array.from(v.list.values())]),
                },
                system: {
                    after: Array.from(eventListeners.system.after, ([k, v]) => [k, Array.from(v.list.values())]),
                    before: Array.from(eventListeners.system.before, ([k, v]) => [k, Array.from(v.list.values())]),
                }
            },
            systemRuns: Array.from(systemRuns.values()),
            propertyRegistry: regAwaited,
            worldProperties
        }
    }

    res.send(data).end()
})

server.post('/send', express.raw({ type: () => true }), (req, res) => {
    bedrock.send(req.body)
    res.end()
})

server.post('/kill', (req, res) => {
    bedrock.process.kill()
    res.end()
})

server.post('/sendeval', express.text({ type: () => true }), async (req, res) => {
    res.status(200)
    
    const data = await bedrockInterpreter.sendEval(req.body)
    res.send(data).end()
})

const ssech = sse.createChannel()
server.get('/listen', async (req, res) => ssech.register(await sse.createSession(req, res)))

bedrock.events.addListener('data', v => ssech.broadcast(v, 'data'))
bedrock.events.addListener('line', v => ssech.broadcast(v, 'line'))
bedrock.events.addListener('runtime_stats', v => ssech.broadcast(v, 'runtime_stats'))
bedrock.events.addListener('exit', v => ssech.broadcast(v, 'exit'))

bedrock.bedrockEvents.once('ready', async () => {
    while(true) {
        if (ssech.sessionCount) {
            bedrock.send('script watchdog exportstats')
            const data = await new Promise<Bedrock.ProcessEvents['runtime_stats']>(res => bedrock.events.once('runtime_stats', res))
            ssech.broadcast(data)
        }

        await timersp.setTimeout(1000)
    }
})

export { port }
