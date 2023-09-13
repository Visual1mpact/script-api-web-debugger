import EventEmitter from "./event.js";
import { ScriptEventSource, system } from '@minecraft/server'
import { postJSON } from "./misc.js";
import { http } from "@minecraft/server-net";

const log = console.log

// handler

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server || !id.startsWith('debug:')) return

    Debugger.incoming.emit(id.substring(6) as any, JSON.parse(message))
})

/** Debugger instance that connects to the Node.js interpreter process */
namespace Debugger {
    /** Incoming message / data from Node.js process */
    export const incoming = new EventEmitter<NodeBedrock.Messages>('[Hook:Incoming]')

    /** Localhost port to be used to send data to the interpreter process */
    export let sendPort = 0
    /**
     * Event datas to be sent to the interpreter process.
     * 
     * Datas is sent and then cleared every 2 ticks (about 100ms)
     */
    export let sendBatch: [keyof Bedrock.Events, any][] = []
    /**
     * Whether sending event datas is paused or not.
     * Prevents collision with faster requests
     * 
     * Paused (true) when the data is being sent
     */
    export let sendPaused = false

    /**
     * Sends an event data to the interpreter process
     * @param name Event name
     * @param data Event data
     */
    export function send<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        sendBatch.push([name, data])
    }

    /**
     * Sends an event data immediately (to the console) to the interpreter process
     * @param name Event name
     * @param data Event data
     */
    export function sendConsole<K extends keyof Bedrock.Events>(name: K, data: Bedrock.Events[K]) {
        log(`SCRIPTDATA:---${name}---:${JSON.stringify({ name, data })}`)
    }
}

export default Debugger

// handshake to get the localhost port that will be used
Debugger.incoming.addEventListener('handshake', port => Debugger.sendPort = port, { once: true })

// send batches of event data
system.runInterval(() => {
    const port = Debugger.sendPort
    if (!port || Debugger.sendPaused) return

    // pause then send
    Debugger.sendPaused = true
    postJSON(`http://127.0.0.1:${port}/bedrock/event_batch`, Debugger.sendBatch)
        .finally(() => { Debugger.sendPaused = false })
    
    // clear
    Debugger.sendBatch = []
}, 2)

// handle long datas (over 2000 bytes)
Debugger.incoming.addEventListener('longdata', async id => {
    const res = await http.get(`http://127.0.0.1:${await Debugger.sendPort}/bedrock/longdata/${encodeURIComponent(id)}`)
    if (res.status !== 200) return

    const { name, data } = JSON.parse(res.body)
    Debugger.incoming.emit(name, data)
})
