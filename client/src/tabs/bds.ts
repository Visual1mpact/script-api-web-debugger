import init from "../init.js";
import { createText, element, insertRow } from "../lib/element.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";
import { sseEvents } from "../sse.js";

class BDSList {
    static readonly table = getIdThrow('bds-log-list', HTMLTableElement)
    static readonly list = this.table.tBodies.item(0) ?? this.table.createTBody()

    static logLimit = 300
    static logLevelColor: Record<LogLevelOrUnknown, string> = {
        log: 'white',
        unknown: 'white',
        info: 'cyan',
        warn: 'yellow',
        error: 'lightcoral'
    }

    static handle(data: Bedrock.ProcessEvents['line']) {
        return new BDSList(data.level, data.level === 'unknown' ? data.raw : data.line)
    }
    
    constructor(level: LogLevelOrUnknown = 'unknown', message = '') {
        this.row = insertRow(BDSList.list, undefined, {
            childrens: [
                this.#elm_level   = element('td', {
                    styles: { color: BDSList.logLevelColor[level] },
                    textContent: level,
                }),
                this.#elm_message = createText(message)
            ],
            datas: {
                level
            }
        })

        if (BDSList.list.rows.length > BDSList.logLimit) BDSList.list.deleteRow(-1)

    }

    readonly row: HTMLTableRowElement
    #elm_level
    #elm_message

    get level() { return this.row.dataset.level as LogLevel }
    set level(v) {
        this.row.dataset.level = v
        this.#elm_level.style.color = BDSList.logLevelColor[v]
        this.#elm_level.textContent = v
    }

    get message() { return this.#elm_message.textContent }
    set message(v) { this.#elm_message.textContent = v }
}

// inputs

const input = getIdThrow('bds-input', HTMLInputElement)
const send = getIdThrow('bds-send', HTMLButtonElement)

const stats = {
    pid: getIdThrow('bds-stats-pid'),
    status: getIdThrow('bds-stats-status'),
    kc: getIdThrow('bds-stats-kc'),
    ks: getIdThrow('bds-stats-ks')
}

const kill = getIdThrow('bds-signal-kill', HTMLButtonElement)

function sendInput(value: string) {
    fetchThrow('/send', {
        method: 'POST',
        body: value
    })
}

input.addEventListener('keypress', ({ charCode }) => {
    if (charCode !== 13 || !input.value) return
    sendInput(input.value)
})

send.addEventListener('click', () => {
    if (!input.value) return input.focus()
    sendInput(input.value)
})

kill.addEventListener('click', () => {
    fetchThrow('/session/kill', { method: 'POST' })
})

getIdThrow('bds-log-opts').addEventListener('click', (ev) => {
    const elm = ev.target
    if (!(
        elm instanceof HTMLInputElement
        && elm.type === 'checkbox'
        && elm.dataset.value
    )) return

    BDSList.table.classList[!elm.checked ? 'add' : 'remove'](`no-level-${elm.dataset.value}`)
})

// data

stats.pid.textContent = init.pid + ''
stats.status.textContent = init.signalCode ? 'killed' : init.exitCode !== null ? 'stopped' : 'running'
stats.kc.textContent = init.exitCode + '' || '-'
stats.ks.textContent = init.signalCode ?? '-'

for (const d of init.consoleLog) BDSList.handle(d)

sseEvents.addEventListener('line', ({detail: data}) => BDSList.handle(data))
sseEvents.addEventListener('exit', ({ detail: { code, signal } }) => {
    stats.status.textContent = signal ? 'killed' : 'stopped'

    stats.kc.textContent = String(code ?? '-')
    stats.ks.textContent = signal ?? '-'
})
