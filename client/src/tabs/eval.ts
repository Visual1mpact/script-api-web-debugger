import { element } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";

const list = getIdThrow('eval-list')
const input = getIdThrow('eval-input', HTMLTextAreaElement)
const send = getIdThrow('eval-send', HTMLButtonElement)

export async function sendInput(value: string) {
    let retElm, resElm
    const elm = element('div', {
        classes: 'noflow',
        childrens: [
            element('span', {
                styles: { 'grid-area': 'send' },
                textContent: '\xab',
            }),
            element('div', {
                classes: ['code'],
                styles: {
                    'grid-area': 'code',
                    'overflow': 'auto',
                    'max-height': '20em'
                },
                textContent: value,
            }),
            element('div', {
                classes: 'flex',
                styles: {
                    'grid-area': 'act',
                    'align-self': 'start',
                    'gap': '8px',
                },
                childrens: [
                    element('button', {
                        textContent: 'delete',
                        on: {
                            click: {
                                listener() { elm.remove() },
                                options: {
                                    once: true
                                }
                            }
                        }
                    })
                ]
            }),
            retElm = element('span', {
                styles: {
                    'grid-area': 'ret',
                    'color': 'gray'
                },
                textContent: '\xbb'
            }),
            resElm = element('span', {
                classes: ['code'],
                styles: { 'grid-area': 'res' }
            })
        ]
    })
    list.append(elm)

    try {
        const res = await fetchThrow('/sendeval', {
            method: 'POST',
            body: value
        })
        const data: Bedrock.Events['eval'] = await res.json()

        retElm.style.color = data.error ? 'lightcoral' : 'lime'
        resElm.append(uninspectJSONToElement(data.result))
    } catch(e) {
        retElm.style.color = 'lightcoral'
        resElm.textContent = String(e)
    }
}

// inputs

input.addEventListener('keypress', ev => {
    const { charCode, ctrlKey } = ev
    if (charCode !== 13 || !input.value || !ctrlKey) return
    
    ev.preventDefault()
    sendInput(input.value)
})

send.addEventListener('click', () => {
    if (!input.value) return input.focus()
    sendInput(input.value)
})
