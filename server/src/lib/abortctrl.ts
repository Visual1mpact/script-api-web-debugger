import TypedEventEmitter from "./typedevm.js";

export default class AbortController<T = any> extends TypedEventEmitter<{ abort: T }> {
    constructor() {
        super()
        this.#prm = new Promise(res => this.#res = res)
    }

    #aborted = false
    #value: T | undefined
    #prm: Promise<T>
    #res: (v: T) => void = () => {}

    get aborted() { return this.#aborted }
    get abortValue() { return this.#value }
    get promise() { return this.#prm }

    abort(value: T) {
        this.#aborted = true
        this.#value = value

        this.emit('abort', value)
        this.removeAllListeners()

        this.#res(value)
    }
}
