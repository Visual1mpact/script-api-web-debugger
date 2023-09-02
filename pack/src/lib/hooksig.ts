import EventEmitter from "./event.js";
import { ScriptEventSource, system } from '@minecraft/server'
import { postJSON } from "./misc.js";
import { PromiseController } from "./abortctrl.js";

const log = console.log

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    HookSignal.incoming.emit(id.substring(6), JSON.parse(message))
})

const eventUrl = new PromiseController<string>()

namespace HookSignal {
    export const incoming = new EventEmitter<NodeBedrock.Messages>('[Hook:Incoming]')

    export const outgoingUrl = eventUrl.promise

    export async function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        postJSON(await outgoingUrl, { name, data })
    }

    export function sendConsole<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        log(`SCRIPTDATA:---${name}---:${JSON.stringify({ name, data })}`)
    }
}

export default HookSignal

HookSignal.incoming.addEventListener('handshake', d => eventUrl.resolve(d.eventUrl), { once: true })
