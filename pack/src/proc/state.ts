import Debugger from "../lib/debugger.js"

const stateInternal: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)
const states = new Proxy(stateInternal, {
    set(t, p, v) {
        if (typeof p === 'symbol') return true

        if (v !== undefined) t[p] = v
        else delete t[p]

        Debugger.send('state_set', {
            state: p,
            value: v
        })

        return true
    },
    deleteProperty(t, p) {
        if (typeof p === 'symbol' || !(p in t)) return true

        delete t[p]
        Debugger.send('state_set', {
            state: p,
            value: undefined
        })

        return true
    }
})

Debugger.incoming.addEventListener('set_state', ({ state, value }) => states[state] = value)

export default states
