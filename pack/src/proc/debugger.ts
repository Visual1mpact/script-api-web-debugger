import EventEmitter from "../lib/event.js";
import { ScriptEventSource, system } from '@minecraft/server'
import { postJSON } from "../lib/misc.js";
import { PromiseController } from "../lib/abortctrl.js";
import { http } from "@minecraft/server-net";

const log = console.log

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    Debugger.incoming.emit(id.substring(6), JSON.parse(message))
})

const eventUrl = new PromiseController<number>()

namespace Debugger {
    export const incoming = new EventEmitter<NodeBedrock.Messages>('[Hook:Incoming]')

    export const outgoingPort = eventUrl.promise

    export async function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        return postJSON(`http://127.0.0.1:${await outgoingPort}/bedrock/event/${encodeURIComponent(name)}`, { name, data })
    }

    export function sendConsole<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        log(`SCRIPTDATA:---${name}---:${JSON.stringify({ name, data })}`)
    }
}

export default Debugger

Debugger.incoming.addEventListener('handshake', port => eventUrl.resolve(port), { once: true })
Debugger.incoming.addEventListener('longdata', async id => {
    const res = await http.get(`http://127.0.0.1:${await Debugger.outgoingPort}/bedrock/longdata/${encodeURIComponent(id)}`)
    if (res.status !== 200) return

    const { name, data } = JSON.parse(res.body)
    Debugger.incoming.emit(name, data)
})
