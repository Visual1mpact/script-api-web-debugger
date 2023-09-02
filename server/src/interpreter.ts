import NBedrock from "./bedrock.js"

export namespace NInterpreterConfig {
    export let processConsoleLogLimit = 400
    export let consoleLogLimit = 300
    export let eventLogLimit = 200

    export let eventListenersAutoclearThreshold = 70
    export let eventListenersLogLimit = 20
    export let eventListenersAutoclearList = new Map<string, Bedrock.EventIdentifier & { fid: number }>()

    export let systemRunsAutoclearThreshold = 100
    export let systemRunsAutoclearList = new Set<number>()
}

namespace NInterpreter {
    export let processConsoleLogList: NodeBedrock.Events['line'][] = []
    export let consoleLogList: Bedrock.Events['console'][] = []
    export let eventLogList: Bedrock.Events['event'][] = []

    export let worldInitProps: [property: string, data: Bedrock.T_DynamicPropertyData][]
    export let entitiesInitProps: [id: string, properties: [property: string, data: Bedrock.T_DynamicPropertyData][]][]

    export let worldProps: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)
    export let states: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)

    export let eventListeners: Record<'world' | 'system', Record<'before' | 'after', Map<string, Map<number, NodeBedrock.Interpreter.EventListener>>>> = {
        world: { before: Object.create(null), after: Object.create(null) },
        system: { before: Object.create(null), after: Object.create(null) }
    }

    export let systemRuns = new Map<number, NodeBedrock.Interpreter.SystemRun>()

    export const Config = NInterpreterConfig
}

function pushToLimit<T>(arr: T[], value: T, limit: number) {
    arr.push(value)
    if (arr.length > limit) arr.shift()
}

NBedrock.events.addListener('line', data => pushToLimit(NInterpreter.processConsoleLogList, data, NInterpreterConfig.processConsoleLogLimit))
NBedrock.events.addListener('data', ev => {
    switch (ev.name) {
        case 'ready': {
            NInterpreter.processConsoleLogList = []
            NInterpreter.consoleLogList = []
            NInterpreter.eventLogList = []
            NInterpreter.worldInitProps = []
            NInterpreter.entitiesInitProps = []
            NInterpreter.worldProps = Object.create(null)
            NInterpreter.states = Object.create(null)
            NInterpreter.systemRuns.clear()
            NInterpreter.eventListeners = {
                world: { before: new Map, after: new Map },
                system: { before: new Map, after: new Map }
            }
            NInterpreterConfig.eventListenersAutoclearList.clear()
            NInterpreterConfig.systemRunsAutoclearList.clear()
        } break

        case 'console': {
            pushToLimit(NInterpreter.consoleLogList, ev.data, NInterpreterConfig.consoleLogLimit)
        } break

        case 'event': {
            pushToLimit(NInterpreter.eventLogList, ev.data, NInterpreterConfig.eventLogLimit)
        } break

        case 'property_registry': {
            NInterpreter.worldInitProps = ev.data.world
            NInterpreter.entitiesInitProps = ev.data.entities
            NInterpreter.worldProps = ev.data.worldInitProperties
        } break

        case 'property_set': {
            if (ev.data.type !== 'world') break

            NInterpreter.worldProps[ev.data.property] = ev.data.value
        } break

        case 'state_set': {
            NInterpreter.states[ev.data.state] = ev.data.value
        } break
        
        case 'system_run_change': {
            const { duration, fid, fn, id, mode, stack, tick, type } = ev.data
            const list = NInterpreter.systemRuns

            let data = list.get(id)
            if (!data) {
                list.set(id, data = {
                    fn,
                    fid,

                    addTick: tick,
                    addStack: stack,

                    id,
                    type,
                    duration,

                    isCleared: false,
                    isSuspended: false
                })

                const aclist = NInterpreterConfig.systemRunsAutoclearList
                if (aclist.size > NInterpreterConfig.systemRunsAutoclearThreshold) {
                    for (const id of aclist) list.delete(id)
                    aclist.clear()
                }
            }

            switch (mode) {
                case 'add': break
                
                case 'clear': {
                    data.isCleared = true
                    data.clearTick = tick
                    data.clearStack = stack

                    NInterpreterConfig.systemRunsAutoclearList.add(id)
                } break

                case 'resume': {
                    data.isSuspended = false
                } break

                case 'suspend': {
                    data.isSuspended = true
                } break
            }
        } break

        case 'event_change': {
            const { fid, fn, isBefore, isSystem, mode, name, stack, tick } = ev.data

            const eventList = NInterpreter.eventListeners[isSystem ? 'system' : 'world'][isBefore ? 'before' : 'after']
            let list = eventList.get(name)
            if (!list) eventList.set(name, list = new Map)

            let data = list.get(fid)
            if (!data) {
                list.set(fid, data = {
                    fid,
                    fn,

                    lastSubscribeTick: tick,
                    log: [],

                    disabled: false,
                    subscribed: true
                })

                const aclist = NInterpreterConfig.eventListenersAutoclearList
                if (aclist.size > NInterpreterConfig.eventListenersAutoclearThreshold) {
                    for (const { isBefore, isSystem, name, fid } of aclist.values()) NInterpreter.eventListeners[isSystem ? 'system' : 'world'][isBefore ? 'before' : 'after'].get(name)?.delete(fid)
                    aclist.clear()
                }
            }

            pushToLimit(data.log, {tick, mode, stack}, NInterpreterConfig.eventListenersLogLimit)

            const fsid = isSystem + '/' + isBefore + '/' + name + '/' + fid

            switch (mode) {
                case 'subscribe': {
                    data.lastSubscribeTick = tick
                    data.subscribed = true
                    NInterpreterConfig.eventListenersAutoclearList.delete(fsid)
                } break

                case 'unsubscribe': {
                    data.subscribed = false
                    NInterpreterConfig.eventListenersAutoclearList.set(fsid, {
                        isBefore,
                        isSystem,
                        name,
                        fid
                    })
                } break

                case 'disable': {
                    data.disabled = true
                } break

                case 'enable': {
                    data.disabled = false
                }
            }
        } break
    }
})

export default NInterpreter
