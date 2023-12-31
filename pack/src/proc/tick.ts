import { system } from "@minecraft/server"
import Debugger from "../lib/debugger.js"
import run from "../wrap/run.js"

let prevTime = Date.now()
run.internals.runInterval(() => {
    const curTime = Date.now(), delta = curTime - prevTime
    prevTime = curTime

    Debugger.send('tick', {
        delta,
        time: curTime,
        tick: system.currentTick
    })
})
