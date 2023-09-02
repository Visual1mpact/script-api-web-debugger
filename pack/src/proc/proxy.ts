export const OProxy = Proxy

export const proxyList = new WeakMap<any, { object: any, handler: ProxyHandler<any>, revoke: boolean }>()

//@ts-ignore
Proxy = class Proxy<T extends object> implements Proxy<T> {
    constructor(target: T, handler: ProxyHandler<T>) {
        const proxy = new OProxy<T>(target, handler)
        proxyList.set(proxy, { object: target, handler, revoke: false })
        return proxy
    }

    static revocable<T extends object>(target: T, handler: ProxyHandler<T>) {
        const { proxy, revoke } = OProxy.revocable(target, handler)
        proxyList.set(proxy, { object: target, handler, revoke: true })
        
        return {
            proxy: proxy,
            revoke() {
                proxyList.delete(proxy)
                revoke()
            }
        }
    }
}
