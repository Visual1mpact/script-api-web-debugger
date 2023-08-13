import { createText, element, insertCell, insertRow } from "../lib/element.js";
import { uninspectFunction, uninspectJSONToElement } from "../lib/elminspector.js";
import { uninspectJSON } from "../lib/jsoninspector.js";
import { fetchThrow, getIdThrow, sleep } from "../lib/misc.js";
import { valueBar } from "../lib/misc2.js";
import { bedrockEvents } from "../sse.js";

function timeBar(v: number)  {
    return valueBar(v, [255, 255, 64], [255, 64, 64], 50)
}

{
    const table = getIdThrow('event-log', HTMLTableElement)
    const tbody = table.tBodies.item(0) ?? table.createTBody()
    const logLimit = 200

    const opts = getIdThrow('ev-opts')

    const optsName = getIdThrow('ev-fi-name', HTMLInputElement)
    const optsNameStyle = document.head.appendChild(element('style'))

    // handler

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
        table.classList[!elm.checked ? 'add' : 'remove'](`no-${type}-${value}`)
    })

    function handle(ev: Bedrock.Events['event']) {
        const row = insertRow(tbody, 0, {
            childrens: [
                ev.tick + '',
                ev.isSystem ? 'system' : 'world',
                ev.isBefore ? 'before' : 'after',
                ev.name,
                element('td', {
                    styles: { 'background': valueBar(ev.timing.functions.entries.length, [128,192,255], [64,64,255], 8) },
                    textContent: ev.timing.functions.entries.length + '',
                }),
                element('td', {
                    styles: { 'background': timeBar(ev.timing.total)},
                    textContent: ev.timing.total + 'ms'
                }),
            ],
            datas: {
                type: ev.isSystem ? 'system' : 'world',
                priority: ev.isBefore ? 'before' : 'after',
                name: ev.name
            }
        })

        row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)

        const sTable = element('table', { classes: ['row-2', 'border', 'fill-x'] })
        const sThead = sTable.createTHead()
        const sTbody = sTable.createTBody()
        insertRow(sThead, undefined, [ 'function', 'delay', 'error?' ])

        for (const [{fnRaw}, {delta, errorRaw}] of uninspectJSON(ev.timing.functions) as JSONInspect.Typed.From<Bedrock.Events['event']['timing']['functions']>) {
            insertRow(sTbody, undefined, [
                uninspectFunction(JSON.parse(fnRaw), true).elm,
                element('td', {
                    styles: { 'background': timeBar(delta)},
                    textContent: delta + 'ms'
                }),
                errorRaw ? uninspectJSONToElement(JSON.parse(errorRaw)) : '-'
            ])
        }

        insertRow(sTbody, undefined, [
            '<debugger inspector>',
            element('td', {
                styles: { 'background': timeBar(ev.timing.self)},
                textContent: ev.timing.self + 'ms',
            }),
            '-'
        ])

        const detailRow = insertRow(tbody, 1, {
            classes: 'detail',
            hidden: true
        })

        insertCell(detailRow, undefined, {
            colSpan: row.cells.length,
            childrens: [
                element('div', [
                    sTable,
                    element('br'),
                    element('div', 'data:'),
                    element('div', {
                        classes: 'flow-x',
                        childrens: [uninspectJSONToElement(ev.data)]
                    })
                ])
            ]
        })

        if (tbody.rows.length > logLimit * 2) {
            tbody.deleteRow(-1)
            tbody.deleteRow(-1)
        }
    }

    // init & sse

    const init = fetchThrow('/session/script/event')
        .then(async v => {
            const text = await v.text()
            for (const [i, d] of text.split(/\r?\n/).slice(-logLimit).entries()) {
                if (!d) continue
                handle(JSON.parse(d))
                if (i % 5 === 0) await sleep(1)
            }
        })
        .catch(e => console.error(e))

    bedrockEvents.addEventListener('event', async ({detail: data}) => {
        await init
        handle(data)
    })
}

{
    const table = getIdThrow('event-lis-log', HTMLTableElement)
    const tbody = table.tBodies.item(0) ?? table.createTBody()
    const autoflushThreshold = 100

    const opts = getIdThrow('ev-lis-opts')
    const optsAutoclear = getIdThrow('ev-lis-autoclear', HTMLInputElement)
    const optsClear = getIdThrow('ev-lis-clear', HTMLButtonElement)

    const optsName = getIdThrow('ev-lis-fi-name', HTMLInputElement)
    const optsNameStyle = document.head.appendChild(element('style'))

    const list = new Map<string, {
        readonly row: HTMLTableRowElement

        readonly statusElm: Text
        readonly tickElm: Text

        readonly detail: {
            readonly row: HTMLTableRowElement

            readonly log: HTMLTableSectionElement
            readonly action: HTMLDivElement

            readonly act: {
                list: HTMLDivElement
                unsub: HTMLButtonElement
                disable: HTMLButtonElement
            }
        }

        status: boolean
        disabled: boolean
    }>()

    function idOf(isSystem: boolean, isBefore: boolean, name: string, fid: number) {
        return (isSystem ? 's' : 'w') + (isBefore ? 'b' : 'a') + '/' + name + '/' + fid.toString(36)
    }

    function flush() {
        for (const [k, v] of list)
            if (!v.status) {
                list.delete(k)

                v.row.remove()
                v.detail.row.remove()
            }
    }

    // handler

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
        table.classList[!elm.checked ? 'add' : 'remove'](`no-${type}-${value}`)
    })

    optsClear.addEventListener('click', flush)

    function handle(ev: Bedrock.Events['event_change']) {
        const id = idOf(ev.isSystem, ev.isBefore, ev.name, ev.fid)

        const typeName = ev.isSystem ? 'system' : 'world'
        const priorityName = ev.isBefore ? 'before' : 'after'
        const objRef = `eventListeners.${typeName}_${priorityName}.${ev.name}.listeners.get(${ev.fid})`
        
        switch (ev.mode) {
            case 'subscribe': {
                let data = list.get(id)
                if (!data) {
                    let tickElm, statusElm
                    const row = insertRow(tbody, 0, {
                        childrens: [
                            tickElm = createText(ev.tick + ''),
                            typeName,
                            priorityName,
                            ev.name,
                            statusElm = createText('subscribed'),
                            uninspectFunction(ev.fn, true).elm,
                        ],
                        datas: {
                            type: typeName,
                            priority: priorityName,
                            name: ev.name,
                            status: 'subscribed'
                        }
                    })

                    row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)
    
                    const detailRow = insertRow(tbody, 1, {
                        classes: 'detail',
                        hidden: true
                    })
        
                    const sTable = element('table', { classes: ['row-2', 'border', 'fill-x'] })
                    const sThead = sTable.createTHead()
                    const sTbody = sTable.createTBody()
                    insertRow(sThead, undefined, [ 'tick', 'action', 'stack' ])

                    let detailActListElm, detailActUnsubElm, detailActDisableElm
                    const cellCnt = element('div', [
                        sTable,
                        element('br'),
                        detailActListElm = element('div', {
                            classes: 'flex',
                            styles: { 'gap': '8px' },
                            childrens: [
                                detailActUnsubElm = element('button', 'unsubscribe'),
                                detailActDisableElm = element('button', 'disable')
                            ]
                        })
                    ])
                    insertCell(detailRow, undefined, {
                        colSpan: row.cells.length,
                        childrens: [cellCnt]
                    })
    
                    detailActUnsubElm.addEventListener('click', () => {
                        fetchThrow('/session/sendeval', {
                            method: 'POST',
                            body: `${objRef}.unsubscribe()`
                        })
                    }, { once: true })
    
                    detailActDisableElm.addEventListener('click', () => {
                        fetchThrow('/session/sendeval', {
                            method: 'POST',
                            body: `${objRef}.disabled = ${row.dataset.status !== 'disabled'}`
                        })
                    })
        
                    list.set(id, data = {
                        row,
                        tickElm,
                        statusElm,
                        detail: {
                            row: detailRow,
                            action: detailActListElm,
                            log: sTbody,
                            act: {
                                list: detailActListElm,
                                unsub: detailActUnsubElm,
                                disable: detailActDisableElm
                            }
                        },
                        status: true,
                        disabled: false
                    })
                }

                const { row, statusElm, detail: { action, log, row: detailRow } } = data

                row.remove()
                detailRow.remove()
                tbody.prepend(detailRow)
                tbody.prepend(row)
                
                row.dataset.status = statusElm.textContent = 'subscribed'
                action.hidden = false
                insertRow(log, 0, [
                    ev.tick + '',
                    'subscribe',
                    ev.stack
                ])

                data.status = true

                if (optsAutoclear.checked && tbody.rows.length > autoflushThreshold * 2) flush()
            } break

            case 'unsubscribe': {
                let data = list.get(id)
                if (!data) return

                const { row, statusElm, detail: { action, log } } = data

                row.dataset.status = statusElm.textContent = 'unsubscribed'
                action.hidden = true
                insertRow(log, 0, [
                    ev.tick + '',
                    'unsubscribe',
                    ev.stack
                ])

                data.status = false
            } break

            case 'disable': {
                let data = list.get(id)
                if (!data) return

                const { row, statusElm, detail: { act: { disable: disableElm } } } = data

                data.disabled = true
                row.dataset.status = statusElm.textContent = 'disabled'
                disableElm.textContent = 'enable'
            } break

            case 'enable': {
                let data = list.get(id)
                if (!data) return

                const { row, statusElm, detail: { act: { disable: disableElm } } } = data

                data.disabled = true
                row.dataset.status = statusElm.textContent = 'enabled'
                disableElm.textContent = 'enable'
            } break
        }
    }

    // init & sse

    const init = fetchThrow('/session/script/event_change')
        .then(async v => {
            const text = await v.text()
            for (const [i, d] of text.split(/\r?\n/).entries()) {
                if (!d) continue
                handle(JSON.parse(d))
                if (i % 5 === 0) await sleep(1)
            }
        })
        .catch(e => console.error(e))

    bedrockEvents.addEventListener('event_change', async ({detail: data}) => {
        await init
        handle(data)
    })
}
