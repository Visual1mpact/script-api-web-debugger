declare namespace Bedrock {
    interface EventIdentifier {
        name: string
        isBefore: boolean
        isSystem: boolean
    }

    interface FunctionIdentifier {
        fn: JSONInspect.Values.Function
        fid: number
    }

    interface FunctionIdentifierStacked extends FunctionIdentifier {
        stack: string
    }

    interface Events {
        event_change: EventIdentifier & FunctionIdentifierStacked & {
            tick: number
            mode: 'subscribe' | 'unsubscribe' | 'disable' | 'enable'
        }
        event: EventIdentifier & {
            tick: number

            data: JSONInspect.All
            timing: {
                functions: Array<FunctionIdentifier & {
                    time: number
                    error?: JSONInspect.All
                }>
                self: number
                total: number
            }
        }

        system_run_change: FunctionIdentifierStacked & {
            tick: number

            type: T_RunType
            duration: number
            id: number

            mode: 'add' | 'clear' | 'suspend' | 'resume'
        }
        system_run: FunctionIdentifier & {
            tick: number

            id: number
            
            delta: number
            error?: JSONInspect.All
        }

        tick: {
            tick: number
            delta: number
        }

        console: {
            level: LogLevel
            content: JSONInspect.All[]
            stack: string
        }

        property_registry: {
            world: [property: string, data: T_DynamicPropertyData][]
            entities: [id: string, properties: [property: string, data: T_DynamicPropertyData][]][]
            worldInitProperties: Record<string, T_DynamicPropertyValue>
        }

        property_set: {
            property: string
            value: T_DynamicPropertyValue
        } & ({
            type: 'world'
        } | {
            type: 'entity'
            entityType: string
            entityId: string
        })

        state_set: {
            state: string
            value: T_DynamicPropertyValue
        }

        ready: void

        //[k: string]: any
    }
    
    interface EvalResult {
        id: string,
        result: JSONInspect.All,
        error: boolean
    }

    type T_DynamicPropertyData = {
        type: 'number'
        default?: number
    } | {
        type: 'boolean',
        default?: boolean
    } | {
        type: 'string'
        maxLength: number
        default?: string
    }

    type T_DynamicPropertyValue = string | number | boolean | undefined

    type T_RunType = 'run' | 'runInterval' | 'runTimeout'
}