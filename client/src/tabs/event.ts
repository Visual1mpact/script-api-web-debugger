import init from "../init.js";
import { createTable, createText, element, insertCell, insertRow } from "../lib/element.js";
import { uninspectFunction, uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { getIdThrow } from "../lib/misc.js";
import { valueBar } from "../lib/misc2.js";
import { bedrockEvents } from "../sse.js";
import { sendEvalThrowable } from "../util.js";

function timeBar(v: number)  {
    return valueBar(v, [255, 255, 64], [255, 64, 64], 50)
}

export class EventLogList {
    static readonly table = getIdThrow('event-log', HTMLTableElement)
    static readonly list = this.table.tBodies.item(0) ?? this.table.createTBody()

    static logLimit = 100

    static handle(ev: Bedrock.Events['event']) {
        const { name, isBefore, isSystem, tick, timing: { functions, self, total } } = ev
        const data = new this(name, isSystem, isBefore, tick)

        data.setTiming([], functions.length, self, total)
        data.row.addEventListener('click', () => {
            data.setData(ev.data)
            data.setTiming(functions, functions.length, self, total), { once: true }
        })
        return data
    }

    constructor(name: string, isSystem = false, isBefore = false, tick = 0) {
        const row = this.row = insertRow(EventLogList.list, 0, {
            childrens: [
                this.#elm_tick         = createText(String(tick)),
                this.#elm_type         = createText(isSystem ? 'system' : 'world'),
                this.#elm_priority     = createText(isBefore ? 'before' : 'after'),
                this.#elm_name         = createText(name),
                this.#elm_listener_bar = element('td'),
                this.#elm_timing_bar   = element('td'),
            ],
            datas: {
                type     : isSystem ? 'system' : 'world',
                priority : isBefore ? 'before' : 'after',
                name     : name
            },
            on: {
                click: () => detailRow.hidden = !detailRow.hidden
            }
        })

        // detail

        const detailRow = this.detailRow = insertRow(EventLogList.list, 1, {
            classes: 'detail',
            hidden: true
        })

        const detailTimingTable = createTable({
            classes: ['row-2', 'border', 'fill-x'],
            thead: [[ 'function', 'delay', 'error?' ]]
        })
        this.#elm_detail_timing_list = detailTimingTable.createTBody()

        const detailData = this.#elm_detail_data = element('div', { classes: 'flow-x' })

        insertCell(detailRow, undefined, {
            colSpan: row.cells.length,
            childrens: [
                element('div', [
                    detailTimingTable,
                    element('br'),
                    element('div', 'data:'),
                    detailData
                ])
            ]
        })

        if (EventLogList.list.rows.length > EventLogList.logLimit * 2) {
            EventLogList.list.deleteRow(-1)
            EventLogList.list.deleteRow(-1)
        }
    }

    readonly row: HTMLTableRowElement
    #elm_tick
    #elm_type
    #elm_priority
    #elm_name
    #elm_listener_bar
    #elm_timing_bar

    readonly detailRow: HTMLTableRowElement
    #elm_detail_timing_list
    #elm_detail_data

    get tick() { return Number(this.#elm_tick.textContent) }
    set tick(v) { this.#elm_tick.textContent = String(v) }

    get isSystem() { return this.row.dataset.type === 'system' }
    set isSystem(v) {
        const str = v ? 'system' : 'world'
        this.row.dataset.type = str
        this.#elm_type.textContent = str
    }

    get isBefore() { return this.row.dataset.priority === 'before' }
    set isBefore(v) {
        const str = v ? 'before' : 'after'
        this.row.dataset.priority = str
        this.#elm_priority.textContent = str
    }

    get name() { return this.row.dataset.name ?? '' }
    set name(v) {
        this.row.dataset.name = v
        this.#elm_name.textContent = v
    }

    setData(data: JSONInspect.All) {
        this.#elm_detail_data.replaceChildren(uninspectJSONToElement(data))
        return this
    }

    setTiming(list: Iterable<{ fn: JSONInspect.Values.Function; time: number; error?: JSONInspect.All }>, count?: number, self = 0, total?: number) {
        let c = 0, t = 0

        this.#elm_detail_timing_list.replaceChildren()

        for (const { fn, time, error } of list) {
            insertRow(this.#elm_detail_timing_list, undefined, [
                uninspectFunction(fn, true).elm,
                element('td', {
                    styles: { 'background': timeBar(time)},
                    textContent: time + 'ms'
                }),
                error ? uninspectJSONToElement(error) : '-'
            ])

            c ++
            t += time
        }

        insertRow(this.#elm_detail_timing_list, undefined, [
            '<debugger inspector>',
            element('td', {
                styles: { 'background': timeBar(self)},
                textContent: self + 'ms'
            }),
            '-'
        ])

        if (count !== undefined) c = count
        if (total !== undefined) t = total

        this.#elm_listener_bar.style.background = valueBar(c, [128,192,255], [64,64,255], 8)
        this.#elm_listener_bar.textContent = c + ''

        this.#elm_timing_bar.style.background = timeBar(t)
        this.#elm_timing_bar.textContent = t + 'ms'

        return this
    }

    get isListed() { return Boolean(this.row.parentElement && this.detailRow.parentElement) }
    unlist() {
        if (!this.isListed) return false

        this.row.remove()
        this.detailRow.remove()

        return true
    }
}

{
    const opts = getIdThrow('ev-opts')
    const optsName = getIdThrow('ev-fi-name', HTMLInputElement)
    const optsNameStyle = document.head.appendChild(element('style'))

    // inputs

    optsName.addEventListener('change', () => {
        const fi = optsName.value && optsName.validity.valid
        optsNameStyle.textContent = fi ? `#event-log > tbody > tr:not([data-name*="${optsName.value}"]) { display: none }` : ''
    })

    opts.addEventListener('change', ev => {
        const elm = ev.target
        if (!(
            elm instanceof HTMLInputElement
            && elm.type === 'checkbox'
            && elm.dataset.type
            && elm.dataset.value
        )) return

        const {type, value} = elm.dataset
        EventLogList.table.classList[!elm.checked ? 'add' : 'remove'](`no-${type}-${value}`)
    })

    // init & sse

    for (const d of init.script.eventLog) EventLogList.handle(d)

    bedrockEvents.addEventListener('event', async ({detail: data}) => EventLogList.handle(data))
}

export class EventListeners {
    static readonly table = getIdThrow('event-lis-log', HTMLTableElement)
    static readonly tbody = this.table.tBodies.item(0) ?? this.table.createTBody()

    static readonly list = new Map<string, EventListeners>()

    static autoflushThreshold = 100
    static autoflushEnable = true
    static #flushCache = new Set<string>()
    static logLimit = 30

    static flush() {
        for (const id of this.#flushCache) this.list.get(id)?.unlist()
        this.#flushCache.clear()
    }

    static idOf(isSystem: boolean, isBefore: boolean, name: string, fid: number) {
        return (isSystem ? 's' : 'w') + (isBefore ? 'b' : 'a') + '/' + name + '/' + fid.toString(36)
    }

    static handle(ev: Bedrock.Events['event_change']) {
        const id = this.idOf(ev.isSystem, ev.isBefore, ev.name, ev.fid)
        let data = this.list.get(id)
        if (!data) this.list.set(id, data = new this(ev.isSystem, ev.isBefore, ev.name, ev.fid, ev.fn))
        const { row, detailRow } = data

        switch (ev.mode) {
            case 'subscribe': {
                data.subscribed = true

                row.remove()
                detailRow.remove()
                this.tbody.prepend(detailRow)
                this.tbody.prepend(row)

                data.#elm_tick.textContent = ev.tick + ''
            } break

            case 'unsubscribe': {
                data.subscribed = false
            } break

            case 'disable': {
                data.disabled = true
            } break

            case 'enable': {
                data.disabled = false
            } break
        }

        data.writeLog(ev.tick, ev.mode, ev.stack)
    }

    constructor(isSystem: boolean, isBefore: boolean, name: string, fid: number, fn: JSONInspect.Values.Function, tick = 0) {
        const typeName = isSystem ? 'system' : 'world'
        const priorityName = isBefore ? 'before' : 'after'
        this.objRef = `eventListeners.${typeName}_${priorityName}.${name}.listeners.get(${fid})`

        const row = this.row = insertRow(EventListeners.tbody, 0, {
            childrens: [
                this.#elm_tick = createText(tick + ''),
                isSystem ? 'system' : 'world',
                isBefore ? 'before' : 'after',
                name,
                this.#elm_status = createText('subscribed'),
                uninspectFunction(fn, true).elm,
            ],
            datas: {
                type     : isSystem ? 'system' : 'world',
                priority : isBefore ? 'before' : 'after',
                name     : name,
                status   : 'subscribed'
            },
            on: {
                click: () => detailRow.hidden = !detailRow.hidden
            }
        })

        const detailRow = this.detailRow = insertRow(EventListeners.tbody, 1, {
            classes: 'detail',
            hidden: true
        })

        const detailActList = this.#elm_detail_action_list = element('div', {
            classes: 'flex',
            styles: { 'gap': '8px' },
            childrens: [
                element('button', {
                    textContent: 'unsubscribe',
                    on: { click: () => this.sendUnsubscribe() }
                }),
                this.#elm_detail_action_disable = element('button', {
                    textContent: 'disable',
                    on: { click: () => this.sendDisable() }
                })
            ]
        })

        const detailLogTable = createTable({
            classes: ['row-2', 'border', 'fill-x'],
            thead: [[ 'tick', 'action', 'stack' ]]
        })
        this.#elm_detail_log_list = detailLogTable.createTBody()

        insertCell(detailRow, undefined, {
            colSpan: row.cells.length,
            childrens: [
                element('div', [
                    detailLogTable,
                    element('br'),
                    detailActList
                ])
            ]
        })

        this.listId = EventListeners.idOf(isSystem, isBefore, name, fid)
        this.isSystem = isSystem
        this.isBefore = isBefore
        this.isBefore = isBefore
        this.eventName = name
        this.functionId = fid
        this.functionJSON = fn
    
        EventListeners.list.set(this.listId, this)
        if (EventListeners.autoflushEnable && EventListeners.list.size > EventListeners.autoflushThreshold) EventListeners.flush()
    }

    readonly row: HTMLTableRowElement
    #elm_tick
    #elm_status

    readonly detailRow: HTMLTableRowElement
    #elm_detail_log_list
    #elm_detail_action_list
    #elm_detail_action_disable

    readonly listId: string
    readonly objRef: string

    readonly isSystem: boolean
    readonly isBefore: boolean
    readonly eventName: string

    readonly functionId: number
    readonly functionJSON: JSONInspect.Values.Function

    #subscribed = true
    #disabled = false

    get subscribed() { return this.#subscribed }
    set subscribed(v) {
        if (this.#subscribed === v) return
        this.#subscribed = v

        const s = this.#subscribed ? this.#disabled ? 'disabled' : 'subscribed' : 'unsubscribed'
        this.row.dataset.status = s
        this.#elm_status.textContent = s

        this.#elm_detail_action_list.hidden = !v
        EventListeners.#flushCache[v ? 'delete' : 'add'](this.listId)
    }

    get disabled() { return this.#disabled }
    set disabled(v) {
        if (this.#disabled === v) return
        this.#disabled = v

        const s = this.#subscribed ? this.#disabled ? 'disabled' : 'subscribed' : 'unsubscribed'
        this.row.dataset.status = s
        this.#elm_status.textContent = s

        this.#elm_detail_action_disable.textContent = v ? 'enable' : 'disable'
    }

    async sendUnsubscribe() {
        if (!this.#subscribed) return false
        await sendEvalThrowable(this.objRef + '.unsubscribe()')

        this.subscribed = false
        return true
    }

    async sendDisable(disabled = !this.#disabled) {
        if (disabled === this.#disabled) return false
        await sendEvalThrowable(this.objRef + '.disabled = ' + disabled)

        this.disabled = disabled
        return true
    }

    writeLog(tick: number, action: string, stack: string) {
        insertRow(this.#elm_detail_log_list, 0, [
            tick + '',
            action,
            stack
        ])

        if (this.#elm_detail_log_list.rows.length > EventListeners.logLimit) this.#elm_detail_log_list.deleteRow(-1)
    }

    get isListed() { return EventListeners.list.has(this.listId) }
    unlist() {
        if (!this.isListed) return false

        EventListeners.list.delete(this.listId)
        this.row.remove()
        this.detailRow.remove()

        return true
    }
}

{
    const opts = getIdThrow('ev-lis-opts')
    const optsAutoclear = getIdThrow('ev-lis-autoclear', HTMLInputElement)
    const optsClear = getIdThrow('ev-lis-clear', HTMLButtonElement)

    const optsName = getIdThrow('ev-lis-fi-name', HTMLInputElement)
    const optsNameStyle = document.head.appendChild(element('style'))

    // inputs

    optsName.addEventListener('change', () => {
        const fi = optsName.value && optsName.validity.valid
        optsNameStyle.textContent = fi ? `#event-lis-log > tbody > tr:not([data-name*="${optsName.value}"]) { display: none }` : ''
    })

    opts.addEventListener('change', ev => {
        const elm = ev.target
        if (!(
            elm instanceof HTMLInputElement
            && elm.type === 'checkbox'
            && elm.dataset.type
            && elm.dataset.value
        )) return

        const {type, value} = elm.dataset
        EventListeners.table.classList[!elm.checked ? 'add' : 'remove'](`no-${type}-${value}`)
    })

    optsClear.addEventListener('click', () => EventListeners.flush())
    optsAutoclear.addEventListener('change', () => EventListeners.autoflushEnable = optsAutoclear.checked)

    // init & sse

    function initRun(data: [string, NodeBedrockInterpreter.EventListenerData[]][], system: boolean, before: boolean) {
        for (const [id, listeners] of data) {
            for (const data of listeners) {
                const listener = new EventListeners(system, before, id, data.fid, data.fn)
                if (data.disabled) listener.disabled = true
                if (!data.subscribed) listener.subscribed = false

                for (const log of data.logs) listener.writeLog(log.tick, log.mode, log.stack)
            }
        }
    }

    initRun(init.script.eventListeners.world.after, false, false)
    initRun(init.script.eventListeners.world.before, false, true)
    initRun(init.script.eventListeners.system.after, true, false)
    initRun(init.script.eventListeners.system.before, true, true)

    bedrockEvents.addEventListener('event_change', async ({detail: data}) => EventListeners.handle(data))
}
