import { system } from "@minecraft/server"
import HookSignal from "../lib/hooksig.js"
import run from "../wrap/run.js"

let prevTime = Date.now()
run.internals.runInterval(() => {
    const curTime = Date.now(), delta = curTime - prevTime
    prevTime = curTime

    HookSignal.Outgoing.send('tick', {
        delta,
        tick: system.currentTick
    })
})
