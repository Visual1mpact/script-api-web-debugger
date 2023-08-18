import { element, insertRow } from "../lib/element.js";
import { uninspectJSON } from "../lib/json_uninspector.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";
import { bedrockEvents } from "../sse.js";

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

const init = fetchThrow('/session/script/property_registry')
    .then(async v => await v.json() as Bedrock.Events['property_registry'])

// world
{
    const list: Record<string, PropertyData> = Object.create(null)

    const table = getIdThrow('properties-world-list', HTMLTableElement)
    const tbody = table.tBodies.item(0) ?? table.createTBody()

    const est = getIdThrow('properties-world-est')
    let estValue = 0

    // init & sse

    const worldInit = Promise.all([
        fetchThrow('/session/sendeval', {
            method: 'POST',
            body: 'this.dynamicProperties.getAllWorld()'
        }),
        init
    ])
        .then(async ([ev, init]) => {
            for (const [key, type] of init.world) {
                let value
                const row = insertRow(tbody, undefined, [
                    key,
                    type.type,
                    elementValue(type.default),
                    value = element('span', '...')
                ])
    
                list[key] = {
                    row,
                    defaultValue: type.default,
                    value
                }
    
                let valueSize = type.type === 'string' ? 2 + type.maxLength
                    : type.type === 'number' ? 5
                    : 2
    
                estValue += valueSize + key.length
            }
    
            est.textContent = estValue.toString()
    
            const { result, error } = await ev.json()
            const data = uninspectJSON(result) as Record<string, DynamicPropertyValue>
            if (error) throw data
    
            for (const [key, value] of Object.entries(data)) {
                const prop = list[key]
                if (!prop) continue
    
                prop.value.replaceChildren(elementValue(value))
            }
        })
        .catch(e => console.error(e))
        
    bedrockEvents.addEventListener('property_set', async ({ detail: data }) => {
        if (data.type !== 'world') return

        const { value, property } = data

        const prop = list[property]
        if (!prop) return
    
        await worldInit

        prop.value.replaceChildren(elementValue(value))
        prop.row.animate([
            { background: `rgba(64, 64, 255, 0.2)` },
            { background: `rgba(64, 64, 255, 0)` },
        ], {
            duration: 500,
            composite: 'add'
        })
    })
}

// entity
{
    const trackElm = getIdThrow('properties-tracklist')

    const trackList: Record<string, {
        readonly elm: HTMLElement
        readonly properties: Record<string, PropertyData>
    }> = Object.create(null)

    // handler

    const track = {
        type: getIdThrow('p-addtrack-type', HTMLSelectElement),
        value: getIdThrow('p-addtrack-value', HTMLInputElement),
        track: getIdThrow('p-addtrack-track', HTMLButtonElement),
    }

    track.track.addEventListener('click', async () => {
        const value = track.value.value
        const type = track.type.value

        if (!value) return track.value.focus()

        const res = await fetchThrow('/session/sendeval', {
            method: 'POST',
            body: `
                const ent = ${type === 'player' ? '$player' : '$id'}(${JSON.stringify(value)});
                ({
                    id: ent.id,
                    type: ent.typeId,
                    props: dynamicProperties.getAllEntity(ent)
                })
            `
        })
        const { result, error } = await res.json()
        const data = uninspectJSON(result) as { id: string, type: string, props: Record<string, DynamicPropertyValue> }
        if (error) throw data

        let estValue = 0

        const table = element('table', {
            classes: ['row-2', 'fill-x', 'border'],
            styles: { 'grid-area': 't' }
        })
        const thead = table.createTHead()
        const tbody = table.createTBody()
        insertRow(thead, undefined, ['property', 'type', 'default', 'value'])

        const plist: Record<string, PropertyData> = Object.create(null)

        const list = (await entityInit).get(data.type) ?? []
        for (const [key, type] of list) {
            let value
            const row = insertRow(tbody, undefined, [
                key,
                type.type,
                elementValue(type.default),
                value = element('span', '...')
            ])

            plist[key] = {
                row,
                defaultValue: type.default,
                value
            }

            let valueSize = type.type === 'string' ? 2 + type.maxLength
                : type.type === 'number' ? 5
                : 2

            estValue += valueSize + key.length
        }

        for (const [key, value] of Object.entries(data.props)) {
            const prop = plist[key]
            if (!prop) continue

            prop.value.replaceChildren(elementValue(value))
        }

        let stopBtn
        const cnt = element('div', {
            classes: 'flex-col',
            childrens: [
                element('div', {
                    childrens: [
                        element('h3', `${data.id} (${data.type})`),
                        ' ',
                        element('span', `estimated size: ${estValue} bytes`),
                    ],
                    styles: { 'grid-area': 'i' }
                }),
                stopBtn = element('button', {
                    textContent: 'stop',
                    styles: { 'grid-area': 's' }
                }),
                table
            ]
        })

        stopBtn.addEventListener('click', () => {
            cnt.remove()
            delete trackList[data.id]
        }, { once: true })

        trackList[data.id] = {
            elm: cnt,
            properties: plist
        }
        trackElm.append(cnt)
    })

    // init & sse
        
    const entityInit = init.then(v => new Map(v.entities))
        
    bedrockEvents.addEventListener('property_set', async ({ detail: data }) => {
        if (data.type !== 'entity') return

        const { value, property } = data

        const prop = trackList[data.entityId]?.properties[property]
        if (!prop) return

        prop.value.replaceChildren(elementValue(value))
        prop.row.animate([
            { background: `rgba(64, 64, 255, 0.2)` },
            { background: `rgba(64, 64, 255, 0)` },
        ], {
            duration: 500,
            composite: 'add'
        })
    })
}

interface PropertyData {
    readonly defaultValue: DynamicPropertyValue
    readonly value: HTMLSpanElement
    readonly row: HTMLTableRowElement
}

type DynamicPropertyValue = string | number | boolean | undefined
