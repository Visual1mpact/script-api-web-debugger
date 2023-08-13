import EventEmitter from "./event.js";

export class AbortController<T = any> extends EventEmitter<{abort: T}> {
    #promiseController = new PromiseController<T>
    #aborted = false

    /**
     * Emits abort event and resolves promise.
     * @param value Abort value.
     */
    abort(value: T) {
        if (this.aborted) return
        this.#aborted = true

        this.#promiseController.resolve(value)
        this.emit('abort', value)
        this.removeEventListeners()
    }

    /** Abort state. Returns true if aborted. */
    get aborted() { return this.#aborted }
    /** Promise form of the signal. */
    get promise() { return this.#promiseController.promise }
}

export class PromiseController<T = any> {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res
            this.reject = rej
        })
    }

    declare resolve: (v: T) => void
    declare reject: (err?: any) => void

    readonly promise: Promise<T>
}
