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

function inspectProperties(obj: any, descriptors: Iterable<[string | symbol, PropertyDescriptor]>, stack: any[]) {
    const out: [JSONInspect.PropertyData, JSONInspect.All][] = []
    const ns = stack.concat([obj])

    for (const [key, desc] of descriptors) {
        let val: JSONInspect.All

        try { val = inspectJSON(desc.get ? desc.get.call(obj) : desc.value, ns) }
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
                getter: desc.get ? inspectFunc(desc.get, stack) : undefined,
                setter: desc.set ? inspectFunc(desc.set, stack) : undefined,
            },
            val
        ])
    }

    return out
}

function inspectProto(val: any, proto = val, stack: any[]): JSONInspect.Values.Object['proto'] {
    if (!proto) return

    const constructor = proto.constructor
    if (protoIgnore.has(constructor)) return constructor.name

    const ns = stack.concat([proto])

    return {
        name: constructor == undefined ? `[${val[Symbol.toStringTag] ?? 'Object'}: null prototype]`
            : constructor != Object ? constructor.name
            : Symbol.toStringTag in val ? `${constructor.name} [${val[Symbol.toStringTag]}]`
            : '',
        properties: inspectProperties(val, descriptors(proto), stack),
        proto: inspectProto(val, Object.getPrototypeOf(proto), ns),
    }
}

function inspectFunc(fn: Function, stack: any[]): JSONInspect.Values.Function {
    const constructor = fn.constructor,
        protoOf = Object.getPrototypeOf(fn)
    
    return {
        type: 'function',

        name: fn.name,
        srcFile: fn.fileName,
        srcLine: fn.lineNumber,

        extend: protoOf instanceof Function ? inspectFunc(protoOf, stack) : undefined,

        isFunc: Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable ?? true,
        isAsync: constructor === AsyncFunction || constructor === AsyncGeneratorFunction,
        isGenerator: constructor === GeneratorFunction || constructor === AsyncGeneratorFunction,

        properties: inspectProperties(fn, descriptors(fn), stack),
        proto: 'Function'
    }
}

function descriptors(obj: any) {
    const m = new Map<string | symbol, PropertyDescriptor>()
    
    for (const [k, v] of Object.entries(Object.getOwnPropertyDescriptors(obj))) m.set(k, v)
    for (const [k, v] of Object.getOwnPropertySymbols(obj).map(v => [v, Object.getOwnPropertyDescriptor(obj, v)] as [symbol, PropertyDescriptor])) m.set(k, v)

    return m
}

export function inspectJSON(val: any, stack: any[] = []): JSONInspect.All {
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
        
        case 'function':
            return inspectFunc(val, stack)
    }

    // null / undefined
    
    if (val === null) return { type: 'null' }
    if (val === undefined) return { type: 'undefined' }

    if (val instanceof Error) return {
        type: 'error',
        error: String(val),
        errorObj: {
            name: val.name,
            message: val.message,
            stack: val.stack ?? ''
        }
    }

    // objects

    const ns = stack.concat([val])
    const nproto = Object.getPrototypeOf(val), constructor = nproto?.constructor

    let properties = descriptors(val)
    let obj: JSONInspect.All

    if (val instanceof Array || val instanceof TypedArray) {
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
            obj.values.push( inspectJSON(v, ns) )
        }
    }
    else if (val instanceof Set) {
        obj = {
            type: 'set',
            name: `${val.constructor?.name}[${val.size}]`,
            values: Array.from(val, v => inspectJSON(v, ns)),

            properties: [],
            proto: '',
        }
    }
    else if (val instanceof Map) {
        obj = {
            type: 'map',
            name: `${val.constructor?.name}[${val.size}]`,
            entries: Array.from(val, ([k, v]) => [inspectJSON(k, ns), inspectJSON(v, ns)]),

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

            handler: inspectJSON(handler, ns) as JSONInspect.Values.Object,
            object: inspectJSON(object, ns) as JSONInspect.Values.Object,
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

    obj.properties = inspectProperties(val, properties, ns)
    obj.proto = inspectProto(val, nproto, ns)

    return obj
}
