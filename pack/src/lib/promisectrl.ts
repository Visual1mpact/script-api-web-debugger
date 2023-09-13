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
