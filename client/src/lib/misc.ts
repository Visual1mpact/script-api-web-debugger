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
 * Get an average value of an array
 * @param arr Array of numbers
 * @param defaultZero Default value if array length is 0
 * @returns Average value
 */
export function average(arr: number[], defaultZero = NaN) {
    return arr.length ? sum(arr) / arr.length : defaultZero
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
 * Parses HTML
 * @param html HTML
 * @returns Document fragment
 */
export function evalHTML(html: string): DocumentFragment {
    const t = document.createElement('template')
    t.innerHTML = html
    return t.content
}

/**
 * Generates a promise that resolves once a specified event type is dispatched
 * @param target Event target
 * @param type Event type
 * @param opts Add listener options
 * @returns Promise that resolves when the event type is dispatched on the target
 */
export function eventPromise<T extends Event = Event>(target: EventTarget, type: string, opts?: AddEventListenerOptions): Promise<T> {
    return new Promise<any>(res => target.addEventListener(type, res, { once: true, ...opts }))
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
 * Inects CSS style
 * @param css CSS string
 */
export function injectCSS(css: string) {
    const elm = document.createElement('style')
    elm.innerText = css
    document.head.append(elm)
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

/**
 * Iterates through elements using TreeWalker
 * @param root Root element
 * @param show What to show
 * @param elementFilter Element filter function
 */
export function* iterateTree(root: Node, show: NodeShowKeys = 'SHOW_ALL', elementFilter?: (node: Node) => NodeFilterKeys | undefined | null) {
    const walker = document.createTreeWalker(root, NodeFilter[show], node => NodeFilter[elementFilter?.(node) ?? 'FILTER_ACCEPT'])

    let cnode: Node | null
    while (cnode = walker.nextNode()) yield cnode
}

/**
 * Generates a random integer between minimum (inclusive) to maximum (exclusive)
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer
 */
export function randomIntBetween(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min))
}

/**
 * Generates a random floating number between minimum (inclusive) to maximum (exclusive)
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer
 */
export function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min)
}

/**
 * Generates a random string with specified length and character set
 * @param length Length
 * @param charset Character set
 */
export function randomstr(length: number, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let str = ''
    for (let i = 0; i < length; i++) str += charset[Math.floor(Math.random() * charset.length)]
    return str
}

/**
 * Replaces an element with another one
 * @param element Element to be replaced
 * @param replaceWith New element
 * @returns New element
 */
export function replaceElement<T extends Node>(element: Node, replaceWith: T) {
    element.parentElement?.replaceChild(replaceWith, element)
    return replaceWith
}

/**
 * Sums am array.
 * @param arr Array of numbers
 * @returns Sum
 */
export function sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0)
}

/**
 * Iterates through node parents of a node, bubbling
 * @param node Node
 * @param self Include the node in iteration
 * @param stop The node that will stop the iteration when reached, defaults to `<body>`
 */
export function* parents(node: Node, stop: Node | null | undefined = document.body, self = false) {
    if (self) yield node

    let cnode: Node | null = node.parentNode
    while (cnode && cnode !== stop) {
        yield cnode
        cnode = cnode.parentNode
    }
}

/**
 * Sleeps for specified number of time
 * @param ms Number of milliseconds to sleep
 * @returns Promise that resolves after specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms))
}
