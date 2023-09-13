import { element } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { getIdThrow } from "../lib/misc.js";
import { handleResize } from "../lib/resize.js";
import { sendEval } from "../util.js";

const list = getIdThrow('eval-list')
const input = getIdThrow('eval-input', HTMLTextAreaElement)
const send = getIdThrow('eval-send', HTMLButtonElement)
const resize = getIdThrow('eval-resize')

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
                innerHTML: hljs.highlight(value, { language: 'javascript' }, true).value,
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
                                once: true
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
        const data = await sendEval(value)

        retElm.style.color = data.error ? 'lightcoral' : 'lime'
        resElm.append(uninspectJSONToElement(data.result))
    } catch(e) {
        console.error('Eval failed:', e)
        retElm.style.color = 'lightcoral'
        resElm.textContent = String(e)
    }
}

function selectLines(lines: string[], start: number, end = start) {
    let ptr = 0, startIndex = 0, endIndex = 0
    if (start > end) [start, end] = [end, start]

    for (const [i, line] of lines.entries()) {
        const nptr = ptr + line.length

        // start
        if (ptr <= start && start <= nptr) {
            startIndex = i
        }

        // end
        if (ptr <= end && end <= nptr) {
            endIndex = i
            break
        }

        ptr = nptr + 1
    }

    endIndex++

    return {
        startIndex,
        endIndex,
        selectedLines: lines.slice(startIndex, endIndex)
    }
}

function boundaryType(char = ' ') {
    return '([{<'.includes(char) ? 'open'
        : '>}])'.includes(char) ? 'close'
        : false
}

// inputs

input.addEventListener('keydown', ev => {
    const { charCode, keyCode, which, ctrlKey, shiftKey } = ev

    switch (charCode || keyCode || which) {
        case 13: {
            ev.preventDefault()

            // control key
            if (ctrlKey) {
                const val = input.value
                if (val) sendInput(val)
                break
            }

            // get selection, line, current line
            const { selectionStart: start, selectionEnd: end, value } = input
            const lines = value.split('\n')
            const currentLine = selectLines(lines, start)

            // get current tab level, suffix level
            let tabLevel = currentLine.selectedLines[0]?.match(/^ */)?.[0].length ?? 0
            let suffixTabLevel = 0

            // value trimmed value, boundary
            const valueStart = value.slice(0, start), valueEnd = value.slice(end)
            const bndStart = boundaryType(valueStart.replace(/ *$/, '').at(-1)), bndEnd = boundaryType(valueEnd.replace(/^ */, '').at(0))

            switch (bndStart) {
                case 'open': {
                    if (bndEnd === 'close') suffixTabLevel = tabLevel
                    tabLevel += 4
                } break

                case 'close': {
                    if (bndEnd === 'open') suffixTabLevel = tabLevel
                    else tabLevel -= 4
                } break
            }

            // set value
            const nvStart = valueStart + '\n' + ' '.repeat(tabLevel), nvEnd = (suffixTabLevel ? '\n' + ' '.repeat(suffixTabLevel) : '') + valueEnd
            input.value = nvStart + nvEnd
            input.setSelectionRange(nvStart.length, nvStart.length, 'none')
        } break

        case 9: {
            if (ctrlKey) break
            ev.preventDefault()

            // get selection & lines
            const { selectionStart: start, selectionEnd: end, selectionDirection, value } = input
            const lines = value.split('\n')

            // get selected lines & calculate initial length
            const { startIndex, endIndex, selectedLines } = selectLines(lines, start, end)
            const initLen = selectedLines.reduce((a, b) => a + b.length, 0), initFirstLen = selectedLines.at(-1)?.length ?? 0

            // map lines
            const mapped = selectedLines.map(v => shiftKey ? v.replace(/^ {0,4}/, '') : '    ' + v)
            lines.splice(startIndex, endIndex - startIndex, ...mapped)

            // calculate delta length
            const deltaLen = mapped.reduce((a, b) => a + b.length, 0) - initLen,
                deltaFirstLen = (mapped.at(-1)?.length ?? 0) - initFirstLen

            // set value & selection
            input.value = lines.join('\n')
            input.setSelectionRange(start + deltaFirstLen, end + deltaLen, selectionDirection)
        }
    }
})

send.addEventListener('click', () => {
    if (!input.value) return input.focus()
    sendInput(input.value)
})

handleResize(resize, input, 0, -1)
