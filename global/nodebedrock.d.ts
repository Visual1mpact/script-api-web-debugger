declare namespace NodeBedrock {    
    interface Messages {
        eval: {
            id: string
            script: string
            keepOutput?: boolean
        }

        set_state: {
            state: string
            value: Bedrock.T_DynamicPropertyValue
        }

        handshake: number
        longdata: string
    }

    interface Events {
        line: {
            raw: string
            silent: boolean
        } & ({
            level: LogLevel
            date: string
            time: string
            line: string
        } | {
            level: 'unknown'
        })

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

        data: { [K in keyof Bedrock.Events]: { name: K, data: Bedrock.Events[K] } }[keyof Bedrock.Events]

        exit: {
            code: number | null
            signal: string | null
        }
    }

    interface GetData {
        bedrock: {
            pid: number
            exitCode: number | null
            signalCode: string | null
            killed: boolean,
            consoleLog: Events['line'][]
        }

        script: {
            consoleLog: Bedrock.Events['console'][]
            eventListeners: Record<'world' | 'system', Record<'before' | 'after', [string, Interpreter.EventListener[]][]>>
            eventLog: Bedrock.Events['event'][]
            systemRuns: Interpreter.SystemRun[]
            propertyRegistry: Pick<Bedrock.Events['property_registry'], 'entities' | 'world'>
            worldProperties: Record<string, Bedrock.T_DynamicPropertyValue>
            states: Record<string, Bedrock.T_DynamicPropertyValue>
        }

        limits: {
            processConsoleLog: number
            consoleLog: number
            eventLog: number
            eventListenerLog: number
            systemRuns: number
            eventListeners: number
        }
    }

    namespace Interpreter {
        interface EventListener extends Bedrock.FunctionIdentifier {
            lastSubscribeTick: number
            log: {
                tick: number
                mode: 'subscribe' | 'unsubscribe' | 'disable' | 'enable',
                stack: string
            }[]

            disabled: boolean
            subscribed: boolean
        }

        interface SystemRun extends Bedrock.FunctionIdentifier {
            addTick: number
            addStack: string

            clearTick?: number
            clearStack?: string

            type: Bedrock.T_RunType
            duration: number
            id: number

            isCleared: boolean
            isSuspended: boolean
        }
    }
}
