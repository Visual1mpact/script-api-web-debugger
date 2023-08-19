import * as chart from 'chart.js'

declare global {
    var Chart: typeof chart.Chart

    type ChartInstance<Ttype extends chart.ChartType = chart.ChartType> = chart.Chart<Ttype>
}
