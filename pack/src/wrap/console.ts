import Debugger from "../proc/debugger.js"
import { inspectJSON } from "../lib/jsoninspector.js"
import { getStackTrace } from "../lib/misc.js"

for (const k of ['log', 'info', 'warn', 'error'] as const) {
    console[k] = (...args) => {
        Debugger.send('console', {
            level: k,
            content: args.map(v => inspectJSON(v)),
            stack: getStackTrace(2)
        })
    }
}
