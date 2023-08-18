const AsyncFunction = (async()=>{}).constructor as Function,
    GeneratorFunction = (function*(){}).constructor as Function,
    AsyncGeneratorFunction = (async function*(){}).constructor as Function

const uninspectProtoSym = Symbol('[Prototype]')

function uninspectProperties(obj: any, protoSymbol = true, val: JSONInspect.ObjectBase) {
    for (const [{ name, isSymbol }, value] of val.properties) obj[isSymbol ? Symbol(name) : name] ??= uninspectJSON(value)
    if (typeof val.proto === 'object') {
        const constructor = class X {}
        Object.defineProperty(constructor, 'name', { value: val.proto.name ?? '' })

        const protoObj = uninspectProperties(new constructor, protoSymbol, val.proto)
        Object.setPrototypeOf(obj, protoObj)
        if (protoSymbol) obj[uninspectProtoSym] = protoObj
    }
    return obj
}

export function uninspectJSON(val: JSONInspect.All, protoSymbol = true): any {
    switch (val?.type) {
        case 'string':
        case 'boolean': return val.value

        case 'number': return +val.value
        
        case 'function': {
            const constructor: any = val.isAsync ? val.isGenerator ? AsyncGeneratorFunction : AsyncFunction : val.isGenerator ? GeneratorFunction : Function

            const fn = val.isFunc ? new constructor : class {}
            Object.defineProperty(fn, 'name', { value: val.name })
            uninspectProperties(fn, false, { properties: val.properties, proto: 'Function' })

            return fn
        }
        case 'symbol': return Symbol(val.desc)
        
        case 'null': return null
        case 'undefined': return undefined

        case 'array': return uninspectProperties(
            val.values.map(v => uninspectJSON(v, protoSymbol)),
            protoSymbol, val
        )
        case 'map': return uninspectProperties(
            new Map(Array.from(val.entries, ([k, v]) => [uninspectJSON(k), uninspectJSON(v)])),
            protoSymbol, val
        )
        case 'set': return uninspectProperties(
            new Set(val.values.map(v => uninspectJSON(v, protoSymbol))),
            protoSymbol, val
        )
        case 'object': return uninspectProperties(
            Object.create(null),
            protoSymbol, val
        )

        case 'error':
        case 'getter_error': {
            if (!val.errorObj) return new Error(val.error)
            const { name, message, stack } = val.errorObj

            const E = class X extends Error {}
            Object.defineProperty(E, 'name', { value: name })

            const e = new E(message)
            e.stack = name + ': ' + message + '\n' + stack

            return e
        }

        default: return null
    }
}
