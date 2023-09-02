import TypedEventTarget from "./lib/typedevm.js"

export const sse = new EventSource('/listen')
export const sseEvents = new TypedEventTarget<NodeBedrock.Events>()
export const bedrockEvents = new TypedEventTarget<Bedrock.Events>()

for (const ev of ['line', 'runtime_stats', 'data', 'exit'] as (keyof NodeBedrock.Events)[])
    sse.addEventListener(ev, ({data: str}) => {
        const data = JSON.parse(str)

        sseEvents.emit(ev, data)
        if (ev === 'data') bedrockEvents.emit(data.name, data.data)
    })
