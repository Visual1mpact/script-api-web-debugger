import type { AbortController, PromiseController } from "./abortctrl.js"

export default class EventEmitter<Events extends Record<string, any>> {
    /**
     * Creates a new event emitter.
     * @param name Event emitter name.
     */
    constructor(name: string = '') {
        this.eventEmitterName = name
    }

    /** Name for the event emitter. */
    eventEmitterName = ''

    #listeners: {
        [K in keyof Events]?: {
            prioritizations: Map<Listener<Events[K]>, EventListenerOptions>[]
            listeners: Map<Listener<Events[K]>, number>
            handlers: { [K in keyof HandlerEvents<Events>]?: Set<Handler<HandlerEvents<Events>[K]>> }
        }
    } = Object.create(null)

    #handlers: { [K in keyof HandlerEvents<Events>]?: Set<Handler<HandlerEvents<Events>[K]>> } = Object.create(null)

    /**
     * Adds a function listener to an event.
     * @param name Event name
     * @param listener Function listener
     * @param options Listening options. Properties may be modified.
     * @returns Function listener
     */
    addEventListener<K extends keyof Events, L extends Listener<Events[K]>>(name: K, listener: L, options: EventListenerOptions = {}): L {
        //@ts-ignore
        const x = this.#emitEventHandler('addEventListener', {
            name,
            listener,
            options,
            cancel: false,
        })

        if (x.cancel) return listener

        options = x.options

        const data = this.#listeners[name] ??= {
            prioritizations: [],
            listeners: new Map,
            handlers: Object.create(null)
        }

        // delete old
        if (data.listeners.has(listener))
            data.prioritizations[data.listeners.get(listener) ?? eventPriority.none]?.delete(listener)

        // add listener & priority listener
        const priority = eventPriority[options.priority ?? 'none']
        data.listeners.set(listener, priority)

        const map = data.prioritizations[priority] ??= new Map
        map.set(listener, options)

        // signal
        if (options.signal) {
            const { signal } = options
            const f = () => this.removeEventListener(name, listener)

            if ('addEventListener' in signal) signal.addEventListener('abort', f)
            else if ('promise' in signal) signal.promise.finally(f)
            else signal.finally(f)
        }
        
        return listener
    }

    /** Alias for {@link addEventListener}. */
    get on() { return this.addEventListener }

    /**
     * Removes a function listener from an event.
     * @param name Event name
     * @param listener Function listener
     * @returns Boolean -- true if function listener successfully removed.
     */
    removeEventListener<K extends keyof Events>(name: K, listener: Listener<Events[K]>): boolean {
        //@ts-ignore
        const x = this.#emitEventHandler('removeEventListener', {
            name,
            listener,
            cancel: false
        })

        if (x.cancel) return false

        const data = this.#listeners[name]
        return data !== undefined
            && Boolean( data.prioritizations[data.listeners.get(listener) ?? eventPriority.none]?.delete(listener) )
            && data.listeners.delete(listener)
    }

    /**
     * Triggers an event.
     * @param name Event name
     * @param data Event data. Data may be modified.
     * @param options Event options. Data may be modified.
     * @returns Trigger result.
     */
    emit<K extends keyof Events>(name: K, data: Events[K], options?: EmitControlOptions): EmitResult<Events[K]> {
        const x = this.#emitEventHandler('emit', {
            name,
            data,
            options: options ?? {},
            cancel: false,
            returnBreaked: false,
            returnCanceled: false
        })

        if (x.cancel) return {
            breaked: x.returnBreaked,
            canceled: x.returnCanceled,
            data
        }

        options = x.options

        const itr = this.#listeners[name]
        if (!itr) return { canceled: false, breaked: false, data }
        
        const opts =  Object.assign({
            allowBreak: false,
            allowCancel: false,
            errorAction: 'log',
        }, options)

        const ctrl = new EmitContol(opts)

        for (const map of itr.prioritizations)
            if (map) for (const [listener, config] of map) {
                try {
                    listener(data, ctrl)
                } catch(e) {
                    console.error(e)

                    switch (opts.errorAction) {
                        case 'throw':
                            throw e
                        
                        case 'break':
                            return { canceled: ctrl.canceled, breaked: true, data }
                    }
                } finally {
                    if (config.once) map.delete(listener)
                }

                // breaked
                if (ctrl.breaked)
                    return { canceled: ctrl.canceled, breaked: true, data }
            }

        return { canceled: ctrl.canceled, breaked: false, data }
    }

    /**
     * Removes event listeners.
     * @param name Event name. If unspecified, this removes all listeners.
     */
    removeEventListeners(name?: keyof Events) {
        if ( this.#emitEventHandler('removeEventListeners', { name, cancel: false }).cancel ) return
        
        if (!name) {
            this.#listeners = Object.create(null)
            return
        }

        delete this.#listeners[name]
    }

    /**
     * Adds a function handler which allows to take control over actions.
     * @param name Handler name.
     * @param local Local event name. If unspecified, this adds the handler to all event names.
     * @param handler Function handler.
     * @returns Function handler
     */
    addEventHandler<K extends keyof HandlerEvents<Events>, H extends Handler<HandlerEvents<Events>[K]>>(name: K, local: keyof Events | null | undefined,handler: H): H {
        ( local ? ( ( this.#listeners[local] ??= { prioritizations: [], listeners: new Map, handlers: Object.create(null) } ).handlers[name] ??= new Set<any>() ) : this.#handlers[name] ??= new Set<any>() ).add(handler)
        return handler
    }

    /**
     * Removes a function handler.
     * @param name Handler name.
     * @param local Local event name. Requires to be specified if the initial handler is specified locally.
     * @param handler Function handler
     * @returns Boolean -- true if function handler successfully removed.
     */
    removeEventHandler<K extends keyof HandlerEvents<Events>>(name: K, local: keyof Events | null | undefined,handler: Handler<HandlerEvents<Events>[K]>) {
        return ( local ? this.#listeners[local]?.handlers[name] : this.#handlers[name] )?.delete(handler) ?? false
    }

    #emitEventHandler<K extends keyof HandlerEvents<Events>>(name: K, data: HandlerEvents<Events>[K]) {
        for (const l of [ this.#handlers[name], this.#listeners[data.name as any]?.handlers[name] ] )
            if (l) for (const fn of l) fn(data)
        
        return data
    }
}

export const eventPriority = {
    before : 0,
    none   : 1,
    after  : 2,
} as const

Object.setPrototypeOf(eventPriority, null)

export class EmitContol {
    constructor(opts: EmitControlOptions) {
        this.#opts = opts
    }

    #opts: EmitControlOptions
    #canceled = false
    #breaked = false

    get cancelable() { return this.#opts.allowCancel }
    get breakable() { return this.#opts.allowBreak }

    /** Event canceled state, returns true if event is canceled. */
    get canceled() { return this.#canceled }
    set canceled(v) { if (this.#opts.allowCancel) this.#canceled = v }

    /** Cancels event. Returns true if success. */
    cancel() {
        if (this.canceled || !this.#opts.allowCancel) return false
        return this.#canceled = true
    }

    /** Event breaked state, returns true if event is breaked. */
    get breaked() { return this.#breaked }
    set breaked(v) { if (this.#opts.allowBreak) this.#breaked = v }

    /** Breaks event trigger and stops executing the rest of function listeners. Returns true if success. */
    break() {
        if (this.breaked || !this.#opts.allowBreak) return false
        return this.#breaked = true
    }
}

type Listener<T> = (data: T, control: EmitContol) => void
type Handler<T> = (data: T) => void

export interface EventListenerOptions {
    /**
     * Execution priority, determines when the listener function will be executed
     * amongst other function listeners in the same event.
     * 
     * `before` has the high priority, executes after `pre` but before `none` priority.
     * Can be used to initialize stuff before.
     * 
     * `none` (default) has the middle priority, executes after `before` but before `after` priority.
     * 
     * `after` has the lowest priority, executes after `none` priority.
     * Can be used to finalize stuff after.
     * 
     * Note that this does not change the event data, but rather the execution order between function listeners in an event.
     */
    priority?: EventPriority

    /**
     * Executes the listener function only once.
     * Defaults to `false`.
     */
    once?: boolean

    /**
     * Unsubscribe signal, can be a `Promise`, `PromiseController`, or `AbortController`.
     */
    signal?: AbortController | PromiseController | Promise<any>
}

export interface HandlerEvents<T extends Record<string, any>> {
    addEventListener: {
        /** Listener options. */
        options: EventListenerOptions
        /** Cancels adding the listener. */
        cancel: boolean
    } & {
        [K in keyof T]: {
            /** Event name. */
            readonly name: K
            /** Event listener. */
            readonly listener: Listener<T[K]>
        }
    }[keyof T]

    removeEventListener: {
        /** Cancels removing the listener. */
        cancel: boolean
    } & {
        [K in keyof T]: {
            /** Event name. */
            readonly name: K
            /** Event listener. */
            readonly listener: Listener<T[K]>
        }
    }[keyof T]

    emit: {
        /** Emit control options. */
        options: EmitControlOptions
        /** Cancels emit. */
        cancel: boolean
        /** Returns canceled. Requires `cancel` to be true to take effects. */
        returnCanceled: boolean
        /** Returns breaked. Requires `cancel` to be true to take effects. */
        returnBreaked: boolean
    } & {
        [K in keyof T]: {
            /** Event name. */
            readonly name: K
            /** Event data. */
            readonly data: T[K]
        }
    }[keyof T]

    removeEventListeners: {
        /** Event emitter name. If undefined, removes all event listeners. */
        readonly name?: keyof T
        /** Cancels removing all listeners. */
        cancel: boolean
    }
}

export type EventPriority = keyof typeof eventPriority

export interface EmitControlOptions {
    /**
     * Allows listener functions to stop executing the next other function listeners.
     * Default value: `false`
     */
    allowBreak?: boolean

    /**
     * Allows listener functions to cancel default behavior after execution.
     * Default value: `false`
     */
    allowCancel?: boolean

    /**
     * Determines action to be taken for thrown errors when emitting
     * 
     * `none` takes no action for errors.
     * 
     * `log` logs errors.
     * 
     * `break` stops executing further function listeners.
     * 
     * `throw` stops executing further function listeners and immediately throw an error
     */
    errorAction?: 'none' | 'log' | 'break' | 'throw'
}

export interface EmitResult<T> {
    /** Whether event is canceled. */
    canceled: boolean
    /** Whether event is breaked. */
    breaked: boolean
    /** Event data. */
    data: T
}
