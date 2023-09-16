import Debugger from "../lib/debugger.js"
import { inspectJSON } from "../lib/jsoninspector.js"
import { PromiseController } from "../lib/promisectrl.js"
import { postJSON } from "../lib/misc.js"

import * as mc from '@minecraft/server'
import * as gt from '@minecraft/server-gametest'
import * as mcui from '@minecraft/server-ui'
import * as mcnet from '@minecraft/server-net'
import * as mcadmin from '@minecraft/server-admin'

import run from "../wrap/run.js"
import dynamicProperties from "../wrap/propreg.js"
import eventListeners from "../wrap/event.js"
import states from "./state.js"

const evalUrl = new PromiseController<string>()

async function execEval(id: string, script: string, keepOutput = true, async = false) {
    try {
        const result = Function(`return function debuggerEvalExec(c) { with (c) return ${ async ? `(async function asyncDropper() {${script}})()` : `eval(${JSON.stringify(script)})` } }`)().call(ectx, ectxProxy)

        const value = async ? await result : result
        if (keepOutput) ectx.$_ = value

        postJSON(await evalUrl.promise, {
            id,
            result: inspectJSON(value),
            error: false
        })
    } catch(e) {
        postJSON(await evalUrl.promise, {
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
    mcnet,
    mcadmin
}

const ectx: any = {
    runList: run,
    dynamicProperties,
    eventListeners,
    states,

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

Debugger.incoming.addEventListener('eval', ({ id, script, keepOutput, async }) => execEval(id, script, keepOutput, async))
Debugger.incoming.addEventListener('handshake', port => evalUrl.resolve(`http://127.0.0.1:${port}/bedrock/eval`), { once: true })
