import { element, insertRow } from "../lib/element.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";
import { sseEvents } from "../sse.js";

const logLevelColor: Record<LogLevel | 'unknown', string> = {
    log: 'white',
    unknown: 'white',
    info: 'cyan',
    warn: 'yellow',
    error: 'lightcoral'
}

const table = getIdThrow('bds-log-list', HTMLTableElement)
const list = table.tBodies.item(0) ?? table.createTBody()
const logLimit = 300

const input = getIdThrow('bds-input', HTMLInputElement)
const send = getIdThrow('bds-send', HTMLButtonElement)

const stats = {
    pid: getIdThrow('bds-stats-pid'),
    status: getIdThrow('bds-stats-status'),
    kc: getIdThrow('bds-stats-kc'),
    ks: getIdThrow('bds-stats-ks'),
    sid: getIdThrow('bds-stats-sid')
}

const kill = getIdThrow('bds-signal-kill', HTMLButtonElement)

function insData(data: Bedrock.ProcessEvents['line']) {
    const message = data.level === 'unknown' ? data.raw : data.line

    insertRow(list, undefined, {
        childrens: [
            element('td', {
                styles: { color: logLevelColor[data.level] },
                textContent: data.level,
            }),
            message
        ],
        datas: {
            level: data.level
        }
    })
    
    if (list.rows.length > logLimit) list.deleteRow(0)
}

// handlers

// handle input

function sendInput(value: string) {
    fetch('/session/send', {
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

// handle process

fetchThrow('/process')
    .then(async v => {
        const data = await v.json()

        stats.pid.textContent = data.pid
        stats.status.textContent = data.exitSignal ? 'killed' : data.exitCode !== null ? 'stopped' : 'running'
        stats.kc.textContent = data.exitCode ?? '-'
        stats.ks.textContent = data.exitSignal ?? '-'
        stats.sid.textContent = data.sessionID ?? '-'
    })

sseEvents.addEventListener('exit', ({ detail: { code, signal } }) => {
    stats.status.textContent = signal ? 'killed' : 'stopped'

    stats.kc.textContent = String(code ?? '-')
    stats.ks.textContent = signal ?? '-'
})

kill.addEventListener('click', () => {
    fetch('/session/kill', { method: 'POST' })
})

// handle filter

getIdThrow('bds-log-opts').addEventListener('click', (ev) => {
    const elm = ev.target
    if (!(
        elm instanceof HTMLInputElement
        && elm.type === 'checkbox'
        && elm.dataset.value
    )) return

    table.classList[!elm.checked ? 'add' : 'remove'](`no-level-${elm.dataset.value}`)
})


// sse

const init = fetchThrow('/session/bedrock')
    .then(async v => {
        const text = await v.text()
        for (const d of text.split(/\r?\n/).slice(-logLimit)) if (d) insData(JSON.parse(d))
    })
    .catch(e => console.error(e))

sseEvents.addEventListener('line', async ({detail: data}) => {
    await init
    insData(data)
})

