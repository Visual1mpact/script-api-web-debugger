import { proxyList } from "../proc/proxy.js"

const AsyncFunction = (async()=>{}).constructor as Function,
    GeneratorFunction = (function*(){}).constructor as Function,
    AsyncGeneratorFunction = (async function*(){}).constructor as Function,
    TypedArray = Object.getPrototypeOf(Uint8Array) as Uint8ArrayConstructor

const protoIgnore = new Set<any>([
    Object,
    Array,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise
])

function inspectProperties(obj: any, descriptors: Iterable<[string | symbol, PropertyDescriptor]>, stack: any[], cache: InspectCacheMap) {
    const out: [JSONInspect.PropertyData, JSONInspect.All][] = []
    const ns = stack.concat([obj])

    for (const [key, desc] of descriptors) {
        let val: JSONInspect.All

        try { val = inspectInternal(desc.get ? desc.get.call(obj) : desc.value, ns, cache) }
        catch(e) {
            val = {
                type: 'getter_error',
                error: String(e),
                errorObj: e instanceof Error ? {
                    name: e.name,
                    message: e.message,
                    stack: e.stack ?? ''
                } : undefined
            }
        }

        out.push([
            {
                name: String(key),
                isSymbol: typeof key === 'symbol',
                getter: desc.get ? inspectFunc(desc.get, stack, cache) : undefined,
                setter: desc.set ? inspectFunc(desc.set, stack, cache) : undefined,
            },
            val
        ])
    }

    return out
}

function inspectProto(val: any, proto = val, stack: any[], cache: InspectCacheMap): JSONInspect.Values.Object['proto'] {
    if (!proto) return

    const constructor = proto.constructor
    if (protoIgnore.has(constructor)) return constructor.name

    const ns = stack.concat([proto])

    return {
        name: constructor == undefined ? `[${val[Symbol.toStringTag] ?? 'Object'}: null prototype]`
            : constructor != Object ? constructor.name
            : Symbol.toStringTag in val ? `${constructor.name} [${val[Symbol.toStringTag]}]`
            : '',
        properties: inspectProperties(val, descriptors(proto), stack, cache),
        proto: inspectProto(val, Object.getPrototypeOf(proto), ns, cache),
    }
}

function inspectFunc(fn: Function, stack: any[], cache: InspectCacheMap): JSONInspect.Values.Function {
    const constructor = fn.constructor,
        protoOf = Object.getPrototypeOf(fn)
    
    return {
        type: 'function',

        name: fn.name,
        srcFile: fn.fileName,
        srcLine: fn.lineNumber,

        extend: protoOf instanceof Function ? inspectFunc(protoOf, stack, cache) : undefined,

        isFunc: Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable ?? true,
        isAsync: constructor === AsyncFunction || constructor === AsyncGeneratorFunction,
        isGenerator: constructor === GeneratorFunction || constructor === AsyncGeneratorFunction,

        properties: inspectProperties(fn, descriptors(fn), stack, cache),
        proto: 'Function'
    }
}

function descriptors(obj: any) {
    const m = new Map<string | symbol, PropertyDescriptor>()
    
    for (const [k, v] of Object.entries(Object.getOwnPropertyDescriptors(obj))) m.set(k, v)
    for (const [k, v] of Object.getOwnPropertySymbols(obj).map(v => [v, Object.getOwnPropertyDescriptor(obj, v)] as [symbol, PropertyDescriptor])) m.set(k, v)

    return m
}

function inspectInternal(val: any, stack: any[], cache: InspectCacheMap): JSONInspect.All {
    const circular = stack.indexOf(val)
    if (circular !== -1) return { type: 'circular', index: circular }

    // primitives

    const t = typeof val
    switch (t) {
        case 'string':
        case 'boolean':
            return {
                type: t,
                value: val
            }
        
        case 'number':
            return {
                type: t,
                value: String(val)
            }
        
        case 'symbol':
            return {
                type: t,
                desc: val.description ?? undefined
            }
    }

    // null / undefined
    
    if (val === null) return { type: 'null' }
    if (val === undefined) return { type: 'undefined' }

    // objects

    const c = cache.get(val)
    if (c) return {
        type: 'ref',
        id: c[0]
    }

    const ns = stack.concat([val])
    const nproto = Object.getPrototypeOf(val), constructor = nproto?.constructor

    let properties = descriptors(val)
    let obj: JSONInspect.All

    if (val instanceof Error) {
        const o: JSONInspect.Values.Error = {
            type: 'error',
            error: String(val),
            errorObj: {
                name: val.name,
                message: val.message,
                stack: val.stack ?? ''
            }
        }

        cache.set(val, [ cache.size, o ])
        return o
    } 

    if (val instanceof Function) {
        obj = inspectFunc(val, stack, cache)
    }
    else if (val instanceof Array || val instanceof TypedArray) {
        obj = {
            type: 'array',
            name: `${val.constructor?.name}[${val.length}]`,
            values: [],

            properties: [],
            proto: '',
        }

        properties.delete('length')
        for (const [i, v] of val.entries()) {
            properties.delete(String(i))
            obj.values.push( inspectInternal(v, ns, cache) )
        }
    }
    else if (val instanceof Set) {
        obj = {
            type: 'set',
            name: `${val.constructor?.name}[${val.size}]`,
            values: Array.from(val, v => inspectInternal(v, ns, cache)),

            properties: [],
            proto: '',
        }
    }
    else if (val instanceof Map) {
        obj = {
            type: 'map',
            name: `${val.constructor?.name}[${val.size}]`,
            entries: Array.from(val, ([k, v]) => [inspectInternal(k, ns, cache), inspectInternal(v, ns, cache)]),

            properties: [],
            proto: '',
        }
    }
    else if (val instanceof WeakMap || val instanceof WeakSet) {
        obj = {
            type: 'weak',

            properties: [],
            proto: ''
        }
    }
    else if (proxyList.has(val)) {
        const data = proxyList.get(val)
        if (!data) throw new ReferenceError('how')

        const { handler, revoke, object } = data
        obj = {
            type: 'proxy',

            handler: inspectInternal(handler, ns, cache) as JSONInspect.Values.Object,
            object: inspectInternal(object, ns, cache) as JSONInspect.Values.Object,
            revocable: revoke,

            properties: [],
            proto: 'Proxy'
        }
    }
    else {
        obj = {
            type: 'object',
            name: constructor == undefined ? `[${val[Symbol.toStringTag] ?? 'Object'}: null prototype]`
                : constructor != Object ? constructor.name
                : Symbol.toStringTag in val ? `${constructor.name} [${val[Symbol.toStringTag]}]`
                : '',
            
            properties: [],
            proto: ''
        }
    }

    obj.properties = inspectProperties(val, properties, ns, cache)
    obj.proto ||= inspectProto(val, nproto, ns, cache)

    const id = cache.size
    cache.set(val, [id, obj])
    return { type: 'ref', id }
}

export function inspectJSON(val: any): JSONInspect.All {
    const caches: InspectCacheMap = new Map
    const data = inspectInternal(val, [], caches)

    if (caches.size) return {
        type: 'rootref',
        refs: Array.from(caches.values()),
        value: data
    }

    return data
}

type InspectCacheMap = Map<any, [id: number, data: JSONInspect.All]>
