import HookSignal from "../lib/hooksig.js"
import { inspectJSON } from "../lib/jsoninspector.js"
import { getStackTrace } from "../lib/misc.js"

for (const k of ['log', 'info', 'warn', 'error'] as const) {
    console[k] = (...args) => {
        HookSignal.Outgoing.send('console', {
            level: k,
            content: args.map(v => inspectJSON(v)),
            stack: getStackTrace(2)
        })
    }
}
