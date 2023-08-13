import HookSignal from "../lib/hooksig.js"
import { inspectJSON } from "../lib/jsoninspector.js"

import * as mc from '@minecraft/server'
import * as gt from '@minecraft/server-gametest'
import * as mcui from '@minecraft/server-ui'
import run from "../wrap/run.js"
import dynamicProperties from "../wrap/propreg.js"
import eventListeners from "../wrap/event.js"

const asyncConstructor = (async() => {}).constructor as Function

async function execEval(id: string, script: string) {
    try {
        const fn = asyncConstructor('c', `await null; with (c) return [eval(${JSON.stringify(script)})]`)
        Object.defineProperty(fn, 'name', { value: `debuggerEvalExec`})

        const value = (await fn.call(ectx, ectxProxy))[0]
        ectx.$_ = value

        HookSignal.Outgoing.send('eval', {
            id,
            result: inspectJSON(value),
            error: false
        })
    } catch(e) {
        HookSignal.Outgoing.send('eval', {
            id,
            result: inspectJSON(e),
            error: true
        })
    }
}

const ectxScopables: any = {
    mc,
    gt,
    mcui,
}

const ectx: any = {
    runList: run,
    dynamicProperties,
    eventListeners,

    $_: undefined,

    $player(name: string) { return mc.world.getPlayers({ name })[0] },
    $id(id: string) { return mc.world.getEntity(id) },

    [Symbol.unscopables]: {}
}

const ectxProxy = new Proxy(ectx, {
    get: (t, p) => {        
        //@ts-expect-error
        if (p in globalThis) return globalThis[p]

        if (p in ectx) return ectx[p]
        if (p in ectxScopables) return ectxScopables[p]
        for (const obj of Object.values(ectxScopables) as any[]) if (p in obj) return obj[p]

        throw new ReferenceError(`'${String(p)}' is not defined`)
    },
    set: (t, p, v) => {
        //@ts-expect-error
        globalThis[p] = v
        return true
    },
    deleteProperty: (t, p) => {
        //@ts-expect-error
        delete globalThis[p]
        return true
    },
    has: (t, p) => true
})

HookSignal.Incoming.addEventListener('eval', ({id, script}) => execEval(id, script))
