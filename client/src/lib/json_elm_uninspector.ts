import { createText, createTooltip, element, insertRow } from "./element.js";

function uninspectObjectKey(val: JSONInspect.PropertyData) {
    const elm = element('span', val.name)
    if (val.isSymbol) elm.classList.add('ins-symbol')

    if (val.getter) {
        const sub = uninspectFunction(val.getter, true)
        sub.displayNode.textContent = ' [Getter] '

        sub.tooltipElm.replaceChildren(
            element('span', {
                classes: 'ins-function',
                textContent: sub.display
            }),
            ' ',
            `(${sub.src})`
        )

        elm.append(sub.elm)
    }

    if (val.setter) {
        const sub = uninspectFunction(val.setter, true)
        sub.displayNode.textContent = ' [Setter] '

        sub.tooltipElm.replaceChildren(
            element('span', {
                classes: 'ins-function',
                textContent: sub.display
            }),
            ' ',
            `(${sub.src})`
        )

        elm.append(sub.elm)
    }

    return elm
}

function uninspectObject(val: JSONInspect.ObjectBase, refs?: Ref) {
    const table = element('table', {
        className: 'ins-obj',
        hidden: true
    })
    const tbody = table.createTBody()

    // open / close
    const btn = element('button', {
        classes: 'ins-button',
        textContent: ' <expand> '
    })
    btn.addEventListener('click', () => btn.textContent = (table.hidden = !table.hidden) ? ' <expand> ' : ' <collapse> ')

    const once = new Promise(res => btn.addEventListener('click', res, { once: true }))
    once.finally(() => {
        // properties
        for (const [k, v] of val.properties) {
            insertRow(tbody, undefined, [
                uninspectObjectKey(k),
                uninspectJSONToElement(v, refs)
            ])
        }

        // prototype
        if (val.proto) {
            insertRow(tbody, undefined, [
                element('span', {
                    classes: 'ins-obj-proto',
                    textContent: '[[Prototype]]'
                }),
                typeof val.proto === 'string'
                    ? element('span', {
                        classes: ['ins-obj-name'],
                        textContent: val.proto
                    })
                    : uninspectObject(val.proto, refs).elm
            ])
        }
    })

    return {
        elm: element('span', [
            element('span', {
                classes: 'ins-obj-name',
                textContent: val.name ? val.name + ' ' : ''
            }),
            '{', btn, table, '}'
        ]),
        table,
        tbody,
        once
    }
}

export function uninspectFunction(fn: JSONInspect.Values.Function, noContent = false, refs?: Ref) {
    const name = fn.isFunc
        ? fn.isAsync ? fn.isGenerator ? 'AsyncGeneratorFunction' : 'AsyncFunction' : fn.isGenerator ? 'GeneratorFunction' : 'Function'
        : 'Class'
    
    const display = `[${name}: ${fn.name || '<anonymous>'}]` + ' '
    const src = fn.srcFile ? fn.srcFile + ':' + fn.srcLine : '<native>'

    // function name
    const nameElm = element('span', { classes: fn.isFunc ? 'ins-function' : 'ins-class' })
    const displayNode = nameElm.appendChild(createText(display))
    const tooltipElm = createTooltip(nameElm,  element('span', { classes: 'ins-plain', textContent: src }), 'topcenter')

    // content
    let contentElm
    if (noContent) contentElm = createText('')
    else {
        const data = uninspectObject({ proto: '', properties: fn.properties }, refs)

        if (fn.extend) {
            insertRow(data.tbody, undefined, [
                element('span', {
                    classes: 'ins-obj-proto',
                    textContent: '[[Prototype]]'
                }),
                uninspectFunction(fn.extend, noContent, refs).elm
            ])
        }

        contentElm = data.elm
    }

    return {
        elm: element('span', [ nameElm, contentElm ]),
        nameElm,
        displayNode,
        tooltipElm,

        display,
        src
    }
}

export function uninspectJSONToElement(data: JSONInspect.All, refs?: Ref): HTMLElement {
    switch (data.type) {
        case 'string':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: JSON.stringify(data.value)
            })

        case 'number':
        case 'boolean':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: String(data.value)
            })
        
        case 'null':
        case 'undefined':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: data.type
            })

        case 'symbol':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: `Symbol(${data.desc})`
            })
        
        case 'circular':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: `[Circular]`
            })
    
        case 'function':
            return uninspectFunction(data, undefined, refs).elm
        
        case 'error':
        case 'getter_error':
            return element('span', {
                classes: 'ins-' + data.type,
                textContent: data.errorObj ? data.errorObj.name + ': ' + data.errorObj.message + '\n' + data.errorObj.stack : data.error
            })

        case 'array': {
            const { elm, tbody, once } = uninspectObject(data, refs)
            once.finally(() => {
                if (data.values.length <= 100) {
                    for (const [i, value] of data.values.entries())
                        insertRow(tbody, i, [ String(i), uninspectJSONToElement(value, refs) ])
                } else {
                    const chk = 100
                    let k = 0
                    for (let i = 0; i < data.values.length; i += chk) {
                        const { elm, tbody: sub } = uninspectObject({ proto: undefined, properties: [] }, refs)
    
                        for (const [j, value] of data.values.slice(i, i + chk).entries())
                            insertRow(sub, undefined, [ `[${i+j}]`, uninspectJSONToElement(value, refs) ])
                        insertRow(tbody, k++, [ `[${i}..${i+chk-1}]`, elm ])
                    }
                }
            })

            return elm
        }

        case 'set': {
            const { elm, tbody, once } = uninspectObject(data, refs)
            once.finally(() => {
                for (const [i, v] of data.values.entries())
                insertRow(tbody, i, [ '>', uninspectJSONToElement(v, refs) ])
            })

            return elm
        }

        case 'map': {
            const { elm, tbody, once } = uninspectObject(data, refs)
            once.finally(() => {
                for (const [i, [k, v]] of data.entries.entries())
                insertRow(tbody, i, [ uninspectJSONToElement(k, refs), uninspectJSONToElement(v, refs) ])
            })

            return elm
        }

        case 'proxy': {
            const { elm, tbody, once } = uninspectObject({ proto: 'Proxy', properties: [] }, refs)
            const { handler, object, revocable } = data

            once.finally(() => {
                insertRow(tbody, 0, [ '[object]', uninspectJSONToElement(object, refs) ])
                insertRow(tbody, 1, [ '[handler]', uninspectJSONToElement(handler, refs) ])
                insertRow(tbody, 2, [ '[revocable]', uninspectJSONToElement({ type: 'boolean', value: revocable }, refs) ])
            })

            return elm
        }

        case 'rootref': {
            return uninspectJSONToElement(data.value, new Map(data.refs))
        }

        case 'ref': {
            if (!refs) throw new ReferenceError(`Reflist not defined (referencing ${data.id})`)

            const v = refs.get(data.id)
            if (!v) throw new ReferenceError(`Reference ID ${data.id} not found`)

            return uninspectJSONToElement(v, refs)
        }

        case 'object':
        case 'weak':
            return uninspectObject(data, refs).elm
    }
}

type Ref = Map<number, JSONInspect.All>
