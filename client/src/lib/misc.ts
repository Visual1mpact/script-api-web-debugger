/**
 * Creates a new abort signal that aborts after specified time
 * @param timeout Timeout in milliseconds
 * @returns Abort signal
 */
export function abortTimeout(timeout: number) {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort('Timeout reached'), timeout)
    return ctrl.signal
}

/**
 * Assigns properties from source to object only if source's properties is in the object
 * @param a Object to be assigned
 * @param b Source
 * @param ignores Properties to be ignored
 */
export function assignIfExist<A extends object, B, I extends string = never>(a: A, b: B, ignores: Array<I> | Set<I> = []): Replace<A, Pick<B, Exclude<keyof A & keyof B, I>>> {
    //@ts-ignore
    for (const k in b) if (k in a && !( Array.isArray(ignores) ? ignores.includes(k) : ignores.has(k) )) a[k] = b[k]
    return a as any
}

/**
 * Clamps a value between minimum and maximum
 * @param value Value
 * @param min Minimum value
 * @param max Maximum value
 */
export function clamp(value: number, min = -Infinity, max = Infinity) {
    return value < min ? min : value > max ? max : value
}

/**
 * {@link fetch} but throws if not `ok` or `redirected`.
 * @param url Fetch URL
 * @param opts Fetch options
 * @returns Response.
 */
export async function fetchThrow(url: string, opts?: RequestInit) {
    const res = await fetch(url, opts)
    if (!res.ok && !res.redirected) throw new Error(`${opts?.method?.toUpperCase() ?? 'GET'} ${res.url}: Server responded with ${res.status} (${res.statusText})`, { cause: res })
    return res
}

/**
 * Gets an element by its identifier, throws an error if undefined / does not match validation
 * @param id Element identifier
 * @param validate Validation
 * @param parent Root
 * @returns Element
 */
export function getIdThrow<T extends new () => Element = new () => HTMLElement>(id: string, validate?: T, parent: NonElementParentNode = document): InstanceType<T> {
    const elm = parent.getElementById(id)
    if (!elm)
        throw new ReferenceError(
            `Element ID '${id}' not found`,
            {
                cause: {
                    parent
                }
            }
        )

    if (validate && elm instanceof validate == false)
        throw new TypeError(
            `Element ID '${id}' (tag: ${elm.tagName}) is not an instance of ${validate.name}`,
            {
                cause: {
                    parent,
                    elm,
                    validate
                }
            }
        )
    
    return elm as any
}

/**
 * Inserts an element at a specified index of nodes
 * @param parent Parent element
 * @param index Index where the item will be inserted
 * @param element Element to be inserted
 */
export function insertAt<T extends Node>(parent: Node, index = -1, element: T) {
    parent.insertBefore(element, parent.childNodes[index] ?? null)
    return element
}

/**
 * Inserts an element at a specified index of elements
 * @param parent Parent element
 * @param index Index where the item will be inserted
 * @param element Element to be inserted
 */
export function insertAtElement<T extends Node>(parent: Element, index = -1, element: T) {
    parent.insertBefore(element, parent.children.item(index))
    return element
}

/**
 * Iterates that has `length` and `item` function, mostly from `NodeList` or `HTMLCollectionBase`
 */
export function* iterateLength<T extends { readonly length: number, item(index: number): any }>(src: T): Generator< NonNullable< ReturnType< T['item'] > > > {
    for (let i = 0; i < src.length; i++) {
        const item = src.item(i)
        yield item
    }
}
