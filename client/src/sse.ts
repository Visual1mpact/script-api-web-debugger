import TypedEventTarget from "./lib/typedevm.js"

export const sse = new EventSource('/listen')
export const sseEvents = new TypedEventTarget<Bedrock.ProcessEvents>()
export const bedrockEvents = new TypedEventTarget<Bedrock.Events>()

for (const ev of ['line', 'runtime_stats', 'data', 'exit'] as (keyof Bedrock.ProcessEvents)[])
    sse.addEventListener(ev, ({data: str}) => {
        const data = JSON.parse(str)

        sseEvents.emit(ev, data)
        if (ev === 'data') bedrockEvents.emit(data.name, data.data)
    })
