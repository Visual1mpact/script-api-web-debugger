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
                functions: JSONInspect.Typed.To<
                    Map<
                        { id: number, fnRaw: string },
                        { delta: number, errorRaw?: string }
                    >
                >
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

        eval: {
            id: string
            result: JSONInspect.All
            error: boolean
        }

        console: {
            level: LogLevel
            content: JSONInspect.All[]
            stack: string
        }

        ready: void

        property_registry: {
            world: [property: string, data: T_DynamicPropertyData][]
            entities: [id: string, properties: [property: string, data: T_DynamicPropertyData][]][]
        }

        property_set: {
            property: string
            value: string | number | boolean | undefined
        } & ({
            type: 'world'
        } | {
            type: 'entity'
            entityType: string
            entityId: string
        })
    }

    interface ProcessEvents {
        line: {
            level: LogLevel
            date: string
            time: string
            line: string
            raw: string
        } | {
            level: 'unknown'
            raw: string
        }

        runtime_stats: {
            plugins: {
                name: string,
                handles: {
                    type: string
                    current: number
                    peak: number
                    total: number
                }[]
            }[]
            runtime: {
                memory_allocated_count: number
                memory_allocated_size: number
                memory_used_count: number
                memory_used_size: number
                atom_count: number
                atom_size: number
                string_count: number
                string_size: number
                object_count: number
                object_size: number
                property_count: number
                property_size: number
                function_count: number
                function_size: number
                function_code_size: number
                function_line_count: number
                array_count: number
                fast_array_count: number
                fast_array_element_count: number
            }
        }

        data: { [K in keyof Events]: { name: K, data: Events[K] } }[keyof Events]

        exit: {
            code: number | null
            signal: string | null
        }
    }

    interface Messages {
        eval: {
            id: string
            script: string
        }

        buf_start: string
        buf_write: {
            id: string
            chunkhex: string
        }
        buf_end: {
            id: string
            event: string
        }
        buf_cancel: string

        conn_id: string

        [k: string]: any
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

    type T_RunType = 'run' | 'runInterval' | 'runTimeout'
}