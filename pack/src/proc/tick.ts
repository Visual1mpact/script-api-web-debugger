import { system } from "@minecraft/server"
import Debugger from "./debugger.js"
import run from "../wrap/run.js"

let prevTime = Date.now()
run.internals.runInterval(() => {
    const curTime = Date.now(), delta = curTime - prevTime
    prevTime = curTime

    Debugger.send('tick', {
        delta,
        tick: system.currentTick
    })
})
