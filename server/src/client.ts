import express = require('express')
import timersp = require('timers/promises')
import sse = require('better-sse')

import { server } from "./server.js";
import NBedrock from './bedrock.js';
import NInterpreter, { NInterpreterConfig } from './interpreter.js';

server.get('/', (req, res) => res.redirect('/app'))
server.use('/app', express.static('../client/app', { index: 'main.html' }))

server.get('/client/data', (req, res) => {
    const { consoleLogList, entitiesInitProps, eventListeners, eventLogList, processConsoleLogList, states, systemRuns, worldInitProps, worldProps } = NInterpreter
    const { consoleLogLimit, eventListenersLogLimit, processConsoleLogLimit, eventListenersAutoclearThreshold, systemRunsAutoclearThreshold } = NInterpreterConfig
    const { pid = 0, exitCode, signalCode, killed } = NBedrock.childProcess

    const d: NodeBedrock.GetData = {
        bedrock: {
            pid, exitCode, signalCode, killed,
            consoleLog: processConsoleLogList
        },

        script: {
            consoleLog: consoleLogList,
            eventLog: eventLogList,
            systemRuns: Array.from(systemRuns.values()),
            eventListeners: {
                world: {
                    before: Array.from(eventListeners.world.before, ([k, v]) => [k, Array.from(v.values())]),
                    after: Array.from(eventListeners.world.after, ([k, v]) => [k, Array.from(v.values())])
                },
                system: {
                    before: Array.from(eventListeners.system.before, ([k, v]) => [k, Array.from(v.values())]),
                    after: Array.from(eventListeners.system.after, ([k, v]) => [k, Array.from(v.values())])
                }
            },
            propertyRegistry: {
                world: worldInitProps,
                entities: entitiesInitProps
            },
            worldProperties: worldProps,
            states: states
        },

        limits: {
            consoleLog: consoleLogLimit,
            eventListeners: eventListenersLogLimit,
            eventLog: eventListenersAutoclearThreshold,
            eventListenerLog: eventListenersLogLimit,
            processConsoleLog: processConsoleLogLimit,
            systemRuns: systemRunsAutoclearThreshold
        }
    }

    res.json(d)
})

server.post('/client/send',
    express.raw({ type: () => true }),

    (req, res) => {
        NBedrock.send(req.body)
        res.end()
    }
)

server.post('/client/send_data/:name',
    express.json({ type: 'application/json' }),
    
    (req, res) => {
        if (req.header('content-type') !== 'application/json') return res.status(415).end()

        NBedrock.sendScriptData(req.params.name as any, req.body)
        res.end()
    }
)

server.post('/client/kill', (req, res) => {
    NBedrock.childProcess.kill()
    res.end()
})

server.post('/client/send_eval',
    express.json({ type: 'application/json' }),
    
    async (req, res) => {
        if (req.header('content-type') !== 'application/json') return res.status(415).end()

        const { script, keepOutput } = req.body
        res.status(200)

        const data = await NBedrock.sendEval(script, keepOutput)
        res.send(data).end()
    }
)


const ssech = sse.createChannel()
server.get('/listen', async (req, res) => ssech.register(await sse.createSession(req, res)))

NBedrock.events.addListener('data', v => ssech.broadcast(v, 'data'))
NBedrock.events.addListener('line', v => { if (!v.silent) ssech.broadcast(v, 'line') })
NBedrock.events.addListener('runtime_stats', v => ssech.broadcast(v, 'runtime_stats'))
NBedrock.events.addListener('exit', v => ssech.broadcast(v, 'exit'))

NBedrock.bedrockEvents.once('ready', async () => {
    while(true) {
        if (ssech.sessionCount) {
            NBedrock.send('script watchdog exportstats')
            const data = await new Promise<NodeBedrock.Events['runtime_stats']>(res => NBedrock.events.once('runtime_stats', res))
            ssech.broadcast(data)
        }

        await timersp.setTimeout(1000)
    }
})
