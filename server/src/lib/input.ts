import readline = require('readline')
import TypedEventEmitter from './typedevm.js'

const stdin = process.stdin

stdin.setRawMode(true)
stdin.setEncoding('utf8')

readline.emitKeypressEvents(process.stdin)

// keypress event

export const keypressEvent = new TypedEventEmitter<{ keypress: KeypressEvent }>()
stdin.on('keypress', (string, {name, ctrl, meta: alt, shift}) => keypressEvent.emit('keypress', { string, name, ctrl, alt, shift }))

interface KeypressEvent {
    string: string
    name: string

    ctrl: boolean
    alt: boolean
    shift: boolean
}
