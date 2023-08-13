import { EventEmitter } from "node:events";

export default class TypedEventEmitter<T extends Record<string | symbol, any>> extends EventEmitter {
    declare addListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare on: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare prependListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare once: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare prependOnceListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this

    declare removeListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare off: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    
    declare emit: <K extends keyof T>(eventName: K, args: T[K]) => boolean 

    declare getMaxListeners: () => number
    declare setMaxListeners: (n: number) => this

    declare eventNames: () => Exclude<keyof T, number>[]

    declare listeners: <K extends keyof T>(eventName: K) => Listener<T[K]>[]
    declare rawListeners: <K extends keyof T>(eventName: K) => Listener<T[K]>[]
    declare listenerCount: <K extends keyof T>(eventName: K, listener?: Listener<T[K]>) => number

    declare removeAllListeners: (event?: keyof T) => this
}

type Listener<T> = (data: T) => any
