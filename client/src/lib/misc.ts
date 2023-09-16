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
export function assignIfExist<A extends object, B, I extends string = never>(a: A, b: B, ignores: ReadonlyArray<I> | ReadonlySet<I> | ReadonlyMap<I, any> | ReadonlyRecord<I, any> = []): Replace<A, Pick<B, Exclude<keyof A & keyof B, I>>> {
    const ignoreTest: (v: I) => boolean =
        ignores instanceof Array ? ignores.includes.bind(ignores)
        : ignores instanceof Set || ignores instanceof Map ? ignores.has.bind(ignores)
        : v => v in ignores

    //@ts-ignore
    for (const k in b) if (k in a && !ignoreTest(k)) a[k] = b[k]
    
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
 * {@link fetch} but throws if not `ok` or `redirected`
 * @param url Fetch URL
 * @param opts Fetch options
 * @returns Fetch response
 */
export async function fetchThrow(url: string, opts?: RequestInit) {
    const res = await fetch(url, opts)
    if (!res.ok && !res.redirected) throw new Error(`${opts?.method?.toUpperCase() ?? 'GET'} ${res.url}: Server responded with ${res.status} (${res.statusText})`, { cause: res })
    return res
}

/**
 * Gets an element by its identifier, throws an error if undefined / does not match the element type
 * @param id Element identifier
 * @param type Validation
 * @param parent Root
 * @returns Element
 */
export function getIdThrow<T extends new () => Element = new () => HTMLElement>(id: string, type?: T, parent: NonElementParentNode = document): InstanceType<T> {
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

    if (type && elm instanceof type == false)
        throw new TypeError(
            `Element ID '${id}' (tag: ${elm.tagName}) is not an instance of ${type.name}`,
            {
                cause: {
                    parent,
                    elm,
                    validate: type
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
 * @returns Element
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
 * @returns Element
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

/**
 * Iterates an iterable / non-iterable
 * 
 * @param orIterable Iterable / non-iterable
 *  - If it's iterable, will iterate as usual
 *  - If it's non-iterable, will only yield once (the value)
 */
export function* iterateOr<T>(orIterable: OrIterable<T>): Generator<T, void, any> {
    if (typeof orIterable === 'object' && orIterable && Symbol.iterator in orIterable) yield* orIterable
    else yield orIterable
}

/**
 * Iterates an object
 * @param recordOrIterable Object / iterable object
 */
export function* iterateRecord<K extends PropertyKey, V>(recordOrIterable: ReadonlyRecordOrIterable<K, V>): Generator<readonly [K, V], void, any> {
    if (Symbol.iterator in recordOrIterable) yield* recordOrIterable
    else for (const k in recordOrIterable) yield [k, recordOrIterable[k]]
}

/**
 * Returns a promise that resolves after specified milliseconds
 * @param ms Number of milliseconds to wait
 */
export async function sleep(ms: number) {
    return new Promise<void>(res => setTimeout(res, ms))
}
