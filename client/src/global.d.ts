import * as _chart from 'chart.js'
import * as _hljs from 'highlight.js'

declare global {
    var Chart: typeof _chart.Chart
    var hljs: typeof _hljs.default

    type ChartInstance<Ttype extends _chart.ChartType = _chart.ChartType> = _chart.Chart<Ttype>

    type NodeShowKeys = Extract<keyof typeof NodeFilter, `SHOW_${string}`>
    type NodeFilterKeys = Extract<keyof typeof NodeFilter, `FILTER_${string}`>
}
