declare var __date_clock: () => number
declare var console: {
    log(...data: any[]): void
    info(...data: any[]): void
    warn(...data: any[]): void
    error(...data: any[]): void
}
declare class InternalError extends Error {}

interface Function {
    get fileName(): string
    get lineNumber(): number
}
