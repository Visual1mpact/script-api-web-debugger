type NodeShowKeys = Extract<keyof typeof NodeFilter, `SHOW_${string}`>
type NodeFilterKeys = Extract<keyof typeof NodeFilter, `FILTER_${string}`>
