export default class PromiseController<T = any> {
    static resolve<T>(value: T) {
        const prm = new PromiseController<T>()
        prm.resolve(value)
        return prm
    }

    static reject<T = any>(err?: any, handle = true) {
        const prm = new PromiseController<T>()
        if (handle) prm.promise.catch(() => {})
        prm.reject(err)
        return prm
    }
    
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = v => {
                this.#done = true
                res(v)
            }
            this.reject = err => {
                this.#done = true
                rej(err)
            }
        })
    }

    readonly promise: Promise<T>

    #done = false
    get done() { return this.#done }

    declare resolve: (value: T | Promise<T>) => void
    declare reject: (error?: any) => void
}
