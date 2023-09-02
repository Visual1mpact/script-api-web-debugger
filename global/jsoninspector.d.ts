declare namespace JSONInspect {
    namespace Values {
        interface Error {
            type: 'error' | 'getter_error'
            error: string
            errorObj?: {
                name: string
                message: string
                stack: string
            }
        }
    
        interface Circular {
            type: 'circular',
            index: number
        }
    
        interface Null {
            type: 'null'
        }

        interface Undefined {
            type: 'undefined'
        }
    
        interface String {
            type: 'string'
            value: string
        }

        interface Number {
            type: 'number'
            value: string
            __T?: number
        }

        interface Boolean {
            type: 'boolean'
            value: boolean
        }

        interface Symbol {
            type: 'symbol'
            desc: string | undefined
        }

        interface Function {
            type: 'function'
    
            name: string
            srcFile: string | undefined
            srcLine: number | undefined
    
            extend: Values.Function | undefined
    
            isFunc: boolean
            isAsync: boolean
            isGenerator: boolean
    
            properties: [PropertyData, All][]
            proto: string
        }
    
        interface Array extends ObjectBase {
            type: 'array'
            values: All[]
        }

        interface Set extends ObjectBase {
            type: 'set'
            values: All[]
        }

        interface Map extends ObjectBase {
            type: 'map'
            entries: [All, All][]
        }

        interface Weak extends ObjectBase {
            type: 'weak'
        }

        interface Object extends ObjectBase {
            type: 'object'
            __T?: Record<any, any>
        }

        interface Proxy {
            type: 'proxy'

            handler: Object
            object: Object
            revocable: boolean

            properties: []
            proto: string

            __T?: Record<any, any>
        }
    }

    namespace Typed {
        type XArray<T> = ObjectBase & {
            type: 'array'
            values: To<T>[]
        }
        
        type XSet<T> = ObjectBase & {
            type: 'set'
            values: To<T>[]
        }
        
        type XMap<K, V> = ObjectBase & {
            type: 'map'
            entries: [To<K>, To<V>][]
        }

        type XObject<O = Record<string | symbol, any>> = {
            type: 'object'
            __T?: O
        }
        
        type XProxy<O = Record<string | symbol, any>> = ObjectBase & {
            type: 'proxy'

            handler: Object
            object: Object
            revocable: boolean

            properties: []
            proto: string

            __T?: O
        }
                
        type XString<T extends string> = {
            type: 'string'
            value: T
        }
    
        type XNumber<T extends number> = {
            type: 'number'
            value: string
            __T?: T
        }
    
        type XBoolean<T extends boolean> = {
            type: 'boolean'
            value: T
        }
    
        type XProperty<T extends string | number | symbol> = {
            name: T extends string ? T : string
            isSymbol: T extends symbol ? true : false
            getter?: Values.Function
            setter?: Values.Function
        }
    
        type To<T> =
              T extends null                    ? Values.Null
            : T extends undefined               ? Values.Undefined
            : T extends symbol                  ? Values.Symbol
            : T extends Function                ? Values.Function
            : T extends Error                   ? Values.Error
            : T extends string                  ? XString<T>
            : T extends number                  ? XNumber<T>
            : T extends boolean                 ? XBoolean<T>
            : T extends Array<infer R>          ? XArray<R>
            : T extends Set<infer R>            ? XSet<R>
            : T extends Map<infer K, infer V>   ? XMap<K, V>
            : T extends object                  ? XObject<T>
            : null
        
        type From<T extends All> =
              T extends { type: 'null'     } ? null
            : T extends { type: 'undefined'} ? undefined
            : T extends { type: 'symbol'   } ? symbol
            : T extends { type: 'function' } ? Function
            : T extends { type: 'error'    } ? Error
            : T extends { type: 'string'   } ? T['value']
            : T extends { type: 'number'   } ? NonNullable<T['__T']>
            : T extends { type: 'boolean'  } ? T['value']
            : T extends { type: 'array'    } ? From<T['values'][number]>[]
            : T extends { type: 'set'      } ? From<T['values'][number]>[]
            : T extends { type: 'map'      } ? Map<From<T['entries'][number][0]>, From<T['entries'][number][1]>>
            : T extends { type: 'object'   } ? NonNullable<T['__T']>
            : T extends { type: 'proxy'    } ? NonNullable<T['__T']>
            : never
    }    

    type All =
        | Values.Error
        | Values.Circular
        | Values.Null
        | Values.Undefined
        | Values.String
        | Values.Number
        | Values.Boolean
        | Values.Symbol
        | Values.Function
        | Values.Array
        | Values.Set
        | Values.Map
        | Values.Weak
        | Values.Object
        | Values.Proxy
        
    interface ObjectBase {
        name?: string
        properties: [PropertyData, All][]
        proto: string | ObjectBase | undefined
    }

    interface PropertyData {
        name: string
        isSymbol: boolean
        getter?: Values.Function
        setter?: Values.Function
    }
}
