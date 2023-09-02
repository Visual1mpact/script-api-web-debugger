declare namespace Bedrock {
    interface Events {
        event_change: {
            tick: number

            name: string
            isBefore: boolean
            isSystem: boolean

            fn: JSONInspect.Values.Function
            fid: number
            stack: string

            mode: 'subscribe' | 'unsubscribe' | 'disable' | 'enable'
        }
        event: {
            tick: number

            name: string
            isBefore: boolean
            isSystem: boolean

            data: JSONInspect.All
            timing: {
                functions: {
                    fn: JSONInspect.Values.Function
                    fid: number
                    time: number
                    error?: JSONInspect.All
                }[]
                self: number
                total: number
            }
        }

        system_run_change: {
            tick: number

            type: T_RunType
            duration: number
            id: number

            fn: JSONInspect.Values.Function
            fid: number
            stack: string

            mode: 'add' | 'clear' | 'suspend' | 'resume'
        }
        system_run: {
            tick: number

            id: number

            fn: JSONInspect.Values.Function
            fid: number
            
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

        [k: string]: any
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