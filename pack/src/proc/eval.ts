import Debugger from "../lib/debugger.js"
import { inspectJSON } from "../lib/jsoninspector.js"
import { PromiseController } from "../lib/abortctrl.js"
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

const asyncConstructor = (async() => {}).constructor as Function
const evalUrl = new PromiseController<string>()

async function execEval(id: string, script: string, keepOutput = true) {
    try {
        const fn = asyncConstructor('c', `await null; with (c) return [eval(${JSON.stringify(script)})]`)
        Object.defineProperty(fn, 'name', { value: `debuggerEvalExec`})

        const value = (await fn.call(ectx, ectxProxy))[0]
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

Debugger.incoming.addEventListener('eval', ({ id, script, keepOutput }) => execEval(id, script, keepOutput))
Debugger.incoming.addEventListener('handshake', port => evalUrl.resolve(`http://127.0.0.1:${port}/bedrock/eval`), { once: true })
