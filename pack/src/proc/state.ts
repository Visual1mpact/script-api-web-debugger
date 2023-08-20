import HookSignal from "../lib/hooksig.js"

const stateInternal: Record<string, Bedrock.T_DynamicPropertyValue> = Object.create(null)
const states = new Proxy(stateInternal, {
    set(t, p, v) {
        if (typeof p === 'symbol') return true

        if (v !== undefined) t[p] = v
        else delete t[p]

        HookSignal.Outgoing.send('state_set', {
            state: p,
            value: v
        })

        return true
    },
    deleteProperty(t, p) {
        if (typeof p === 'symbol' || !(p in t)) return true

        delete t[p]
        HookSignal.Outgoing.send('state_set', {
            state: p,
            value: undefined
        })

        return true
    }
})

HookSignal.Incoming.addEventListener('set_state', ({ state, value }) => states[state] = value)

export default states
