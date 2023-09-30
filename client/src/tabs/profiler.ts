import init from "../init.js"
import { createTable, element, insertCell, insertRow } from "../lib/element.js"
import { fetchThrow, getIdThrow } from "../lib/misc.js"
import { valueBarCreator } from "../lib/misc2.js"

const timelimeElm = getIdThrow('prf-tl')
const dataElm = getIdThrow('prf-data')
const startStopElm = getIdThrow('profiler-run', HTMLButtonElement)

const barFrameNode = valueBarCreator([0, 192, 255], [0, 0, 255], 20, undefined, undefined, 'top')
const barChildren = valueBarCreator([0, 192, 255], [0, 0, 255], 20, undefined, undefined, 'right')

function nodeRow(tbody: HTMLTableSectionElement, data: NodeBedrock.Profiler, node: Bedrock.Profiler.Node) {
    const children = node.children ?? []

    const row = insertRow(tbody, undefined, [
        node.id + '',
        node.callFrame.scriptId,
        element('div', {
            styles: { background: barChildren(children.length) },
            textContent: children.length + ''
        }),
        node.callFrame.url + ':' + node.callFrame.lineNumber,
        node.callFrame.functionName,
    ])

    const childRow = insertRow(tbody, undefined, { hidden: true })
    if (children) {
        row.addEventListener('click', () => childRow.hidden = !childRow.hidden)
        row.addEventListener('click', () => {
            insertCell(childRow, undefined, {
                colSpan: 5,
                childrens: nodeChildren(data, children)
            })
        }, {
            once: true
        })
    }

    return { row, childRow }
}

function nodeChildren(data: NodeBedrock.Profiler, nodes: number[]) {
    const table = createTable({
        classes: ['row-4', 'fill-x', 'border'],
        thead: [[ 'id', 'scriptID', 'childrens', 'source', 'function' ]]
    })

    const tbody = table.tBodies.item(-1) ?? table.createTBody()
    for (const nodeId of nodes) nodeRow(tbody, data, data.nodes[nodeId])

    return table
}

function generateTimeline(data: NodeBedrock.Profiler) {
    const tickItr = data.ticks.values()
    tickItr.next()

    let [tickData] = tickItr
    let collElms: Node[] = []
    let tickNodes: (number[] | number)[] = []
    let tickOffset = 0

    let frameNodes: number[] = []
    let frameElms: Node[] = []

    for (const [i, delta] of data.timeDeltas.entries()) {
        const node = data.samples[i]
        frameNodes.push(node)

        // same time
        if (delta === 0) continue

        // frame nodes
        const cfnode = frameNodes
        frameNodes = []
        tickNodes.push(cfnode)

        // frame element
        const elm = element('div', {
            classes: 'marker',
            childrens: element('div', {
                styles: { background: barFrameNode(cfnode.length) }
            })
        })
        frameElms.push(elm)

        // tick offset
        tickOffset += delta
        let newTick = tickOffset >= tickData.delta

        // new tick
        while (tickOffset >= tickData.delta) {
            tickOffset -= tickData.delta

            // frame gap
            const remTime = delta - tickOffset
            if (remTime) {
                frameElms.push(element('div', { styles: { width: remTime + '%' } }))
                tickNodes.push(remTime)
            }

            // tick element
            const parElm = element('div', {
                styles: { width: tickData.delta + '%' },
                childrens: frameElms
            })
            frameElms = []

            if (collElms.length) collElms.push(element('div', { classes: 'boundary' }))
            collElms.push(parElm)

            // frame nodes
            const ctnode = tickNodes
            tickNodes = []
            
            // detail
            const table = createTable({
                classes: ['row-4', 'fill-x', 'border'],
                thead: [[ 'id', 'scriptID', 'childrens', 'source', 'function' ]]
            })
            const tbody = table.tBodies.item(-1) ?? table.createTBody()

            parElm.addEventListener('click', () => {
                if (dataElm.firstElementChild === detElm) detElm.remove()
                else dataElm.replaceChildren(detElm)
            })

            parElm.addEventListener('click', () => {
                for (const nodes of ctnode) {
                    if (typeof nodes === 'number') {
                        insertRow(tbody, undefined, element('td', {
                            textContent: `delay: ${nodes / 1000}ms`,
                            colSpan: 5,
                            classes: 'delay'
                        }))
                        insertRow(tbody, undefined)
                        continue
                    }
    
                    for (const nodeId of nodes) nodeRow(tbody, data, data.nodes[nodeId])
                }

                detElm.append(table)
            }, { 
                once: true
            })

            const detElm = element('div', [
                element('div', `tick ${tickData.tick} -> delta: ${tickData.delta / 1000}ms, samples: ${ctnode.reduce((a: number, b) => typeof b === 'number' ? a : a + b.length, 0)}`),
                element('br')
            ])

            // update time frame
            const [ntData] = tickItr
            if (ntData) tickData = ntData
        }

        // frame gap
        const nd = newTick ? tickOffset : delta
        if (nd) {
            frameElms.push(element('div', { styles: { width: nd + '%' } }))
            tickNodes.push(nd)
        }
    }

    timelimeElm.replaceChildren(...collElms)
}

let timelineZoom = 100

timelimeElm.addEventListener('wheel', ev => {
    const { deltaY } = ev
    ev.preventDefault()

    timelineZoom = Math.max(timelineZoom + -Math.sign(deltaY) * timelineZoom / 10, 100)
    timelimeElm.style.width = timelineZoom + '%'
})

let profilerStatus = init.script.profiling
startStopElm.textContent = profilerStatus ? 'stop' : 'start'

startStopElm.addEventListener('click', async () => {
    try {
        startStopElm.disabled = true

        const res = await fetchThrow(`/client/profiler/${profilerStatus ? 'stop' : 'start'}`, { method: 'POST' })        
        
        if (profilerStatus) {
            const data = await res.json()
            generateTimeline(data)
        }

        profilerStatus = !profilerStatus
        startStopElm.textContent = profilerStatus ? 'stop' : 'start'
    } finally {
        startStopElm.disabled = false
    }
})
