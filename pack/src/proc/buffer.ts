import HookSignal from "../lib/hooksig.js"
import { decode } from "../lib/misc.js"

const bufs: Record<string, { buf: Array<number>, ptr: number }> = Object.create(null)

HookSignal.incoming.addEventListener('buf_start', id => {
    bufs[id] = {
        buf: [],
        ptr: 0
    }
})

HookSignal.incoming.addEventListener('buf_write', ({ id, chunkhex }) => {
    const data = bufs[id]
    if (!data) return

    for (let i = 0; i < chunkhex.length; i += 2) data.buf[data.ptr++] = parseInt(chunkhex.substr(i, 2), 16)
})

HookSignal.incoming.addEventListener('buf_end', ({ id, event }) => {
    const data = bufs[id]
    if (!data) return

    HookSignal.incoming.emit(event, JSON.parse(decode(data.buf)))
})

HookSignal.incoming.addEventListener('buf_cancel', id => {
    delete bufs[id]
})
