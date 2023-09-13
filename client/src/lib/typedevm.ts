export default class TypedEventTarget<T extends Record<string, any>> extends EventTarget {
    declare addEventListener: <K extends keyof T>(type: K, callback: null | ListenerOrObject<T[K]>, options?: boolean | AddEventListenerOptions) => void
    declare removeEventListener: <K extends keyof T>(type: K, callback: null | ListenerOrObject<T[K]>, options?: boolean | EventListenerOptions) => void

    /**
     * {@link EventTarget.dispatchEvent}
     * 
     * @deprecated Use `emit` instead
     */
    dispatchEvent(event: Event) {
        // alert
        console.warn(
            'TypedEventTarget.dispatchEvent is called directly - use emit instead',
            '\n  Event:', event,
            `\n  Type: ${event.type}`,
            '\n  Target:', this
        )

        return super.dispatchEvent(event)
    }

    /**
     * Dispatches a synthetic event event to target
     * @param type Event name
     * @param data Event data
     * @param init Event init
     * @returns true if either event's cancelable attribute value is false or its `preventDefault()` method was not invoked, false otherwise
     */
    emit<K extends Extract<keyof T, string>>(type: K, data: T[K], init?: EventInit | null) {
        const nd: any = data
        if (nd instanceof Event) {
            // event type is not equal to emitted type, alert
            if (nd.type !== type)
                console.warn(
                    'Emitted event object type is not equal to event name',
                    '\n  Event:', nd,
                    `\n  Type: ${nd.type} (emitted: ${type})`,
                    '\n  Target:', this
                )
            
            return super.dispatchEvent(nd)
        }
        else {
            return super.dispatchEvent(new CustomEvent(type, { detail: data, ...init }))
        }
    }
}

type EventValue<T> = T extends Event ? T : CustomEvent<T>

type Listener<T> = (data: EventValue<T>) => any
type ListenerOrObject<T> = Listener<T> | { handleEvent: Listener<T> }
