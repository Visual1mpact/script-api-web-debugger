import { element } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/elminspector.js";
import { fetchThrow, getIdThrow } from "../lib/misc.js";

const list = getIdThrow('eval-list')
const input = getIdThrow('eval-input', HTMLTextAreaElement)
const send = getIdThrow('eval-send', HTMLButtonElement)

async function sendInput(value: string) {
    let retElm, resElm, actDel
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
                    actDel = element('button', 'delete')
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

    actDel.addEventListener('click', () => elm.remove(), { once: true })

    try {
        const res = await fetchThrow('/session/sendeval', {
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

// handlers

input.addEventListener('keypress', ({ charCode, ctrlKey }) => {
    if (charCode !== 13 || !input.value || !ctrlKey) return
    sendInput(input.value)
})

send.addEventListener('click', () => {
    if (!input.value) return input.focus()
    sendInput(input.value)
})
