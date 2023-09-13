import * as chart from 'chart.js'

declare global {
    var Chart: typeof chart.Chart
    type ChartInstance<Ttype extends chart.ChartType = chart.ChartType> = chart.Chart<Ttype>

    type NodeShowKeys = Extract<keyof typeof NodeFilter, `SHOW_${string}`>
    type NodeFilterKeys = Extract<keyof typeof NodeFilter, `FILTER_${string}`>
}
