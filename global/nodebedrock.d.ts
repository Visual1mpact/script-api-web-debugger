declare namespace NodeBedrockInterpreter {
    interface GetData {
        pid: number
        killed: boolean
        exitCode: number | null
        signalCode: string | null

        consoleLog: Bedrock.ProcessEvents['line'][]

        script: {
            consoleLog: Bedrock.Events['console'][],
            eventLog: Bedrock.Events['event'][],
            eventListeners: EventListenerLists<[string, EventListenerData[]][]>,
            systemRuns: SystemRunData[],
            propertyRegistry: Bedrock.Events['property_registry'],
        }
    }

    interface EventListenerData {
        readonly fid: number
        readonly fn: JSONInspect.Values.Function

        readonly logs: {
            readonly tick: number
            readonly mode: Bedrock.Events['event_change']['mode']
            readonly stack: string
        }[]

        status: 'disable' | 'subscribe' | 'unsubscribe'
    }

    type EventListenerLists<T> = Record<'world' | 'system', Record<'before' | 'after', T>>

    interface SystemRunData {
        readonly tick: number
        readonly id: number

        readonly type: Bedrock.T_RunType
        readonly duration: number

        readonly fn: JSONInspect.Values.Function
        readonly stack: string

        status: 'add' | 'suspend' | 'clear'
        clearStack?: string
    }
}
