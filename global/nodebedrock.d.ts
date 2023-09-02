declare namespace NodeBedrock {    
    interface Messages {
        eval: {
            id: string
            script: string
            keepOutput?: boolean
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

        set_state: {
            state: string
            value: Bedrock.T_DynamicPropertyValue
        }

        [k: string]: any
    }

    interface Events {
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
}
