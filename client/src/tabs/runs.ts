import { ChartDataset } from "chart.js";
import { createText, element, insertCell, insertRow } from "../lib/element.js";
import { uninspectFunction, uninspectJSONToElement } from "../lib/elminspector.js";
import { fetchThrow, getIdThrow, insertAt, sleep } from "../lib/misc.js";
import { bedrockEvents } from "../sse.js";
import { stableAverage, valueBar as valueBar } from "../lib/misc2.js";

function timeBar(v: number)  {
    return valueBar(v, [255, 255, 64], [255, 64, 64], 50)
}

{
    const table = getIdThrow('run-list', HTMLTableElement)
    const tbody = table.tBodies.item(0) ?? table.createTBody()
    const autoflushThreshold = 200

    const opts = getIdThrow('run-opts')
    const optsAutoclear = getIdThrow('run-o-autoclear', HTMLInputElement)
    const optsPulse = getIdThrow('run-o-pulse', HTMLInputElement)
    const optsClear = getIdThrow('run-o-clear', HTMLButtonElement)

    const list = new Map<number, {
        readonly row: HTMLTableRowElement

        readonly statusElm: Text
        readonly avgTimeElm: HTMLTableCellElement
        readonly maxTimeElm: HTMLTableCellElement

        readonly detail: {
            readonly row: HTMLTableRowElement
            readonly clear: Text
            readonly content: RowDetailData
            readonly act: {
                list: HTMLDivElement
                clear: HTMLButtonElement
                suspend: HTMLButtonElement
            }
        }

        readonly type: Bedrock.T_RunType
        readonly duration: number
        readonly timing: {
            readonly list: number[]
            avg: number
            max: number
        }

        status: boolean
        suspended: boolean
        pending: boolean
    }>()

    type RowDetailData = {
        interval: false

        errElm: HTMLDivElement
    } | {
        interval: true

        table: HTMLTableElement
        tbody: HTMLTableSectionElement

        graph: {
            chart: InstanceType<typeof Chart>
            sets: {
                time: ChartDataset
                avg: ChartDataset
                avgsize: ChartDataset
                avgerr: ChartDataset
            }
            labels: string[]
        }
    }

    function handleChange(ev: Bedrock.Events['system_run_change']) {
        switch (ev.mode) {
            case 'add': {
                let statusElm, avgTimeElm, maxTimeElm
                const row = insertRow(tbody, 0, {
                    childrens: [
                        ev.type,
                        statusElm = createText('active'),
                        ev.duration + '',
                        ev.id + '',
                        uninspectFunction(ev.fn, true).elm,
                        avgTimeElm = element('td', '---'),
                        maxTimeElm = element('td', '---')
                    ],
                    datas: {
                        type: ev.type,
                        status: 'active',
                        exec: 'unexecuted'
                    }
                })
    
                row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)
    
                // detail
    
                const detailRow = insertRow(tbody, 1, {
                    classes: 'detail',
                    hidden: true
                })
    
                let detailClearElm, detailActListElm, detailActClearElm, detailActSuspendElm
                const cellCnt = element('div', [
                    element('div', {
                        styles: { 'grid-area': 'add' },
                        childrens: [
                            element('div', 'add stack'),
                            ev.stack
                        ]
                    }),
                    element('div', {
                        styles: { 'grid-area': 'clear' },
                        childrens: [
                            element('div', 'clear stack'),
                            detailClearElm = createText('-')
                        ]
                    }),
                    detailActListElm = element('div', {
                        classes: 'flex',
                        styles: {
                            'grid-area': 'act',
                            'gap': '8px'
                        },
                        childrens: [
                            detailActClearElm = element('button', 'clear'),
                            detailActSuspendElm = element('button', 'suspend')
                        ]
                    }),
                ])
                insertCell(detailRow, undefined, {
                    colSpan: row.cells.length,
                    childrens: [cellCnt]
                })
    
                detailActClearElm.addEventListener('click', () => {
                    fetchThrow('/session/sendeval', {
                        method: 'POST',
                        body: `system.clearRun(${ev.id})`
                    })
                }, { once: true })

                detailActSuspendElm.addEventListener('click', () => {
                    fetchThrow('/session/sendeval', {
                        method: 'POST',
                        body: `runList.list.get(${ev.id}).suspended = ${row.dataset.status !== 'suspended'}`
                    })
                })
    
                let detailMode: RowDetailData
                if (ev.type === 'runInterval') {
                    const table = element('table', { classes: ['row-2', 'border', 'fill-x'] })
                    const thead = table.createTHead()
                    const tbody = table.createTBody()
                    insertRow(thead, undefined, [ 'tick', 'error?' ])
    
                    const timeSets: ChartDataset = { data: [], label: 'time', pointStyle: false }
                    const avgSets: ChartDataset = { data: [], label: 'average', pointStyle: false }
                    const avgErrSets: ChartDataset = { data: [], label: 'avgerr', pointStyle: false, yAxisID: 'y1', hidden: true }
                    const avgSizeSets: ChartDataset = { data: [], label: 'avgsize', pointStyle: false, yAxisID: 'y1', hidden: true }

                    const labels: string[] = []
                    const chart = new Chart(
                        element('canvas', {
                            classes: ['shrink']
                        }), {
                            type: 'line',
                            data: {
                                labels,
                                datasets: [timeSets, avgSets, avgSizeSets, avgErrSets]
                            },
                            options: {
                                onResize: self => self.resize(self.canvas.clientWidth, self.canvas.clientHeight),
                                maintainAspectRatio: false,
                                animation: false,
                    
                                plugins: {
                                    legend: {
                                        position: 'bottom'
                                    }
                                },
                    
                                scales: {
                                    x: { grid: { color: 'rgba(255, 255, 255, 0.25)' } },
                                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                                    y1: {
                                        type: 'linear',
                                        display: true,
                                        position: 'right',
    
                                        min: 0,
                                        suggestedMax: 100,
    
                                        grid: {
                                            drawOnChartArea: false,
                                            drawTicks: false
                                        }
                                    }
                                }
                            }
                        }
                    )
    
                    cellCnt.append(
                        element('div', {
                            styles: { 'grid-area': 'left' },
                            childrens: [
                                'errors',
                                element('div', {
                                    classes: 'flow-y',
                                    styles: { 'max-height': '250px' },
                                    childrens: [table]
                                })
                            ]
                        })
                    )
    
                    cellCnt.append(
                        element('div', {
                            classes: ['noflow', 'flex-col'],
                            styles: {
                                'grid-area': 'right',
                                'height': '250px'
                            },
                            childrens: [
                                'timing',
                                chart.canvas
                            ]
                        })
                    )
    
                    detailMode = {
                        interval: true,
                        table,
                        tbody,
                        graph: {
                            chart: chart,
                            labels,
                            sets: {
                                time: timeSets,
                                avg: avgSets,
                                avgsize: avgSizeSets,
                                avgerr: avgErrSets
                            }
                        }
                    }
                } else {
                    let errElm
                    cellCnt.append(
                        element('div', {
                            styles: { 'grid-area': 'left' },
                            childrens: [
                                element('div', 'result:'),
                                errElm = element('div', '...')
                            ]
                        })
                    )
    
                    detailMode = {
                        interval: false,
                        errElm
                    }
                }
    
                // list
    
                list.set(ev.id, {
                    row,
    
                    statusElm,
                    avgTimeElm,
                    maxTimeElm,
    
                    detail: {
                        row: detailRow,
                        clear: detailClearElm,
                        content: detailMode,
                        act: {
                            list: detailActListElm,
                            clear: detailActClearElm,
                            suspend: detailActSuspendElm
                        }
                    },
    
                    type: ev.type,
                    duration: ev.duration,
                    timing: {
                        list: [],
                        max: 0,
                        avg: 0
                    },

                    status: true,
                    suspended: false,
                    pending: false,
                })
    
                if (optsAutoclear.checked && tbody.rows.length > autoflushThreshold) flush()
            } break

            case 'clear': {
                const data = list.get(ev.id)
                if (!data) return
    
                const { detail } = data
    
                // data
                data.status = false
    
                // element
                data.statusElm.textContent = 'cleared'
                data.row.dataset.status = 'cleared'
    
                // detail
                detail.clear.textContent = ev.stack
                detail.act.list.remove()
            } break

            case 'suspend': {
                const data = list.get(ev.id)
                if (!data) return

                data.suspended = true

                data.statusElm.textContent = 'suspended'
                data.row.dataset.status = 'suspended'
                data.detail.act.suspend.textContent = 'resume'
            } break

            case 'resume': {
                const data = list.get(ev.id)
                if (!data) return

                data.suspended = false

                data.statusElm.textContent = 'active'
                data.row.dataset.status = 'active'
                data.detail.act.suspend.textContent = 'suspend'
            } break
        }
    }

    function flush() {
        for (const [k, v] of list)
            if (!v.status) {
                list.delete(k)

                const { detail } = v

                v.row.remove()

                detail.row.remove()
                if (detail.content.interval) detail.content.graph.chart.destroy()
            }
    }

    // handler

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

    // init & sse

    const init = fetchThrow('/session/script/system_run_change')
        .then(async v => {
            const text = await v.text()
            for (const [i, d] of text.split(/\r?\n/).entries()) {
                if (!d) continue

                handleChange(JSON.parse(d))
                if (i % 5 === 0) await sleep(1)
            }
        })
        .catch(e => console.error(e))
    
    bedrockEvents.addEventListener('system_run_change', async ({ detail: data }) => {
        await init
        handleChange(data)
    })

    bedrockEvents.addEventListener('system_run', ({ detail: data }) => {
        const int = list.get(data.id)
        if (!int) return

        const { timing, detail: { content: detail } } = int, { list: tlist } = timing

        // timing list
        
        tlist.push(data.delta)

        const max = Math.max(...tlist),
            avg = stableAverage(tlist),
            error = stableAverage( tlist.map( v => Math.max( Math.abs(v - avg) - avg / 5, 0 ) ) )
        
        tlist.splice(0, Math.max( Math.min( (error - 1) * 5 , tlist.length - 5 ), 0, tlist.length - 100 ))

        // timing avg & max

        timing.avg = avg
        timing.max = max

        // pulse
        const pulseCol = data.error ? `255, 128, 128` : `128, 128, 255`
        if (optsPulse.checked) int.row.animate([
            { background: `rgba(${pulseCol}, 0.2)` },
            { background: `rgba(${pulseCol}, 0.0)` },
        ], {
            duration: 250,
            composite: 'add'
        })
    
        // data
        int.row.dataset.exec = 'executed'
        int.pending = true

        // detail
        if (detail.interval) {
            const { graph: { labels, sets }, tbody } = detail

            sets.avg.data.push(avg)
            sets.time.data.push(data.delta)
            sets.avgsize.data.push(tlist.length)
            sets.avgerr.data.push(error * 100)

            labels.push(data.tick.toString(20))
            if (labels.length > 100) {
                for (const f of Object.values(sets)) f.data.shift()
                labels.shift()
            }

            if (data.error) {
                insertRow(tbody, 0, [
                    data.tick + '',
                    uninspectJSONToElement(data.error)
                ])

                if (tbody.rows.length > 10) tbody.deleteRow(-1)
            }
        } else {
            detail.errElm.replaceChildren(data.error ? uninspectJSONToElement(data.error) : '-')
        }
    })

    // footer

    const footer = {
        rcount: getIdThrow('rfoot-rcount'),
        avgtime: getIdThrow('rfoot-avgtime'),
        avgpeak: getIdThrow('rfoot-avgpeak'),
        maxtime: getIdThrow('rfoot-maxtime')
    }

    setInterval(() => {
        let avgtime = 0, avgpeak = 0, peaktime = 0, c = 0
        for (const data of list.values()) {
            // updater
            for (const v of list.values()) {
                if (v.pending) {
                    const { avgTimeElm, maxTimeElm, timing: { avg, max, list } } = v
                    v.pending = false
                        
                    avgTimeElm.textContent = `${avg.toFixed(2).padStart(5)}ms (${list.length})`
                    avgTimeElm.style.background = timeBar(avg)
        
                    maxTimeElm.textContent = max + 'ms'
                    maxTimeElm.style.background = timeBar(max)

                    if (v.detail.content.interval && !v.detail.row.hidden)
                        v.detail.content.graph.chart.update()
                }
            }

            // footer
            if (data.status && !data.suspended && data.type !== 'runTimeout') {
                const timing = data.timing
                c++
                avgpeak += timing.avg
                avgtime += timing.avg / Math.max(data.duration, 1)
                peaktime += timing.max
            }
        }

        footer.rcount.textContent = c + ''
        footer.avgtime.textContent = avgtime.toFixed(2) + 'ms'
        footer.avgpeak.textContent = avgpeak.toFixed(2) + 'ms'
        footer.maxtime.textContent = peaktime + 'ms'
    }, 250)
}

// run time
{
    const table = getIdThrow('rtime-list', HTMLTableElement)
    const tbody = table.tBodies.item(0) ?? table.createTBody()

    const optsMinDelay = getIdThrow('rtime-o-mindelay', HTMLInputElement)
    const optsMinCount = getIdThrow('rtime-o-mincount', HTMLInputElement)
    const optsFilterIds = getIdThrow('rtime-o-filterids', HTMLInputElement)

    const optsPause = getIdThrow('rtime-o-pause', HTMLButtonElement)

    let fns: Bedrock.Events['system_run'][] = []
    let stall: HTMLTableRowElement[] = []

    // handler

    let rtimePaused = false
    optsPause.addEventListener('click', () => {
        if (rtimePaused = !rtimePaused) {
            optsPause.textContent = 'resume'
            fns = []
        } else {
            optsPause.textContent = 'pause'
        }
    })

    function updateFilter() {
        for (let i = 0; i < tbody.rows.length; i += 2) {
            const row = tbody.rows.item(i)
            if (!row) continue
            row.hidden = !testFilter(row.dataset)
        }
    }

    function testFilter({time = '0', count = '0', ids = ''}: DOMStringMap) {
        return +time >= optsMinDelay.valueAsNumber
            && +count >= optsMinCount.valueAsNumber
            && ( optsFilterIds.validity.valid && optsFilterIds.value ? RegExp(optsFilterIds.value.replace(/\d+/g, ',$&,')).test(ids) : true )
    }

    optsMinDelay.addEventListener('change', updateFilter)
    optsMinCount.addEventListener('change', updateFilter)
    optsFilterIds.addEventListener('change', updateFilter)

    // sse

    bedrockEvents.addEventListener('system_run', ({ detail: data }) => {
        if (!rtimePaused) fns.push(data)
    })

    bedrockEvents.addEventListener('tick', ({ detail: data }) => {
        if (rtimePaused) return

        const tTime = fns.reduce((a, b) => a + b.delta, 0)
        const len = fns.length

        // row

        const row = element('tr', {
            childrens: [
                data.tick + '',
                element('td', {
                    styles: { 'background': timeBar(tTime)},
                    textContent: tTime + 'ms'
                }),
                element('td', {
                    styles: { 'background': valueBar(len, [128,192,255], [64,64,255], 20)},
                    textContent: len + '',
                })
            ],
            datas: {
                time: tTime + '',
                count: len + '',
                ids: ',' + fns.map(v => v.id).join(',') + ','
            }
        })

        row.hidden = !testFilter(row.dataset)

        row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)

        // detail

        const sTable = element('table', { classes: ['row-2', 'border', 'fill-x'] })
        const sThead = sTable.createTHead()
        const sTbody = sTable.createTBody()
        insertRow(sThead, undefined, [ 'id', 'function', 'time', 'error?' ])

        for (const d of fns) {
            insertRow(sTbody, undefined, [
                d.id + '',
                uninspectFunction(d.fn, true).elm,
                element('td', {
                    styles: { 'background': timeBar(d.delta)},
                    textContent: d.delta + 'ms'
                }),
                d.error ? uninspectJSONToElement(d.error) : '-'
            ])
        }

        const detailRow = element('tr', {
            classes: 'detail',
            hidden: true,
        })

        insertCell(detailRow, undefined, {
            colSpan: 3,
            childrens: [ element('div', sTable) ]
        })

        // data

        fns = []
        stall.push(row, detailRow)
    })

    setInterval(() => {
        for (const [i, d] of stall.entries()) insertAt(tbody, i, d)
        while (tbody.rows.length > 400) tbody.deleteRow(-1)

        stall = []
    }, 200)
}
