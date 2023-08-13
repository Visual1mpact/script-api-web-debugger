import { element, insertRow } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/elminspector.js";
import { fetchThrow, getIdThrow, sleep } from "../lib/misc.js";
import { bedrockEvents } from "../sse.js";

const logLevelColor: Record<LogLevel, string> = {
    log: 'white',
    info: 'cyan',
    warn: 'yellow',
    error: 'lightcoral'
}

const table = getIdThrow('console-list', HTMLTableElement)
const list = table.tBodies.item(0) ?? table.createTBody()
const logLimit = 200

function handle(data: Bedrock.Events['console']) {
    insertRow(list, 0, {
        childrens: [
            element('td', {
                styles: { 'color': logLevelColor[data.level] },
                textContent: data.level
            }),
            element('td', data.content.map(v => v.type === 'string' ? element('span', v.value) : uninspectJSONToElement(v))),
            data.stack.replace(/^    at /gm, '')
        ],
        datas: {
            level: data.level
        }
    })

    if (list.rows.length > logLimit) list.deleteRow(-1)
}

// handlers

getIdThrow('console-log-opts').addEventListener('click', (ev) => {
    const elm = ev.target
    if (!(
        elm instanceof HTMLInputElement
        && elm.type === 'checkbox'
        && elm.dataset.value
    )) return

    table.classList[!elm.checked ? 'add' : 'remove'](`no-level-${elm.dataset.value}`)
})

const showStack = getIdThrow('console-log-show-stack', HTMLInputElement)
showStack.addEventListener('change', (ev) => {
    table.classList[!showStack.checked ? 'add' : 'remove'](`no-stack`)
})

// init & sse

const init = fetchThrow('/session/script/console')
    .then(async v => {
        const text = await v.text()
        for (const [i, d] of text.split(/\r?\n/).slice(-logLimit).entries()) {
            if (!d) continue
            handle(JSON.parse(d))
            if (i % 5 === 0) await sleep(1)
        }
    })
    .catch(e => console.error(e))

bedrockEvents.addEventListener('console', async ({detail: data}) => {
    await init
    handle(data)
})
