import { Anchors, getOuterAnchor } from "./anchor.js"
import { assignIfExist, insertAt } from "./misc.js"

/**
 * Same as {@link Document.createElement} but allows more options. Creates a new HTML Element
 * @param tagName HTML element tag name
 * @param opts Element options, or children(s)
 * @param ignores Option properties to be ignored during property assignment to the element
 * @param allowChildrens Appends childrens from options
 * @returns New HTML element
 */
export function element<T extends string>(tagName: T, opts?: ElementEditableObject | StringOrNodeOrArray, ignores?: Set<string> | string[], allowChildrens = true): T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement {
    const elm = document.createElement(tagName)
    if (!opts) return elm as any

    if (opts instanceof Array) {
        if (allowChildrens) for (const d of opts)
            elm.append(typeof d === 'string' ? createText(d) : d)
    }
    else if (opts instanceof Node) {
        if (allowChildrens) elm.append(opts)
    }
    else if (typeof opts === 'string') {
        if (allowChildrens) elm.append(createText(opts))
    }
    else if (opts) {
        assignIfExist(elm, opts, ignores)

        if (opts.childrens && allowChildrens)
            elm.replaceChildren(...opts.childrens)
        
        if (opts.classes)
            elm.classList.add(...( typeof opts.classes !== 'string' ? opts.classes : [opts.classes] ))
        
        if (opts.styles)
            for (const [k, v] of opts.styles[Symbol.iterator]?.() ?? Object.entries(opts.styles)) elm.style.setProperty(k, v)
    
        if (opts.datas) Object.assign(elm.dataset, opts.datas)

        if (opts.on) {
            for (const [k, v] of Object.entries(opts.on)) {
                if (typeof v === 'function') elm.addEventListener(k, v)
                else elm.addEventListener(k, v.listener, v.options)
            }
        }
    }

    return elm as any
}

/**
 * Creates a new `text` node
 * @param text Text
 */
export function createText(text?: string) {
    return document.createTextNode(text ?? '')
}

/**
 * Creates a new table
 * @param tableOptions Table options
 * @returns Table
 */
export function createTable(tableOptions: TableOptions) {
    const table = element('table', tableOptions, ['thead', 'tbody', 'tfoot', 'caption'])

    for (const k of ['thead', 'tbody', 'tfoot'] as TableKeys[]) {
        const opts = tableOptions[k]
        if (opts === undefined) continue

        let section: HTMLTableSectionElement, init: TableSectionChildrensInit

        if (Array.isArray(opts)) {
            section = element(k, undefined, undefined, false)
            init = opts
        } else {
            section = element(k, opts, undefined, false)
            init = opts.init ?? []
        }

        for (const row of init) {
            if (row instanceof HTMLTableRowElement) section.append(row)
            else insertRow(section, undefined, row)
        }
        
        table.appendChild(section)
    }

    if (tableOptions.caption) table.append(element('caption', tableOptions.caption))

    return table
}

type TableKeys = 'thead' | 'tbody' | 'tfoot'
type TableSectionChildrensInit = ( HTMLTableRowElement | StringOrNodeOrArray | ElementEditableObject )[]

type TableOptions = ElementEditableObject
    & {
        [K in TableKeys]?: TableSectionChildrensInit
            | ElementEditableObject & {
                childrens?: undefined
                init?: TableSectionChildrensInit
            }
    } & {
        caption?: StringOrNodeOrArray | ElementEditableObject
    }

/**
 * Adds a row on a table section / table element
 * @param section Table section / table element
 * @param index Index where row will be inserted at in the section
 * @param opts Element options, or children(s)
 * @returns New table row
 */
export function insertRow(section: HTMLTableElement | HTMLTableSectionElement, index?: number | undefined, opts?: StringOrNodeOrArray | ElementEditableObject) {
    const elm = insertAt(section, index, element('tr', opts, undefined, false))

    for (const child of childrens(opts)) {
        if (child instanceof HTMLTableCellElement) elm.append(child)
        else elm.insertCell().append(child)
    }

    return elm
}

/**
 * Adds a table cell on a table row
 * @param row Table row
 * @param index Index where cell will be inserted at in the row
 * @param opts Element options, or children(s)
 * @returns New table cell
 */
export function insertCell(row: HTMLTableRowElement, index?: number | undefined, opts?: StringOrNodeOrArray | ElementEditableObject<HTMLTableCellElement, 'colSpan' | 'headers' | 'rowSpan' | 'scope'>) {
    return insertAt( row, index, element('td', opts) )
}

/**
 * Creates a tooltip handler
 * @param base Base element
 * @param tooltip Tooltip element
 * @param anchor Tooltip anchor
 */
export function createTooltip<T extends HTMLElement>(base: HTMLElement, tooltip: T, anchor: Anchors) {
    base.classList.add('tooltip')
    tooltip.classList.add('tooltip-content')
    base.append(tooltip)

    base.addEventListener('pointerenter', () => {
        requestAnimationFrame(() => {
            const tooltipRect = tooltip.getBoundingClientRect()
            tooltipRect.x = tooltipRect.y = 0

            const baseRect = base.getBoundingClientRect()
            baseRect.x = baseRect.y = 0

            const {x, y} = getOuterAnchor( tooltipRect, baseRect, anchor )
    
            tooltip.style.top = y + 'px'
            tooltip.style.left = x + 'px'
        })
    })

    return tooltip
}

function* childrens(opts?: StringOrNodeOrArray | ElementEditableObject) {
    if (opts instanceof Array) {
        for (const d of opts)
            yield typeof d === 'string' ? createText(d) : d
    }
    else if (opts instanceof Node) {
        yield opts
    }
    else if (typeof opts === 'string') {
        yield createText(opts)
    }
    else if (opts?.childrens) {
        for (const d of opts.childrens)
            yield typeof d === 'string' ? createText(d) : d
    }
}

/**
 * String, or a Node, or an array of those.
 * Mostly used for element children type
 */
export type StringOrNodeOrArray = string | Node | (string | Node)[]

/** Editable HTML element properties, in form of object */
export type ElementEditableObject<T extends HTMLElement = HTMLElement, K extends keyof T = never> = (
    Partial<
        Pick<
            T,
            | "accessKey"
            | "autocapitalize"
            | "dir"
            | "draggable"
            | "hidden"
            | "inert"
            | "innerText"
            | "lang"
            | "id"
            | "outerHTML"
            | "outerText"
            | "innerHTML"
            | "innerText"
            | "className"
            | "textContent"
            | K
        >
    >
    & Partial<{
        [x: string]: any

        /**
         * Element classes.
         * Can be a string, or an iterable of it
         */
        classes: string | Iterable<string>

        /**
         * Element childrens.
         * Must be an iterable of strings or nodes
         */
        childrens: Iterable<Node | string>

        /**
         * Element styles.
         * Can be an object whose key is style property and value is style value,
         * or an iterable pair
         */
        styles: RecordOrIterable<string, string>

        /**
         * Element datas.
         * Must be an object
         */
        datas: Record<string, string>

        /**
         * Element listeners
         */
        on: {
            [K in string]: ( (<T extends Event>(ev: T) => any) )
                | {
                    listener: <T extends Event>(ev: T) => any
                    options?: AddEventListenerOptions
                }
        }
    }>
)
