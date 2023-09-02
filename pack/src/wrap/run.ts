import { System, system } from "@minecraft/server"
import { inspectJSON } from "../lib/jsoninspector.js"
import { getStackTrace } from "../lib/misc.js"
import Debugger from "../lib/debugger.js"

let cid = 1
const ids = new WeakMap<(ev: any) => void, number>()
const runList = new Map<number, {
    readonly type: Bedrock.T_RunType
    readonly fn: () => void,
    readonly wrap: () => void

    get suspended(): boolean
    set suspended(v)

    get cleared(): boolean
    clear(): boolean
}>()

const oclear = system.clearRun.bind(system)
const clr = System.prototype.clearRun = (id) => {
    oclear(id)
    
    const d = runList.get(id)
    if (!d) return

    runList.delete(id)
    Debugger.send('system_run_change', {
        tick: system.currentTick,

        id,
        duration: -1,
        type: d.type,

        fn: inspectJSON(d.fn) as any,
        fid: ids.get(d.fn) ?? -1,
        stack: getStackTrace(2),

        mode: 'clear'
    })
}

const oRunObj: Pick<System, Bedrock.T_RunType> = Object.create(null)
for (const k of ['run', 'runInterval', 'runTimeout'] as const) {    
    const orun = oRunObj[k] = system[k].bind(system)
    //@ts-ignore
    System.prototype[k] = (fn, d) => {
        let fid = ids.get(fn) ?? 0
        if (!fid) ids.set(fn, fid = cid++)
        
        const wrapfn = () => {
            if (k !== 'runInterval') system.clearRun(id)
            if (state_suspended) return

            const t = Date.now()

            try {
                fn()

                const delta = Date.now() - t
                Debugger.send('system_run', {
                    tick: system.currentTick,

                    id,
                    
                    fn: inspectJSON(fn) as any,
                    fid,

                    delta
                })
            } catch(e) {
                const delta = Date.now() - t
                Debugger.send('system_run', {
                    tick: system.currentTick,

                    id,

                    fn: inspectJSON(fn) as any,
                    fid,

                    delta,
                    error: inspectJSON(e)
                })
            }
        }        
        const id = d ? orun(wrapfn, d) : orun(wrapfn)

        let state_suspended = false

        runList.set(id, {
            type: k,
            fn,
            wrap: wrapfn,

            get suspended() { return state_suspended },
            set suspended(v) {
                if (state_suspended === v) return
                state_suspended = v

                Debugger.send('system_run_change', {
                    tick: system.currentTick,
        
                    type: k,
                    duration: d ?? -1,
                    id,
        
                    fn: inspectJSON(fn) as any,
                    fid,
                    stack: getStackTrace(2),
        
                    mode: v ? 'suspend' : 'resume'
                })
            },

            get cleared() { return !runList.has(id) },
            clear() {
                if (!runList.has(id)) return false
                clr(id)
                return true
            }
        })

        Debugger.send('system_run_change', {
            tick: system.currentTick,

            type: k,
            duration: d ?? -1,
            id,

            fn: inspectJSON(fn) as any,
            fid,
            stack: getStackTrace(2),

            mode: 'add'
        })

        return id
    }
}

const run = {
    list: runList,
    internals: {
        clear: oclear,
        run: oRunObj.run,
        runInterval: oRunObj.runInterval,
        runTimeout: oRunObj.runTimeout
    }
}
export default run
