import express = require('express')
import sse = require('better-sse')
import timersp = require('timers/promises')
import { bedrock, bedrockStorage } from '../main.js'

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

server.get('/session/bedrock', async (req, res) => {
    const str = await bedrockStorage.readBedrockLog()
    str.pipe(res)
})

server.get('/session/script/:type', async (req, res) => {
    const str = await bedrockStorage.readEventsLog(req.params.type)
    if (!str) return res.status(204).end()

    str.pipe(res)
})

server.get('/process', (req, res) => {
    const proc = bedrock.process

    res.send({
        pid: proc.pid,

        killed: proc.killed,
        exitCode: proc.exitCode,
        exitSignal: proc.signalCode,

        sessionID: bedrock.sessionID,
        scriptSessionID: bedrock.scriptSessionID
    }).end()
})

server.post('/session/send', express.raw({ type: () => true }), (req, res) => {
    bedrock.send(req.body)
    res.end()
})

server.post('/session/kill', (req, res) => {
    bedrock.process.kill()
    res.end()
})

server.post('/session/sendeval', express.text({ type: () => true }), async (req, res) => {
    res.status(200)
    
    const data = await bedrock.sendEval(req.body)
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

server.use('/app', express.static('../client/app', { index: 'main.html' }))

export { port }
