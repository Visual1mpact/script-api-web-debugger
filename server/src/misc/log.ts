import Color from "../lib/color.js";
import { bedrock } from "../main.js";

const levelsFlag = {
    debug: Color.color('strong_black') + '[D]' + Color.format('reset'),
    info: Color.color('strong_cyan') + '[I]' + Color.format('reset'),
    warn: Color.color('strong_yellow') + '[W]' + Color.format('reset'),
    error: Color.color('strong_red') + '[E]' + Color.format('reset'),
    log: '[L]',
    unknown: '[U]'
}

bedrock.events.on('line', data => {
    if (data.level === 'unknown') {
        console.log(levelsFlag.unknown, data.raw)
    } else {
        const level = data.level
        console[level](levelsFlag[level], data.line)
    }
})

bedrock.events.once('exit', ({ code, signal }) => {
    console.log(`bedrock process exited with code ${code ?? '-'} (signal: ${signal ?? '-'})`)
})
