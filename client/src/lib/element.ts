import { Anchors, getOuterAnchor } from "./anchor.js"
import { assignIfExist, insertAt, iterateOr, iterateRecord } from "./misc.js"

/**
 * Same as {@link Document.createElement} but allows more options. Creates a new HTML Element
 * @param tagName HTML element tag name
 * @param opts Element options, or children(s)
 * @returns New HTML element
 */
export function element<T extends string>(tag: T, opts?: CreateElementOptionsChildrened): T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement {
    const optsIsChild = isChildren(opts)
    const elm = document.createElement(tag, optsIsChild || !opts ? undefined : { is: opts.is })

    if (opts) {
        if (optsIsChild) elm.replaceChildren(...iterateOr(opts))
        else applyOptions(elm, opts)
    }

    return elm as any
}

/**
 * Applies options to the element
 * 
 * @param element element
 * @param opts Options
 * @returns element
 */
export function applyOptions<E extends CreateElementOptions.ElementType>(element: E, opts: CreateElementOptions.For<never, never>) {
    assignIfExist(element as never, opts as never, ignoredKeys as never)

    // apply attributes
    if (opts.attributes)
        for (const [k, v] of iterateRecord(opts.attributes))
            element.setAttribute(k, v)

    // apply classes
    if (opts.classes)
        element.classList.add(...iterateOr(opts.classes))

    // apply datasets
    if (opts.datas)
        for (const [k, v] of iterateRecord(opts.datas))
            element.dataset[k] = v
    
    // apply styles
    if (opts.styles)
        for (const [k, v] of iterateRecord(opts.styles))
            element.style.setProperty(k, v)
    
    // add listeners
    if (opts.on)
        for (const [k, l] of iterateRecord(opts.on)) {
            if (typeof l === 'function') element.addEventListener(k, l)
            else element.addEventListener(k, l.listener, l)
        }
    
    // add childrens
    if (opts.childrens)
        element.replaceChildren(...iterateOr(opts.childrens))

    return element
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
    const table = element('table')

    // table section (head, body, footer)
    for (const k of ['thead', 'tbody', 'tfoot'] as TableKeys[]) {
        const opts = tableOptions[k]
        if (opts === undefined) continue
        delete tableOptions[k]

        let section = element(k),
            childrens: OrIterable<CreateElementOptions.ChildrenOption> | undefined

        // childrens
        if (isChildren(opts)) {
            childrens = opts
        } else {
            if (opts.childrens) {
                childrens = opts.childrens
                delete opts.childrens
            }
            
            applyOptions(section, opts as never)
        }

        if (childrens) {
            for (const row of iterateOr(childrens)) {
                if (row instanceof HTMLTableRowElement) section.append(row)
                else insertRow(section, undefined, row)
            }
        }
        
        table.appendChild(section)
    }

    // caption
    if (tableOptions.caption) {
        table.append(element('caption', tableOptions.caption))
        delete tableOptions.caption
    }

    // apply options
    applyOptions(table as never, tableOptions as never)

    return table
}

type TableKeys = 'thead' | 'tbody' | 'tfoot'
type TableSectionInit = OrIterable<CreateElementOptions.ChildrenOption> | Replace<CreateElementOptions, { childrens?: OrIterable<CreateElementOptions.ChildrenOption> }>

type TableOptions =
    & CreateElementOptions
    & Partial<
        & Record<TableKeys, TableSectionInit>
        & { caption?: CreateElementOptionsChildrened }
    >

/**
 * Adds a row on a table section / table element
 * @param section Table section / table element
 * @param index Index where row will be inserted at in the section
 * @param opts Element options, or children(s)
 * @returns New table row
 */
export function insertRow(section: HTMLTableElement | HTMLTableSectionElement, index?: number | undefined, opts?: MutableSome<CreateElementOptions, 'childrens'> | CreateElementOptions.ChildrenOption) {
    if (opts) {
        if (isChildren(opts)) opts = Array.from(iterateOr(opts), v => v instanceof HTMLTableCellElement ? v : element('td', v))
        else if (opts.childrens) opts.childrens = Array.from(iterateOr(opts.childrens), v => v instanceof HTMLTableCellElement ? v : element('td', v))
    }

    return insertAt(section, index, element('tr', opts))
}

/**
 * Adds a table cell on a table row
 * @param row Table row
 * @param index Index where cell will be inserted at in the row
 * @param opts Element options, or children(s)
 * @returns New table cell
 */
export function insertCell(row: HTMLTableRowElement, index?: number | undefined, opts?: CreateElementOptions.ForChildrened<HTMLTableCellElement, 'colSpan' | 'headers' | 'rowSpan' | 'scope'>) {
    return insertAt(row, index, opts instanceof HTMLTableCellElement ? opts : element('td', opts))
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

const ignoredKeys = {
    attributes: null,
    classes: null,
    dataset: null,
    styles: null,
    childrens: null,
    on: null,
}

function isChildren(n: any): n is Node | string | Iterable<any> {
    return n instanceof Node || typeof n === 'string' || typeof n === 'object' && Symbol.iterator in n
}

export declare namespace CreateElementOptions {
    type For<E extends ElementType = HTMLElement, P extends keyof E = E extends HTMLElement ? HTMLGlobalProperties : GlobalProperties>
        = Partial<Readonly<
            CustomOptions
            & Pick<E, P>
            & Record<string, any>
        >>
    
    type ForChildrened<E extends ElementType = HTMLElement, P extends keyof E = E extends HTMLElement ? HTMLGlobalProperties : GlobalProperties>
        = For<E, P> | ChildrenOption

    type GlobalProperties =
        | 'autofocus'
        | 'id'
        | 'nonce'
        | 'part'
        | 'tabIndex'
        | 'innerHTML'
        | 'outerHTML'
        | 'textContent'
    
    type HTMLGlobalProperties =
        | GlobalProperties
        | 'accessKey'
        | 'autocapitalize'
        | 'contentEditable'
        | 'dir'
        | 'draggable'
        | 'enterKeyHint'
        | 'hidden'
        | 'inert'
        | 'inputMode'
        | 'lang'
        | 'spellcheck'
        | 'title'
        | 'translate'
        | 'innerText'
        | 'outerText'

    interface CustomOptions {
        /**
         * Element attributes init
         * 
         * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes)
         * 
         * See {@link Element.attributes}
         */
        attributes: ReadonlyRecordOrIterable<string, string>

        /**
         * Element CSS classes init,
         * can be a single string for a single class
         * 
         * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/classList)
         * 
         * See {@link Element.classList}
         */
        classes: OrIterable<string>

        /**
         * Element dataset init
         * 
         * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset)
         * 
         * See {@link HTMLOrSVGElement.dataset}
         */
        datas: ReadonlyRecordOrIterable<string, string>

        /**
         * Element CSS styles init
         * 
         * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/style)
         * 
         * See {@link ElementCSSInlineStyle.style}
         */
        styles: ReadonlyRecordOrIterable<string, string>

        /**
         * Element childrens
         */
        childrens: ChildrenOption

        /**
         * Element listeners
         */
        on: { [K in string]: ListenerOption<K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : Event> }

        /**
         * Tag name of a custom element
         */
        is: string
    }

    type ListenerOption<T extends Event> = { (ev: T): any } | Readonly< AddEventListenerOptions & { listener(ev: T): any } >
    type ChildrenOption<T extends Node = Node> = OrIterable<string | T>
    type ElementType = Element & HTMLOrSVGElement & ElementCSSInlineStyle
}

type CreateElementOptions = CreateElementOptions.For
type CreateElementOptionsChildrened = CreateElementOptions.ForChildrened
