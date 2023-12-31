import init from "../init.js";
import { createText, element, insertRow } from "../lib/element.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";
import { sseEvents } from "../sse.js";

export class BDSList {
    static readonly table = getIdThrow('bds-log-list', HTMLTableElement)
    static readonly list = this.table.tBodies.item(0) ?? this.table.createTBody()

    static logLimit = 400
    static logLevelColor: Record<LogLevelOrUnknown, string> = {
        log: 'white',
        unknown: 'white',
        info: 'cyan',
        warn: 'yellow',
        error: 'lightcoral'
    }

    static handle(data: NodeBedrock.Events['line']) {
        return new this(data.level, data.level === 'unknown' ? data.raw : data.line)
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

        if (BDSList.list.rows.length > BDSList.logLimit) BDSList.list.deleteRow(0)

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

    get isListed() { return Boolean(this.row.parentElement) }
    unlist() {
        if (!this.isListed) return false

        this.row.remove()

        return true
    }
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
    fetchThrow('/client/send', {
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
    fetchThrow('/client/kill', { method: 'POST' })
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

BDSList.logLimit = init.limits.processConsoleLog

stats.pid.textContent = init.bedrock.pid + ''
stats.status.textContent = init.bedrock.signalCode ? 'killed' : init.bedrock.exitCode !== null ? 'stopped' : 'running'
stats.kc.textContent = init.bedrock.exitCode + '' || '-'
stats.ks.textContent = init.bedrock.signalCode ?? '-'

for (const d of init.bedrock.consoleLog) BDSList.handle(d)

sseEvents.addEventListener('line', ({detail: data}) => BDSList.handle(data))
sseEvents.addEventListener('exit', ({ detail: { code, signal } }) => {
    stats.status.textContent = signal ? 'killed' : 'stopped'

    stats.kc.textContent = String(code ?? '-')
    stats.ks.textContent = signal ?? '-'
})
