const AsyncFunction = (async()=>{}).constructor as Function,
    GeneratorFunction = (function*(){}).constructor as Function,
    AsyncGeneratorFunction = (async function*(){}).constructor as Function

function uninspectProperties(obj: any, val: JSONInspect.ObjectBase, refs?: Ref) {
    for (const [{ name, isSymbol }, value] of val.properties) obj[isSymbol ? Symbol(name) : name] ??= uninspectJSON(value, refs)
    if (typeof val.proto === 'object') {
        const constructor = class X {}
        Object.defineProperty(constructor, 'name', { value: val.proto.name ?? '' })

        const protoObj = uninspectProperties(new constructor, val.proto, refs)
        Object.setPrototypeOf(obj, protoObj)
    }
    return obj
}

export function uninspectJSON(val: JSONInspect.All, refs?: Ref): any {
    switch (val?.type) {
        case 'string':
        case 'boolean': return val.value

        case 'number': return +val.value
        
        case 'function': {
            const constructor: any = val.isAsync ? val.isGenerator ? AsyncGeneratorFunction : AsyncFunction : val.isGenerator ? GeneratorFunction : Function

            const fn = val.isFunc ? new constructor(`throw new ReferenceError('JSON-uninspected function is not callable')`)
                : class { constructor() { throw new ReferenceError('JSON-uninspected function is not callable') } }

            Object.defineProperty(fn, 'name', { value: val.name })
            uninspectProperties(fn, {
                properties: val.properties,
                proto: 'Function'
            }, refs)

            return fn
        }
        case 'symbol': return Symbol(val.desc)
        
        case 'null': return null
        case 'undefined': return undefined

        case 'array': return uninspectProperties(
            val.values.map(v => uninspectJSON(v, refs)),
            val, refs
        )
        case 'map': return uninspectProperties(
            new Map(Array.from(val.entries, ([k, v]) => [uninspectJSON(k, refs), uninspectJSON(v, refs)])),
            val, refs
        )
        case 'set': return uninspectProperties(
            new Set(val.values.map(v => uninspectJSON(v, refs))),
            val, refs
        )
        case 'object': return uninspectProperties(
            {},
            val, refs
        )
        case 'proxy': return uninspectProperties(
            val.object,
            val, refs
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

        case 'ref': {
            if (!refs) throw new ReferenceError(`Reflist not defined (referencing ${val.id})`)

            const v = refs.get(val.id)
            if (!v) throw new ReferenceError(`Reference ID ${val.id} not found`)

            return uninspectJSON(v, refs)
        }

        case 'rootref': return uninspectJSON(val.value, new Map(val.refs))

        default: return null
    }
}

type Ref = Map<number, JSONInspect.All>
