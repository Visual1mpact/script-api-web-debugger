import EventEmitter from "./event.js";
import { ScriptEventSource, system } from '@minecraft/server'
import { postJSON } from "./misc.js";
import { PromiseController } from "./abortctrl.js";
import { http } from "@minecraft/server-net";

const log = console.log

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    HookSignal.incoming.emit(id.substring(6), JSON.parse(message))
})

const eventUrl = new PromiseController<number>()

namespace HookSignal {
    export const incoming = new EventEmitter<NodeBedrock.Messages>('[Hook:Incoming]')

    export const outgoingPort = eventUrl.promise

    export async function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        return postJSON(`http://127.0.0.1:${await outgoingPort}/bedrock/event/${encodeURIComponent(name)}`, { name, data })
    }

    export function sendConsole<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        log(`SCRIPTDATA:---${name}---:${JSON.stringify({ name, data })}`)
    }
}

export default HookSignal

HookSignal.incoming.addEventListener('handshake', port => eventUrl.resolve(port), { once: true })
HookSignal.incoming.addEventListener('longdata', async id => {
    const res = await http.get(`http://127.0.0.1:${await HookSignal.outgoingPort}/bedrock/longdata/${encodeURIComponent(id)}`)
    if (res.status !== 200) return

    const { name, data } = JSON.parse(res.body)
    HookSignal.incoming.emit(name, data)
})
