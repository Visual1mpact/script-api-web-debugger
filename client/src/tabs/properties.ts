import init from "../init.js";
import { createTable, element, insertRow } from "../lib/element.js";
import { uninspectJSON } from "../lib/json_uninspector.js";
import { getIdThrow } from "../lib/misc.js";
import { bedrockEvents } from "../sse.js";
import { sendEvalThrowable } from "../util.js";

function elementValue(v: string | number | boolean | undefined) {
    switch (typeof v) {
        case 'string':
            return element('span', {
                classes: 'ins-string',
                textContent: JSON.stringify(v)
            })

        case 'number':
            return element('span', {
                classes: 'ins-number',
                textContent: String(v)
            })

        case 'boolean':
            return element('span', {
                classes: 'ins-boolean',
                textContent: String(v)
            })

        case 'undefined':
            return element('span', {
                classes: 'ins-undefined',
                textContent: 'undefined'
            })
    }
}

export class PropertiesTable {
    static pulse = false

    constructor(properties?: RecordOrIterable<string, Bedrock.T_DynamicPropertyData>, entityId?: string) {
        this.table = createTable({
            classes: ['row-2', 'fill-x', 'border', 'properties-table'],
            styles: { 'grid-area': 't' },

            thead: [[ 'property', 'type', 'default', 'value', 'action' ]],
            tbody: {
                classes: 'code'
            }
        })
        this.tbody = this.table.tBodies.item(0) ?? this.table.createTBody()

        if (properties) 
            for (const [key, data] of properties[Symbol.iterator]?.() ?? Object.entries(properties))
                this.register(key, data)

        this.entityId = entityId
    }

    readonly table: HTMLTableElement
    readonly tbody: HTMLTableSectionElement

    #estSize = 0
    #properties: Record<string, {
        readonly row: HTMLTableRowElement
        readonly valueCell: HTMLTableCellElement

        defaultValue: Bedrock.T_DynamicPropertyValue
        value: Bedrock.T_DynamicPropertyValue
    }> = Object.create(null)

    entityId?: string

    get estimatedSize() { return this.#estSize }

    register(key: string, data: Bedrock.T_DynamicPropertyData, value?: Bedrock.T_DynamicPropertyValue) {
        const { type, 'default': defaultValue } = data

        const edit = () => {
            let value: Bedrock.T_DynamicPropertyValue = v.value
            elmValue.replaceChildren(
                element('br'),
                element('button', {
                    textContent: 'send',
                    on: {
                        click: {
                            listener: () => this.sendUpdate(key, value),
                            options: { once: true }
                        }
                    }
                }),
                element('button', {
                    textContent: 'cancel',
                    on: {
                        click: {
                            listener: () => elmValue.replaceChildren(elementValue(v.value)),
                            options: { once: true }
                        }
                    }
                })
            )

            let e: HTMLElement

            switch (type) {
                case 'boolean': {
                    const le: HTMLInputElement = element('input', {
                        type: 'checkbox',
                        checked: v.value ?? false,
                        on: { input: () => value = le.checked }
                    })
                    e = le
                    value ??= false
                } break

                case 'number': {
                    const le: HTMLInputElement = element('input', {
                        type: 'number',
                        value: v.value ?? '',
                        classes: 'fill-x',
                        on: { input: () => value = le.valueAsNumber }
                    })
                    e = le
                    value ??= 0
                } break

                case 'string': {
                    const le: HTMLTextAreaElement = element('textarea', {
                        maxLength: data.maxLength,
                        value: v.value ?? '',
                        classes: 'fill-x',
                        on: { input: () => value = le.value }
                    })
                    e = le
                    value ??= ''
                } break
            }

            e.addEventListener('keydown', ev => {
                const { charCode, keyCode, which, ctrlKey } = ev

                switch (charCode || keyCode || which) {
                    case 13: {
                        if (!ctrlKey) return
                        ev.preventDefault()

                        this.sendUpdate(key, value)
                    } break

                    case 27: {
                        ev.preventDefault()

                        elmValue.replaceChildren(elementValue(v.value))
                    } break
                }
            })
            
            e.title = 'press CTRL+ENTER to modify, ESC to cancel'
            elmValue.prepend(e)
            e.focus()
        }

        const actions = [
            element('img', {
                src: '/app/res/edit.svg',
                title: 'edit',
                on: { click: edit }
            }),
            element('img', {
                src: '/app/res/remove.svg',
                title: 'remove',
                on: { click: () => this.sendUpdate(key, undefined) }
            })
        ]

        let elmValue: HTMLTableCellElement
        const row = insertRow(this.tbody, undefined, [
            key,
            type,
            elementValue(defaultValue),
            elmValue = element('td', elementValue(value)),
            element('td', {
                classes: 'properties-opts',
                childrens: [ element('div', actions) ]
            })
        ])

        const v = {
            row,
            valueCell: elmValue,
            defaultValue,
            value
        }
        this.#properties[key] = v

        this.#estSize += key.length + (
            type === 'string' ? 2 + data.maxLength
            : type === 'number' ? 5
            : 2
        )

        return this
    }

    set(key: string, value: Bedrock.T_DynamicPropertyValue) {
        const prop = this.#properties[key]
        if (!prop) return

        prop.value = value

        prop.valueCell.replaceChildren(elementValue(value))
        if (PropertiesTable.pulse) prop.row.animate([
            { background: `rgba(64, 64, 255, 0.2)` },
            { background: `rgba(64, 64, 255, 0)` },
        ], {
            duration: 500,
            composite: 'add'
        })
    }

    get(key: string) {
        return this.#properties[key].value
    }

    sendUpdate(key: string, value: Bedrock.T_DynamicPropertyValue) {
        const refs = this.entityId ? `$id(${JSON.stringify(this.entityId)})` : 'world'
        const act = value === undefined ? `removeDynamicProperty(${JSON.stringify(key)})` : `setDynamicProperty(${JSON.stringify(key)}, ${JSON.stringify(value)})`

        sendEvalThrowable(refs + '.' + act)
    }
}

// world
{
    const wtable = new PropertiesTable()
    for (const [k, v] of init.script.propertyRegistry.world) wtable.register(k, v, init.script.worldProperties[k])
    
    getIdThrow('properties-world-list-cnt').appendChild(wtable.table)
    getIdThrow('properties-world-est').replaceChildren(String(wtable.estimatedSize))

    bedrockEvents.addEventListener('property_set', async ({ detail: data }) => {
        if (data.type !== 'world') return

        wtable.set(data.property, data.value)
    })
}

// entity
{
    const entityProperties = new Map(init.script.propertyRegistry.entities)

    const trackElm = getIdThrow('properties-tracklist')
    const trackList: Record<string, {
        readonly elm: HTMLElement
        readonly table: PropertiesTable
    }> = Object.create(null)

    // inputs

    const track = {
        type: getIdThrow('p-addtrack-type', HTMLSelectElement),
        value: getIdThrow('p-addtrack-value', HTMLInputElement),
        track: getIdThrow('p-addtrack-track', HTMLButtonElement),
    }

    track.track.addEventListener('click', async () => {
        const value = track.value.value
        const addtype = track.type.value

        if (!value) return track.value.focus()

        const res = await sendEvalThrowable(`
            const ent = ${addtype === 'player' ? '$player' : '$id'}(${JSON.stringify(value)});
            ({
                id: ent.id,
                type: ent.typeId,
                props: dynamicProperties.getAllEntity(ent)
            })
        `)
        const { id, type, props } = uninspectJSON(res.result) as { id: string, type: string, props: Record<string, Bedrock.T_DynamicPropertyValue> }

        const etable = new PropertiesTable(undefined, id)
        for (const [k, v] of entityProperties.get(type) ?? []) etable.register(k, v, props[k])

        const cnt = element('div', {
            classes: 'flex-col',
            childrens: [
                element('div', {
                    childrens: [
                        element('h3', `${id} (${type})`),
                        ' ',
                        element('span', `estimated size: ${etable.estimatedSize} bytes`),
                    ],
                    styles: { 'grid-area': 'i' }
                }),
                element('button', {
                    textContent: 'stop',
                    styles: { 'grid-area': 's' },
                    on: {
                        click: {
                            listener() {
                                cnt.remove()
                                delete trackList[id]
                            },
                            options: {
                                once: true
                            }
                        }
                    }
                }),
                etable.table
            ]
        })

        trackList[id] = {
            elm: cnt,
            table: etable
        }
        trackElm.append(cnt)
    })

    // init & sse

    bedrockEvents.addEventListener('property_set', async ({ detail: data }) => {
        if (data.type !== 'entity') return

        trackList[data.entityId]?.table.set(data.property, data.value)
    })
}
