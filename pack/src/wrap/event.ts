import { world, system } from '@minecraft/server'
import { getStackTrace } from '../lib/misc.js'
import { inspectJSON } from '../lib/jsoninspector.js'
import HookSignal from '../lib/hooksig.js'

let cid = 1
const ids = new WeakMap<ListenerFn, number>()

let config = {
    inspectEventData: false
}

function wrapEvent<T extends string>(data: Record<T, EventObject>, isSystem: boolean, isBefore: boolean) {
    const o: Record<T, EventObject & {
        listeners: ListenerList
        subscribeInternal: EventObject['subscribe']
        unsubscribeInternal: EventObject['unsubscribe']
        dispatch: ListenerFn
    }> = Object.create(null)

    for (const name in data) {
        const ev = data[name]
        if (!ev) continue

        const listeners: ListenerList = new Map()
        const dispatch = (data: any) => {
            const t0 = Date.now()

            const ftiming = Array.from(listeners)
                .filter(([k, v]) => !v.disabled)
                .map(([id, {fn}]) => {
                    const t = Date.now()
                    try {
                        fn(data)

                        const delta = Date.now() - t
                        return {
                            fn: inspectJSON(fn) as JSONInspect.Values.Function,
                            fid: id,
                            time: delta,
                            error: undefined
                        }
                    } catch(e) {
                        const delta = Date.now() - t
                        return {
                            fn: inspectJSON(fn) as JSONInspect.Values.Function,
                            fid: id,
                            time: delta,
                            error: inspectJSON(e)
                        }
                    }
                })

            const t1 = Date.now()

            const jsondata: JSONInspect.All = config.inspectEventData
                ? inspectJSON(data)
                : { type: 'string', value: 'Event inspection is disabled. Evaluate eventListeners.config.inspectEventData = true to enable.' }

            const tSelf = Date.now() - t1
            const tTotal = Date.now() - t0

            HookSignal.Outgoing.send('event', {
                tick: system.currentTick,
                name,

                isSystem,
                isBefore,

                data: jsondata,
                timing: {
                    functions: ftiming,
                    self: tSelf,
                    total: tTotal
                }
            })

            return ftiming
        }
        ev.subscribe(dispatch)

        const proto = Object.getPrototypeOf(ev) as typeof data[T]
        const { subscribe: subscribeInternal, unsubscribe: unsubscribeInternal } = proto
    
        const subscribe = proto.subscribe = (fn, opts) => {
            if (opts) console.warn(`Subscribe options is not supported with debugger injected \n${getStackTrace(2)}`)

            let fid = ids.get(fn)
            if (!fid) ids.set(fn, fid = cid++)
            if (listeners.has(fid)) return fn

            const fidc = fid
            let disabled = false

            listeners.set(fid, {
                fn,

                get disabled() { return disabled },
                set disabled(v) {
                    if (disabled === v) return
                    disabled = v

                    HookSignal.Outgoing.send('event_change', {
                        tick: system.currentTick,
                        name,
        
                        isSystem,
                        isBefore,
        
                        fn: inspectJSON(fn) as any,
                        fid: fidc,
                        stack: getStackTrace(2),
        
                        mode: v ? 'disable' : 'enable'
                    })
                },

                get unsubscribed() { return !listeners.has(fidc) },
                unsubscribe() {
                    if (!listeners.has(fidc)) return false
                    unsubscribe(fn)
                    return true
                }
            })

            HookSignal.Outgoing.send('event_change', {
                tick: system.currentTick,
                name,

                isSystem,
                isBefore,

                fn: inspectJSON(fn) as any,
                fid: fid,
                stack: getStackTrace(2),

                mode: 'subscribe'
            })

            return fn
        }
        const unsubscribe = proto.unsubscribe = (fn) => {
            let fid = ids.get(fn)
            if (!fid) ids.set(fn, fid = cid++)
            if (!listeners.delete(fid)) return

            HookSignal.Outgoing.send('event_change', {
                tick: system.currentTick,
                name,

                isSystem,
                isBefore,

                fn: inspectJSON(fn) as any,
                fid,
                stack: getStackTrace(2),

                mode: 'unsubscribe'
            })
        }

        o[name] = {
            listeners,
            subscribe,
            unsubscribe,
            subscribeInternal: subscribeInternal.bind(ev),
            unsubscribeInternal: unsubscribeInternal.bind(ev),
            dispatch
        }
    }

    return o
}

type ListenerFn = (data: any) => any
type ListenerList = Map<number, {
    readonly fn: ListenerFn

    get disabled(): boolean
    set disabled(v)

    get unsubscribed(): boolean
    unsubscribe(): boolean
}>

type EventObject = {
    subscribe(fn: ListenerFn, opts?: any) : ListenerFn
    unsubscribe(fn: ListenerFn): void
}

const eventListeners = {
    world_before: wrapEvent(world.beforeEvents, false, true),
    world_after: wrapEvent(world.afterEvents, false, false),
    system_before: wrapEvent(system.beforeEvents, true, true),
    system_after: wrapEvent(system.afterEvents, true, false),
    config
}
export default eventListeners
