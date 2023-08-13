import { ChartDataset } from "chart.js";
import { getIdThrow } from "../lib/misc.js";
import { sseEvents } from "../sse.js";

const tab = getIdThrow('tab-stats')

// count & size
{
    const runtimeLabels: string[] = []

    type RuntimeCountKeys = keyof Bedrock.ProcessEvents['runtime_stats']['runtime'] extends infer R ? R extends `${infer V}_count` ? V : never : never
    type RuntimeSizeKeys = keyof Bedrock.ProcessEvents['runtime_stats']['runtime'] extends infer R ? R extends `${infer V}_size` ? V : never : never

    const countSets: Record<RuntimeCountKeys, ChartDataset<'line'>> = {
        memory_allocated: {
            data: [],
            label: 'memory allocated',
            hidden: true
        },
        memory_used: {
            data: [],
            label: 'memory used'
        },
        atom: {
            data: [],
            label: 'atom',
            hidden: true
        },
        string: {
            data: [],
            label: 'string'
        },
        object: {
            data: [],
            label: 'object'
        },
        property: {
            data: [],
            label: 'property'
        },
        function: {
            data: [],
            label: 'function',
            hidden: true
        },
        function_line: {
            data: [],
            label: 'function line',
            hidden: true
        },
        array: {
            data: [],
            label: 'array'
        },
        fast_array: {
            data: [],
            label: 'fast array',
            hidden: true
        },
        fast_array_element: {
            data: [],
            label: 'fast array elements'
        }
    }
    const countValues = Object.values(countSets)

    const countChart = new Chart(getIdThrow('stats-count', HTMLCanvasElement), {
        type: 'line',
        data: {
            datasets: countValues,
            labels: runtimeLabels,
        },
        options: {
            onResize: self => self.resize(self.canvas.clientWidth, self.canvas.clientHeight),
            maintainAspectRatio: false,
            animation: false,

            plugins: {
                title: {
                    display: true,
                    text: 'size',
                    color: 'white',
                    font: {
                        size: 20,
                        weight: '600'
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },

            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.25)' } },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { precision: 0 }
                }
            }
        }
    })

    const sizeSets: Record<RuntimeSizeKeys, ChartDataset<'line'>> = {
        memory_allocated: {
            data: [],
            label: 'memory allocated',
            hidden: true
        },
        memory_used: {
            data: [],
            label: 'memory used'
        },
        atom: {
            data: [],
            label: 'atom',
            hidden: true
        },
        string: {
            data: [],
            label: 'string'
        },
        object: {
            data: [],
            label: 'object'
        },
        property: {
            data: [],
            label: 'property'
        },
        function: {
            data: [],
            label: 'function',
        },
        function_code: {
            data: [],
            label: 'function code',
            hidden: true
        },
    }
    const sizeValues = Object.values(sizeSets)

    const sizeChart = new Chart(getIdThrow('stats-size', HTMLCanvasElement), {
        type: 'line',
        data: {
            datasets: sizeValues,
            labels: runtimeLabels,
        },
        options: {
            onResize: self => self.resize(self.canvas.clientWidth, self.canvas.clientHeight),
            maintainAspectRatio: false,
            animation: false,

            plugins: {
                title: {
                    display: true,
                    text: 'count',
                    color: 'white',
                    font: {
                        size: 20,
                        weight: '600'
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },

            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.25)' } },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { precision: 0 }
                }
            }
        }
    })

    sseEvents.addEventListener('runtime_stats', ({ detail: data }) => {
        countSets.memory_allocated.data.push(data.runtime.memory_allocated_count)
        countSets.memory_used.data.push(data.runtime.memory_used_count)
        countSets.atom.data.push(data.runtime.atom_count)
        countSets.string.data.push(data.runtime.string_count)
        countSets.object.data.push(data.runtime.object_count)
        countSets.property.data.push(data.runtime.property_count)
        countSets.function.data.push(data.runtime.function_count)
        countSets.function_line.data.push(data.runtime.function_line_count)
        countSets.array.data.push(data.runtime.array_count)
        countSets.fast_array.data.push(data.runtime.fast_array_count)
        countSets.fast_array_element.data.push(data.runtime.fast_array_element_count)

        sizeSets.memory_allocated.data.push(data.runtime.memory_allocated_size)
        sizeSets.memory_used.data.push(data.runtime.memory_used_size)
        sizeSets.atom.data.push(data.runtime.atom_size)
        sizeSets.string.data.push(data.runtime.string_size)
        sizeSets.object.data.push(data.runtime.object_size)
        sizeSets.property.data.push(data.runtime.property_size)
        sizeSets.function.data.push(data.runtime.function_size)
        sizeSets.function_code.data.push(data.runtime.function_code_size)

        runtimeLabels.push('')
        if (runtimeLabels.length > 30) {
            runtimeLabels.shift()
            for (const v of countValues) v.data.shift()
            for (const v of sizeValues) v.data.shift()
        }

        if (!tab.hidden) {
            countChart.update()
            sizeChart.update()
        }
    })
}

// timing
{
    const timingSets: Record<'tick' | 'run' | 'runCount' | 'event', ChartDataset<'line'>> = {
        tick: {
            data: [],
            label: 'tick',
        },
        run: {
            data: [],
            label: 'run',
        },
        runCount: {
            data: [],
            label: 'run count',
        },
        event: {
            data: [],
            label: 'event',
        }
    }
    const timingValues = Object.values(timingSets)
    const timingLabels: string[] = []

    for (const v of timingValues) {
        v.pointStyle = false
        v.pointRadius = 0
    }

    let runTime = 0, runCount = 0, eventTime = 0
    let pendingUpdate = false

    const timingChart = new Chart(getIdThrow('stats-timing', HTMLCanvasElement), {
        type: 'line',
        data: {
            datasets: timingValues,
            labels: timingLabels,
        },
        options: {
            onResize: self => self.resize(self.canvas.clientWidth, self.canvas.clientHeight),
            maintainAspectRatio: false,
            animation: false,

            plugins: {
                title: {
                    display: true,
                    text: 'timing',
                    color: 'white',
                    font: {
                        size: 20,
                        weight: '600'
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },

            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.25)' } },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { precision: 0 }
                }
            }
        }
    })

    sseEvents.addEventListener('data', ({ detail: data }) => {
        switch (data.name) {
            case 'event':
                eventTime += data.data.timing.total
                break
            
            case 'system_run':
                runCount++
                runTime += data.data.delta
                break
            
            case 'tick':
                timingSets.tick.data.push(data.data.delta)
                timingSets.run.data.push(runTime)
                timingSets.runCount.data.push(runCount)
                timingSets.event.data.push(eventTime)

                timingLabels.push(data.data.tick.toString(29))
                if (timingLabels.length > 200) {
                    timingLabels.shift()
                    for (const v of timingValues) v.data.shift()
                }

                runTime = 0, runCount = 0, eventTime = 0
                pendingUpdate = true
            break
        }
    })

    setInterval(() => {
        if (tab.hidden || !pendingUpdate) return

        timingChart.update()
        pendingUpdate = false
    }, 250)
}
