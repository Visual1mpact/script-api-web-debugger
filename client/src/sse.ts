import TypedEventTarget from "./lib/typedevm.js"

/** SSE connection to receive events fom the server */
export const sse = new EventSource('/listen')

/** Process events sent from the server */
export const sseEvents = new TypedEventTarget<NodeBedrock.Events>()

/** Bedrock events sent from the script API */
export const bedrockEvents = new TypedEventTarget<Bedrock.Events>()

for (const ev of ['line', 'runtime_stats', 'data', 'exit'] as (keyof NodeBedrock.Events)[])
    sse.addEventListener(ev, ({data: str}) => {
        const data = JSON.parse(str)

        sseEvents.emit(ev, data)
        if (ev === 'data') bedrockEvents.emit(data.name, data.data)
    })
