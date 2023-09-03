import EventEmitter from "./event.js";
import { ScriptEventSource, system } from '@minecraft/server'
import { postJSON } from "./misc.js";
import { http } from "@minecraft/server-net";

const log = console.log

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    Debugger.incoming.emit(id.substring(6) as any, JSON.parse(message))
})

namespace Debugger {
    export const incoming = new EventEmitter<NodeBedrock.Messages>('[Hook:Incoming]')

    export let sendPort = 0
    export let sendBatch: [keyof Bedrock.Events, any][] = []
    export let sendPaused = false

    export function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        sendBatch.push([name, data])
    }

    export function sendConsole<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        log(`SCRIPTDATA:---${name}---:${JSON.stringify({ name, data })}`)
    }
}

export default Debugger

Debugger.incoming.addEventListener('handshake', port => Debugger.sendPort = port, { once: true })

system.runInterval(() => {
    const port = Debugger.sendPort
    if (!port || Debugger.sendPaused) return

    Debugger.sendPaused = true
    postJSON(`http://127.0.0.1:${port}/bedrock/event_batch`, Debugger.sendBatch)
        .finally(() => { Debugger.sendPaused = false })
    
    Debugger.sendBatch = []
}, 2)

Debugger.incoming.addEventListener('longdata', async id => {
    const res = await http.get(`http://127.0.0.1:${await Debugger.sendPort}/bedrock/longdata/${encodeURIComponent(id)}`)
    if (res.status !== 200) return

    const { name, data } = JSON.parse(res.body)
    Debugger.incoming.emit(name, data)
})
