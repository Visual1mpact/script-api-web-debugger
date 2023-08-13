import eventListeners from "../wrap/event.js";
import EventEmitter from "./event.js";
import { ScriptEventSource } from '@minecraft/server'

const log = console.log

eventListeners.system_after.scriptEventReceive.subscribeInternal(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    HookSignal.Incoming.emit(id.substring(6), JSON.parse(message))
})

namespace HookSignal {
    export const Incoming = new EventEmitter<Bedrock.Messages>('[Hook:Incoming]')

    export namespace Outgoing {
        export let eventid = ''
        export let stall: [keyof Bedrock.Events, any][] = []

        export function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K], force = false) {
            if (force || eventid) log(`{{${eventid}:${name}}}${JSON.stringify(data)}`)
            else stall.push([name, data])
        }        
    }
}

export default HookSignal

HookSignal.Incoming.addEventListener('conn_id', id => {
    const out = HookSignal.Outgoing
    out.eventid = id

    for (const [k, v] of out.stall) out.send(k, v)
    out.stall = []
}, {
    once: true
})
