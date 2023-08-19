import crypto = require('crypto')
import NodeBedrock from "./bedrock";
import PromiseController from '../lib/promisectrl';

export default class BedrockInterpreter {
    constructor(bedrock: NodeBedrock) {
        this.bedrock = bedrock

        bedrock.events.addListener('line', ev => {
            this.bdsConsoleLog.push(ev)
            if (this.bdsConsoleLog.length > this.bdsConsoleLogLimit) this.bdsConsoleLog.shift()
        })

        bedrock.events.addListener('data', ev => {
            switch (ev.name) {
                case 'console': {
                    this.consoleLog.push(ev.data)
                    if (this.consoleLog.length > this.consoleLogLimit) this.consoleLog.shift()
                } break

                case 'event': {
                    this.eventLog.push(ev.data)
                    if (this.eventLog.length > this.eventLogLimit) this.eventLog.shift()
                } break

                case 'event_change': {
                    const { isBefore, isSystem, fid, fn, mode, stack, name, tick } = ev.data

                    // get event data & listeners
                    const events = this.eventListeners[isSystem ? 'system' : 'world'][isBefore ? 'before' : 'after']

                    let eventData = events.get(name)
                    if (!eventData) events.set(name, eventData = {
                        clearCache: new Set,
                        list: new Map
                    })

                    const listeners = eventData.list

                    // get data
                    let data = listeners.get(fid)
                    if (!data) {
                        listeners.set(fid, data = { fid, fn, logs: [], disabled: false, subscribed: true })

                        // clear
                        if (listeners.size > this.eventListenersAutoclear) {
                            for (const id of eventData.clearCache) listeners.delete(id)
                            eventData.clearCache.clear()
                        }
                    }

                    data.logs.push({ tick, mode, stack })
                    if (data.logs.length > this.eventListenersLogLimit) data.logs.shift()

                    if (mode === 'disable') data.disabled = true
                    if (mode === 'enable') data.disabled = false
                    if (mode === 'subscribe') {
                        data.subscribed = true
                        eventData.clearCache.delete(fid)
                    }
                    if (mode === 'unsubscribe') {
                        data.subscribed = false
                        eventData.clearCache.add(fid)
                    }
                } break

                case 'property_registry': {
                    this.worldProperties = {...ev.data.worldInitProperties}
                    this.propertyRegistry.resolve(ev.data)
                } break

                case 'system_run_change': {
                    const { duration, fn, id, mode, stack, tick, type } = ev.data
                    const runs = this.systemRuns

                    // get data
                    let data = runs.get(id)
                    if (!data) {
                        runs.set(id, data = { id, duration, fn, stack, tick, type, status: 'add' })

                        // autoclear
                        if (runs.size > this.systemRunsAutoclear) {
                            for (const id of this.systemRunsClearCache) runs.delete(id)
                            this.systemRunsClearCache.clear()
                        }
                    }

                    // update status
                    data.status = mode === 'resume' ? 'add': mode

                    // add to clear cache (if clear)
                    if (mode === 'clear') {
                        data.clearStack = stack
                        this.systemRunsClearCache.add(id)
                    }
                } break

                case 'ready': {
                    this.eventLog = []
                    this.eventListeners = {
                        world: { before: new Map, after: new Map },
                        system: { before: new Map, after: new Map }
                    }
                    this.systemRuns.clear()
                    this.propertyRegistry.resolve((this.propertyRegistry = new PromiseController).promise)
                    this.worldProperties = Object.create(null)
                } break

                case 'property_set': {
                    if (ev.data.type !== 'world') return
                    const { property, value } = ev.data

                    this.worldProperties[property] = value
                }
            }
        })
    }

    readonly bedrock: NodeBedrock

    bdsConsoleLogLimit = 300
    bdsConsoleLog: Bedrock.ProcessEvents['line'][] = []

    consoleLogLimit = 300
    consoleLog: Bedrock.Events['console'][] = []

    eventLogLimit = 100
    eventLog: Bedrock.Events['event'][] = []

    eventListenersLogLimit = 30
    eventListenersAutoclear = 10
    eventListeners: NodeBedrockInterpreter.EventListenerLists<
        Map<string, {
            clearCache: Set<number>,
            list: Map<number, NodeBedrockInterpreter.EventListenerData>
        }>
    > = {
        world: { before: new Map, after: new Map },
        system: { before: new Map, after: new Map }
    }

    systemRunsAutoclear = 100
    systemRunsClearCache = new Set<number>()
    systemRuns: Map<number, NodeBedrockInterpreter.SystemRunData> = new Map

    propertyRegistry = new PromiseController<Bedrock.Events['property_registry']>
    worldProperties: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)

    sendEval(script: string) {
        const id = crypto.randomBytes(8).toString('hex')
        this.bedrock.sendData('eval', { id, script })

        const prmtrl = new PromiseController<Bedrock.Events['eval']>()

        const lisEvent = (data: Bedrock.Events['eval']) => prmtrl.resolve(data)
        const lisExit = () => prmtrl.reject(new Error('process exited'))

        this.bedrock.bedrockEvents.once('eval', lisEvent)
        this.bedrock.process.once('exit', lisExit)

        prmtrl.promise.finally(() => {
            this.bedrock.bedrockEvents.off('eval', lisEvent)
            this.bedrock.process.off('exit', lisExit)
        })

        return prmtrl.promise
    }
}
