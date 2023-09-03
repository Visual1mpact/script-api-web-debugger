import Color from "./lib/color.js";
import NBedrock from "./bedrock.js";

const levelsFlag = {
    debug: Color.color('strong_black') + '[D]' + Color.format('reset'),
    info: Color.color('strong_cyan') + '[I]' + Color.format('reset'),
    warn: Color.color('strong_yellow') + '[W]' + Color.format('reset'),
    error: Color.color('strong_red') + '[E]' + Color.format('reset'),
    log: '[L]',
    unknown: '[U]'
}

NBedrock.events.on('line', data => {
    if (data.level === 'unknown') {
        console.log(levelsFlag.unknown, data.raw)
    } else {
        const level = data.level
        console[level](levelsFlag[level], data.line)
    }
})

NBedrock.events.once('exit', ({ code, signal }) => {
    console.log(`bedrock process exited with`, code === null ? `signal ${signal}` : `code ${code} (hex: 0x${code.toString(16)})`)
})
