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

type Replace<A extends object, B extends object> = Omit<A, keyof B> & B
type ReplaceValue<A extends object, K extends keyof A, B> = Omit<A, K> & Record<K, B>
type RequiredSome<O, K extends keyof O> = O & { [X in K]-?: O[X] }
type ArrayOrReadonly<T> = T[] | readonly T[] | []
