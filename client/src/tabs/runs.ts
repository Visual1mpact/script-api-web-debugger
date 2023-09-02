import { createTable, createText, element, insertCell, insertRow } from "../lib/element.js";
import { uninspectFunction, uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { getIdThrow, iterateLength } from "../lib/misc.js";
import { bedrockEvents } from "../sse.js";
import { stableAverage, valueBar as valueBar } from "../lib/misc2.js";
import { sendEvalThrowable } from "../util.js";
import init from "../init.js";
import { ChartDataset } from "chart.js";

function timeBar(v: number)  {
    return valueBar(v, [255, 255, 64], [255, 64, 64], 50)
}

export abstract class RunList {
    static readonly table = getIdThrow('run-list', HTMLTableElement)
    static readonly tbody = this.table.tBodies.item(0) ?? this.table.createTBody()

    static readonly list = new Map<number, RunList>()

    static autoflushThreshold = 100
    static autoflushEnable = true
    static #flushCache = new Set<number>()

    static pulse = false

    static flush() {
        for (const id of this.#flushCache) this.list.get(id)?.unlist()
        this.#flushCache.clear()
    }

    static handleRun(ev: Bedrock.Events['system_run']) {
        this.list.get(ev.id)?.tick(ev.tick, ev.delta, ev.error)
    }

    constructor(id: number, type: RunType, duration: number, fn: JSONInspect.Values.Function, addStack = '---', addTick = '---') {
        this.id = id
        this.type = type
        this.duration = duration
        this.fuctionJSON = fn

        const row = this.row = insertRow(RunList.tbody, 0, {
            childrens: [
                type,
                this.#elm_status = createText('active'),
                duration + '',
                id + '',
                uninspectFunction(fn, true).elm,
                this.elm_avgTime = element('td', '---'),
                this.elm_maxTim = element('td', '---')
            ],
            datas: {
                type:  type,
                status: 'active',
                exec: 'unexecuted'
            },
            on: {
                click: () => detailRow.hidden = !detailRow.hidden
            }
        })

        const detailRow = this.detailRow = insertRow(RunList.tbody, 1, {
            classes: 'detail',
            hidden: true
        })

        const cellCnt = this.detailCnt = element('div', [
            element('div', {
                styles: { 'grid-area': 'add' },
                childrens: [
                    element('div', [ 'add stack (tick ', this.#elm_detail_addtick = createText(addTick), ')' ]),
                    this.#elm_detail_addstack = createText(addStack)
                ]
            }),
            element('div', {
                styles: { 'grid-area': 'clear' },
                childrens: [
                    element('div', [ 'clear stack (tick ', this.#elm_detail_cleartick = createText('-'), ')' ]),
                    this.#elm_detail_clearstack = createText('-')
                ]
            }),
            this.#elm_detail_act_list = element('div', {
                classes: 'flex',
                styles: {
                    'grid-area': 'act',
                    'gap': '8px'
                },
                childrens: [
                    element('button', {
                        textContent: 'clear',
                        on: { click: () => this.sendClear() }
                    }),
                    this.#elm_detail_act_suspend = element('button', {
                        textContent: 'suspend',
                        on: { click: () => this.sendSuspend() }
                    })
                ]
            })
        ])

        insertCell(detailRow, undefined, {
            colSpan: row.cells.length,
            childrens: [cellCnt]
        })

        RunList.list.set(this.id, this)
        if (RunList.autoflushEnable && RunList.list.size > RunList.autoflushThreshold) RunList.flush()
    }

    readonly id: number
    readonly type: RunType
    readonly duration: number
    readonly fuctionJSON: JSONInspect.Values.Function

    readonly row: HTMLTableRowElement
    #elm_status
    readonly elm_avgTime
    readonly elm_maxTim

    readonly detailRow: HTMLTableRowElement
    readonly detailCnt: HTMLDivElement
    #elm_detail_addtick
    #elm_detail_addstack
    #elm_detail_cleartick
    #elm_detail_clearstack
    #elm_detail_act_list
    #elm_detail_act_suspend

    #suspended = false
    #cleared = false

    get addTick() { return this.#elm_detail_addtick.textContent }
    set addTick(v) { this.#elm_detail_addtick.textContent = v }

    get addStack() { return this.#elm_detail_addstack.textContent }
    set addStack(v) { this.#elm_detail_addstack.textContent = v }

    get clearTick() { return this.#elm_detail_cleartick.textContent }
    set clearTick(v) { this.#elm_detail_cleartick.textContent = v }

    get clearStack() { return this.#elm_detail_clearstack.textContent }
    set clearStack(v) { this.#elm_detail_clearstack.textContent = v }

    get suspended() { return this.#suspended }
    set suspended(v) {
        if (this.#suspended === v) return
        this.#suspended = v
    
        const s = this.#cleared ? 'cleared' : this.#suspended ? 'suspended' : 'active'
        this.#elm_status.textContent = s
        this.row.dataset.status = s

        this.#elm_detail_act_suspend.textContent = v ? 'resume' : 'suspend'
    }

    get cleared() { return this.#cleared }
    set cleared(v) {
        if (this.#cleared === v) return
        this.#cleared = v
    
        const s = this.#cleared ? 'cleared' : this.#suspended ? 'suspended' : 'active'
        this.#elm_status.textContent = s
        this.row.dataset.status = s

        this.#elm_detail_act_list.hidden = v
        RunList.#flushCache[v ? 'add' : 'delete'](this.id)
    }

    async sendClear() {
        if (this.cleared) return false
        await sendEvalThrowable(`system.clearRun(${this.id})`)

        this.cleared = true
        return true
    }

    async sendSuspend(suspended = !this.suspended) {
        if (suspended === this.suspended) return false
        await sendEvalThrowable(`runList.list.get(${this.id}).suspended = ${suspended}`)

        this.suspended = suspended
        return true
    }

    clear(stack?: string, tick?: string) {
        if (this.cleared) return false

        this.cleared = true
        if (stack) this.clearStack = stack
        if (tick) this.clearTick = tick

        return true
    }

    delays: number[] = []
    maxDelay = 0
    avgDelay = 0

    pendingRender = false
    renderLastAvg = 0
    renderLastMax = 0

    tick(tick: number, delay: number, error?: JSONInspect.All) {
        this.pendingRender = true
        this.row.dataset.exec = 'executed'

        const delays = this.delays
        delays.push(delay)
        const avg = stableAverage(delays)
        const max = Math.max(...delays)

        const avgError = stableAverage( delays.map( v => Math.max( Math.abs(v - avg) - avg / 5, 0 ) ) )
        delays.splice(0, Math.max( Math.min( (avgError - 1) * 5 , delays.length - 5 ), 0, delays.length - 100 ))

        this.maxDelay = max
        this.avgDelay = avg

        const pulseCol = error ? `255, 128, 128` : `128, 128, 255`
        if (RunList.pulse) this.row.animate([
            { background: `rgba(${pulseCol}, 0.2)` },
            { background: `rgba(${pulseCol}, 0.0)` },
        ], {
            duration: 250,
            composite: 'add'
        })

        this._handleList(tick, delay, error, avg, avgError)
    }

    get isListed() { return RunList.list.has(this.id) }
    unlist() {
        if (!this.isListed) return false

        RunList.list.delete(this.id)
        this.row.remove()
        this.detailRow.remove()

        return true
    }

    abstract _handleList(tick: number, delay: number, error: JSONInspect.All | undefined, timingAvgDelay: number, timingAvgError: number): void
}

export class RunTimeoutList extends RunList {
    constructor(id: number, type: 'run' | 'runTimeout', duration: number, fn: JSONInspect.Values.Function, addStack = '', addTick = '---') {
        super(id, type, duration, fn, addStack, addTick)

        this.detailCnt.append(
            element('div', {
                styles: { 'grid-area': 'cnt' },
                childrens: [
                    createTable({
                        classes: 'space-x',
                        tbody: [
                            ['tick'  , this.#res_tick = createText('--')],
                            ['delay' , this.#res_delay = createText('--')],
                            ['error?', this.#res_error = element('div')]
                        ]
                    })
                ]
            })
        )
    }

    #res_tick: Text
    #res_delay: Text
    #res_error: HTMLElement

    declare type: 'run' | 'runTimeout'

    _handleList(tick: number, delay: number, error: JSONInspect.All | undefined, timingAvgDelay: number, timingAvgError: number) {
        this.#res_tick.textContent = tick + ''
        this.#res_delay.textContent = delay + 'ms'
        if (error) this.#res_error.replaceChildren(uninspectJSONToElement(error))
    }
}

export class RunIntervalList extends RunList {
    constructor(id: number, type: 'runInterval', duration: number, fn: JSONInspect.Values.Function, addStack = '', addTick = '---') {
        super(id, type, duration, fn, addStack, addTick)

        const etable = createTable({
            styles: { 'grid-area': '1 / 1 / 1 / 1' },
            classes: ['row-2', 'border', 'fill-x'],
            thead: [['tick', 'error?']]
        })
        const etbody = etable.createTBody()

        const labels: string[] = []
        const sets: Record<'time' | 'avg' | 'avgErr' | 'avgSize', ChartDataset<'line'>> = {
            time    : { data: [], label: 'time', pointStyle: false },
            avg     : { data: [], label: 'average', pointStyle: false },
            avgErr  : { data: [], label: 'avgerr', pointStyle: false, yAxisID: 'y1', hidden: true },
            avgSize : { data: [], label: 'avgsize', pointStyle: false, yAxisID: 'y1', hidden: true }
        }

        const chart = new Chart<'line'>(
            element('canvas'),
            {
                type: 'line',
                data: {
                    labels,
                    datasets: Object.values(sets)
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

        this.detailCnt.append(
            element('div', {
                classes: 'run-cnt-interval',
                childrens: [
                    element('div', {
                        styles: { 'grid-area': ' 1 / 1 / 1 / 1' },
                        classes: ['flow-y', 'fill-y'],
                        childrens: [etable]
                    }),
                    element('div', {
                        styles: { 'grid-area': '1 / 2 / 1 / 2' },
                        classes: ['shrink-max', 'noflow'],
                        childrens: [chart.canvas]
                    })
                ]
            })
        )

        this.#errTbody = etbody
        this.#graph = { chart, sets, labels }
    }

    declare type: 'runInterval'

    #errTbody: HTMLTableSectionElement
    #graph: {
        chart: ChartInstance<'line'>
        sets: {
            time: ChartDataset
            avg: ChartDataset
            avgErr: ChartDataset
            avgSize: ChartDataset
        }
        labels: string[]
    }

    get chart() { return this.#graph.chart }

    _handleList(tick: number, delay: number, error: JSONInspect.All | undefined, timingAvgDelay: number, timingAvgError: number) {
        if (error) {
            const etbody = this.#errTbody

            insertRow(etbody, 0, [
                tick + '',
                uninspectJSONToElement(error)
            ])

            if (etbody.rows.length > 20) etbody.deleteRow(-1)
        }

        const { sets, labels } = this.#graph

        sets.time.data.push(delay)
        sets.avg.data.push(timingAvgDelay)
        sets.avgErr.data.push(timingAvgError * 100)
        sets.avgSize.data.push(this.delays.length)

        labels.push(tick.toString(20))
        if (labels.length > 100) {
            labels.shift()
            for (const set of Object.values(sets)) set.data.shift()
        }
    }

    unlist() {
        if (!super.unlist()) return false

        this.#graph.chart.destroy()

        return true
    }
}

function handleRunChange(ev: Bedrock.Events['system_run_change']) {
    const { id, type, duration, fn, stack, mode } = ev

    let data = RunList.list.get(ev.id)
    if (!data) data = type === 'runInterval' ? new RunIntervalList(id, type, duration, fn, stack) : new RunTimeoutList(id, type, duration, fn, stack)

    switch (mode) {
        case 'add': break

        case 'clear': data.clear(ev.stack); break
        case 'resume': data.suspended = false; break
        case 'suspend': data.suspended = true; break
    }
}

{
    const opts = getIdThrow('run-opts')
    const optsAutoclear = getIdThrow('run-o-autoclear', HTMLInputElement)
    const optsPulse = getIdThrow('run-o-pulse', HTMLInputElement)
    const optsClear = getIdThrow('run-o-clear', HTMLButtonElement)

    // inputs

    opts.addEventListener('change', ev => {
        const elm = ev.target
        if (!(
            elm instanceof HTMLInputElement
            && elm.type === 'checkbox'
            && elm.dataset.type
            && elm.dataset.value
        )) return

        const {type, value} = elm.dataset
        RunList.table.classList[!elm.checked ? 'add' : 'remove'](`no-${type}-${value}`)
    })

    optsClear.addEventListener('click', () => RunList.flush())
    optsAutoclear.addEventListener('change', () => RunList.autoflushEnable = optsAutoclear.checked)
    optsPulse.addEventListener('change', () => RunList.pulse = optsPulse.checked)

    // init & sse

    RunList.autoflushThreshold = init.limits.systemRuns

    for (const { id, duration, fn, addTick, addStack, type, clearTick, clearStack, isCleared, isSuspended } of init.script.systemRuns) {
        const data = type === 'runInterval'
            ? new RunIntervalList(id, type, duration, fn, addStack, addTick + '')
            : new RunTimeoutList(id, type, duration, fn, addStack, addTick + '')

        if (isCleared) data.clear(clearStack, clearTick + '')
        if (isSuspended) data.suspended = true
    }

    bedrockEvents.addEventListener('system_run_change', async ({ detail: data }) => handleRunChange(data))
    bedrockEvents.addEventListener('system_run', ({ detail: data }) => RunList.handleRun(data))

    // footer & async updater

    const footer = {
        rcount: getIdThrow('rfoot-rcount'),
        avgtime: getIdThrow('rfoot-avgtime'),
        avgpeak: getIdThrow('rfoot-avgpeak'),
        maxtime: getIdThrow('rfoot-maxtime')
    }

    setInterval(() => {
        let avgtime = 0, avgpeak = 0, peaktime = 0, c = 0
        for (const data of RunList.list.values()) {
            const { maxDelay, avgDelay } = data

            // updater
            if (data.pendingRender) {
                const { elm_avgTime, elm_maxTim, delays } = data
                data.pendingRender = false

                elm_avgTime.textContent = `${avgDelay.toFixed(2).padStart(5)}ms (${delays.length})`
                elm_maxTim.textContent = maxDelay + 'ms'
                
                if (Math.abs(data.renderLastAvg - avgDelay) >= 0.1) {
                    data.renderLastAvg = avgDelay
                    elm_avgTime.style.background = timeBar(avgDelay)
                }

                if (data.renderLastMax !== maxDelay) {
                    data.renderLastMax = maxDelay
                    elm_maxTim.style.background = timeBar(maxDelay)
                }

                if (data instanceof RunIntervalList && !data.detailRow.hidden) data.chart.update()
            }

            // footer
            if (!data.cleared && !data.suspended && data.type !== 'runTimeout') {
                c++
                avgpeak += avgDelay
                avgtime += avgDelay / Math.max(data.duration, 1)
                peaktime += maxDelay
            }
        }

        footer.rcount.textContent = c + ''
        footer.avgtime.textContent = avgtime.toFixed(2) + 'ms'
        footer.avgpeak.textContent = avgpeak.toFixed(2) + 'ms'
        footer.maxtime.textContent = peaktime + 'ms'
    }, 250)
}

export class RunLogList {
    static readonly table = getIdThrow('rtime-list', HTMLTableElement)
    static readonly list = this.table.tBodies.item(0) ?? this.table.createTBody()

    static logLimit = 200

    static #filterMinDelay = 1
    static #filterMinCount = 1
    static #filterId = /.?/

    static get filterMinDelay() { return this.#filterMinDelay }
    static set filterMinDelay(v) {
        this.#filterMinDelay = v
        this.#updateFilter()
    }
    static get filterMinCount() { return this.#filterMinCount }
    static set filterMinCount(v) {
        this.#filterMinCount = v
        this.#updateFilter()
    }
    static get filterId() { return this.#filterId }
    static set filterId(v) {
        this.#filterId = v
        this.#updateFilter()
    }

    static #updateFilter() {
        for (const row of iterateLength(this.list.rows))
            if (!row.classList.contains('detail'))
                row.hidden = !this.#testFilter(row.dataset)
    }

    static #testFilter({time = '0', count = '0', ids = ''}: DOMStringMap) {
        return +time >= this.filterMinDelay
            && +count >= this.filterMinCount
            && this.#filterId.test(ids)
    }

    constructor(tick = 0, count = 0, delay = 0, ids: number[] = []) {
        this.row = insertRow(RunLogList.list, 0, {
            childrens: [
                this.#elm_tick = createText(tick + ''),
                this.#elm_runs_bar = element('td', {
                    styles: { background: valueBar(count, [128,192,255], [64,64,255], 8) },
                    textContent: count + ''
                }),
                this.#elm_timing_bar = element('td', {
                    styles: { background: timeBar(delay) },
                    textContent: delay + 'ms'
                })
            ],
            datas: {
                time: delay + '',
                count: count + '',
                ids: ids.join(' ')
            },
            on: {
                click: () => detailRow.hidden = !detailRow.hidden
            }
        })

        this.row.hidden = !RunLogList.#testFilter(this.row.dataset)

        const sTable = createTable({
            classes: ['row-2', 'border', 'fill-x'],
            thead: [[ 'id', 'function', 'time', 'error?' ]]
        })
        this.#elm_detail_timing_list = sTable.createTBody()

        const detailRow = this.detailRow = insertRow(RunLogList.list, 1, {
            classes: 'detail',
            hidden: true,
            childrens: [
                element('td', {
                    colSpan: 3,
                    childrens: [ element('div', sTable) ]
                })
            ]
        })

        if (RunLogList.list.rows.length > RunLogList.logLimit * 2) {
            RunLogList.list.deleteRow(-1)
            RunLogList.list.deleteRow(-1)
        }
    }

    readonly row: HTMLTableRowElement
    #elm_tick
    #elm_runs_bar
    #elm_timing_bar

    readonly detailRow: HTMLTableRowElement
    #elm_detail_timing_list

    get tick() { return Number(this.#elm_tick.textContent) }
    set tick(v) { this.#elm_tick.textContent = String(v) }

    setTiming(list: Iterable<LogType>) {
        let c = 0, t = 0, ids: number[] = []

        this.#elm_detail_timing_list.replaceChildren()

        for (const { fn, time, error, id } of list) {
            insertRow(this.#elm_detail_timing_list, undefined, [
                id + '',
                uninspectFunction(fn, true).elm,
                element('td', {
                    styles: { 'background': timeBar(time)},
                    textContent: time + 'ms'
                }),
                error ? uninspectJSONToElement(error) : '-'
            ])

            c ++
            t += time
            ids.push(id)
        }

        this.#elm_runs_bar.style.background = valueBar(c, [128,192,255], [64,64,255], 8)
        this.#elm_runs_bar.textContent = c + ''

        this.#elm_timing_bar.style.background = timeBar(t)
        this.#elm_timing_bar.textContent = t + 'ms'

        this.row.dataset.time = t + ''
        this.row.dataset.count = c + ''
        this.row.dataset.ids = ids.join(' ')

        this.row.hidden = !RunLogList.#testFilter(this.row.dataset)

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
    const optsMinDelay = getIdThrow('rtime-o-mindelay', HTMLInputElement)
    const optsMinCount = getIdThrow('rtime-o-mincount', HTMLInputElement)
    const optsFilterIds = getIdThrow('rtime-o-filterids', HTMLInputElement)
    const optsPause = getIdThrow('rtime-o-pause', HTMLButtonElement)

    // inputs

    let rtimePaused = false
    optsPause.addEventListener('click', () => {
        if (rtimePaused = !rtimePaused) {
            optsPause.textContent = 'resume'
            fns = []
        } else {
            optsPause.textContent = 'pause'
        }
    })

    optsMinDelay.addEventListener('change', () => RunLogList.filterMinDelay = optsMinDelay.valueAsNumber)
    optsMinCount.addEventListener('change', () => RunLogList.filterMinCount = optsMinCount.valueAsNumber)
    optsFilterIds.addEventListener('change', () => RunLogList.filterId = !optsFilterIds.validity.valid ? /.?/ : RegExp(optsFilterIds.value.replace(/\d+/, '\\b$&\\b')))

    // sse & async renderer

    let fns: LogType[] = [], ids: number[] = [], delayTotal = 0
    let stall: [tick: number, fns: LogType[], ids: number[], delayTotal: number][] = []

    bedrockEvents.addEventListener('system_run', ({ detail: data }) => {
        if (rtimePaused) return

        fns.push({
            fn: data.fn,
            id: data.id,
            error: data.error,
            time: data.delta
        })
        ids.push(data.id)
        delayTotal += data.delta
    })

    bedrockEvents.addEventListener('tick', ({ detail: data }) => {
        if (rtimePaused) return

        stall.push([ data.tick, fns, ids, delayTotal ])
        fns = []
        ids = []
        delayTotal = 0
    })

    setInterval(() => {
        for (const [tick, timing, ids, delay] of stall) {
            const log = new RunLogList(tick, ids.length, delay, ids)
            log.row.addEventListener('click', () => log.setTiming(timing), { once: true })
        }
        stall = []
    }, 200)
}

type RunType = 'run' | 'runTimeout' | 'runInterval'
type LogType = {
    id: number;
    fn: JSONInspect.Values.Function;
    time: number;
    error?: JSONInspect.All
}
