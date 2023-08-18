import { createText, element, insertRow } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { getIdThrow } from "../lib/misc.js";
import init from "../init.js";
import { bedrockEvents } from "../sse.js";

class ConsoleList {
    static readonly table = getIdThrow('console-list', HTMLTableElement)
    static readonly list = this.table.tBodies.item(0) ?? this.table.createTBody()

    static logLimit = 300
    static logLevelColor: Record<LogLevel, string> = {
        log: 'white',
        info: 'cyan',
        warn: 'yellow',
        error: 'lightcoral'
    }

    static handle(data: Bedrock.Events['console']) {
        return new ConsoleList(data.level, data.content, data.stack)
    }

    constructor(level: LogLevel = 'log', datas: JSONInspect.All[] = [], stack = '') {
        this.row = insertRow(ConsoleList.list, 0, {
            childrens: [
                this.#elm_level = element('td', {
                    styles: { 'color': ConsoleList.logLevelColor[level] },
                    textContent: level
                }),
                this.#elm_data  = element('td', datas.map(v => v.type === 'string' ? element('span', v.value) : uninspectJSONToElement(v))),
                this.#elm_stack = createText(stack.replace(/^    at /gm, ''))
            ],
            datas: {
                level: level
            }
        })
    
        if (ConsoleList.list.rows.length > ConsoleList.logLimit) ConsoleList.list.deleteRow(-1)
    }

    readonly row: HTMLTableRowElement
    #elm_level
    #elm_data
    #elm_stack

    get level() { return this.row.dataset.level as LogLevel }
    set level(v) {
        this.row.dataset.level = v
        this.#elm_level.style.color = ConsoleList.logLevelColor[v]
        this.#elm_level.textContent = v
    }

    get stack() { return this.#elm_stack.textContent }
    set stack(v) { this.#elm_stack.textContent = v }

    setContent(datas: JSONInspect.All[])  {
        this.#elm_data.replaceChildren(...datas.map(v => v.type === 'string' ? element('span', v.value) : uninspectJSONToElement(v)))
        return this
    }
}

// inputs

getIdThrow('console-log-opts').addEventListener('click', (ev) => {
    const elm = ev.target
    if (!(
        elm instanceof HTMLInputElement
        && elm.type === 'checkbox'
        && elm.dataset.value
    )) return

    ConsoleList.table.classList[!elm.checked ? 'add' : 'remove'](`no-level-${elm.dataset.value}`)
})

const showStack = getIdThrow('console-log-show-stack', HTMLInputElement)
showStack.addEventListener('change', (ev) => {
    ConsoleList.table.classList[!showStack.checked ? 'add' : 'remove'](`no-stack`)
})

// data

for (const d of init.script.consoleLog) ConsoleList.handle(d)

bedrockEvents.addEventListener('console', async ({detail: data}) => ConsoleList.handle(data))
