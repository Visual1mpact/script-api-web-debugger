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

class PropertiesTable {
    constructor(properties?: RecordOrIterable<string, Bedrock.T_DynamicPropertyData>, entityId?: string) {
        this.table = createTable({
            classes: ['row-2', 'fill-x', 'border'],
            styles: { 'grid-area': 't' },

            thead: [[ 'property', 'type', 'default', 'value' ]],
            tbody: {
                classes: 'code'
            }
        })
        this.tbody = this.table.tBodies.item(-1) ?? this.table.createTBody()

        if (properties) 
            for (const [key, data] of properties[Symbol.iterator]?.() ?? Object.entries(properties))
                this.register(key, data)

        this.entityId = entityId
    }

    readonly table: HTMLTableElement
    readonly tbody: HTMLTableSectionElement

    #estSize = 0
    #properties: Record<string, {
        readonly default: HTMLElement
        readonly row: HTMLTableRowElement
        readonly valueCell: HTMLTableCellElement
    }> = Object.create(null)

    entityId?: string

    get estimatedSize() { return this.#estSize }

    register(key: string, data: Bedrock.T_DynamicPropertyData) {
        const { type, 'default': defaultValue } = data

        let elmValue
        const row = insertRow(this.tbody, undefined, [
            key,
            type,
            elementValue(defaultValue),
            elmValue = element('td')
        ])

        this.#properties[key] = {
            default: elementValue(defaultValue),
            row,
            valueCell: elmValue
        }

        this.#estSize += key.length + (
            type === 'string' ? 2 + data.maxLength
            : type === 'number' ? 5
            : 2
        )

        return this
    }

    set(key: string, value: DynamicPropertyValue) {
        const prop = this.#properties[key]
        if (!prop) return

        prop.valueCell.replaceChildren(value === undefined ? prop.default : elementValue(value))
        prop.row.animate([
            { background: `rgba(64, 64, 255, 0.2)` },
            { background: `rgba(64, 64, 255, 0)` },
        ], {
            duration: 500,
            composite: 'add'
        })
    }
}

// world
{
    const wtable = new PropertiesTable(init.script.propertyRegistry.world)

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
        const { id, type, props } = uninspectJSON(res.result) as { id: string, type: string, props: Record<string, DynamicPropertyValue> }

        const etable = new PropertiesTable(undefined, id)
        for (const [k, v] of entityProperties.get(type) ?? []) etable.register(k, v).set(k, props[k])

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

type DynamicPropertyValue = string | number | boolean | undefined
