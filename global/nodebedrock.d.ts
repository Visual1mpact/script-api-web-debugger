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
            eventListeners: EventListeners,
            systemRuns: SystemRuns,
            propertyRegistry: Bedrock.Events['property_registry'],
        }
    }

    type EventListeners = Record<'world' | 'system',
        Record<'before' | 'after',
            Record<string, {
                clearCache: number[]
                list: Map<number, {
                    fn: JSONInspect.Values.Function
                    status: 'disable' | 'subscribe' | 'unsubscribe'
                    logs: {
                        tick: number
                        mode: Bedrock.Events['event_change']['mode']
                        stack: string
                    }[]
                }>
            }>
        >
    >

    type SystemRuns = Map<number, {
        readonly tick: number

        readonly type: Bedrock.T_RunType
        readonly duration: number

        readonly fn: JSONInspect.Values.Function
        readonly stack: string

        status: 'add' | 'suspend' | 'clear'
        clearStack?: string
    }>
}
