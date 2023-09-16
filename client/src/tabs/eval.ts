import { element } from "../lib/element.js";
import { uninspectJSONToElement } from "../lib/json_elm_uninspector.js";
import { getIdThrow } from "../lib/misc.js";
import { handleResize } from "../lib/resize.js";
import { sendEval } from "../util.js";

const list = getIdThrow('eval-list')
const input = getIdThrow('eval-input', HTMLTextAreaElement)
const send = getIdThrow('eval-send', HTMLButtonElement)
const resize = getIdThrow('eval-resize')

const optsKeep = getIdThrow('eval-o-keep', HTMLInputElement)
const optsAsync = getIdThrow('eval-o-async', HTMLInputElement)

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
        const data = await sendEval(value, optsKeep.checked, optsAsync.checked)

        retElm.style.color = data.error ? 'lightcoral' : 'lime'
        resElm.append(uninspectJSONToElement(data.result))
    } catch(e) {
        console.error('Eval failed:', e)
        retElm.style.color = 'lightcoral'
        resElm.textContent = String(e)
    }
}

// inputs

input.addEventListener('keydown', ev => {
    const { charCode, keyCode, which, ctrlKey, shiftKey } = ev

    switch (charCode || keyCode || which) {
        case 13: {
            if (!input.value || !ctrlKey) return

            ev.preventDefault()
            sendInput(input.value)
        } break

        case 9: {
            if (ctrlKey) return

            ev.preventDefault()
            const { selectionStart: start, selectionEnd: end, value } = input

            // get selection, lines, initial line length
            const lines = value.split('\n')
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
            input.setSelectionRange(start + deltaFirstLen, end + deltaLen, input.selectionDirection)
        } break
    }
})

input.addEventListener('beforeinput', (ev) => {
    const { inputType } = ev, char = ev.data ?? ''
    const { selectionStart: start, selectionEnd: end, value } = input

    switch (inputType) { 
        case 'insertLineBreak': {
            // line, current line, current tab level, suffix level
            const lines = value.split('\n')
            const currentLine = selectLines(lines, start)
            let tabLevel = currentLine.selectedLines[0]?.match(/^ */)?.[0].length ?? 0
            let suffixTabLevel: number | undefined

            // value trimmed value, boundary
            const [valueStart, valueEnd] = sliceOutside(value, start, end)
            const bndStart = boundaryType(valueStart.replace(/ *$/, '').at(-1)),
                bndEnd = boundaryType(valueEnd.replace(/^ */, '').at(0))

            switch (bndStart) {
                case 'open': {
                    if (bndEnd === 'close') suffixTabLevel = tabLevel
                    tabLevel += 4
                } break

                case 'close': {
                    if (bndEnd === 'open') suffixTabLevel = tabLevel
                    else tabLevel -= Math.max(tabLevel - 4, 0)
                } break
            }

            // set value
            const nvStart = valueStart + ('\n' + ' '.repeat(tabLevel)),
                nvEnd = (suffixTabLevel !== undefined ? '\n' + ' '.repeat(suffixTabLevel) : '') + valueEnd
            
            input.value = nvStart + nvEnd
            input.setSelectionRange(nvStart.length, nvStart.length, 'none')

            ev.preventDefault()
            return
        } return
        
        case 'insertText': {
            // char is closing bracket, start selection === end selection
            if (char in bracketCloses && start === end && value[end] === char) {
                input.setSelectionRange(start + 1, start + 1, 'none')

                ev.preventDefault()
                return
            }

            // char is bracket pair
            const bracket = bracketPairs[char]
            if (bracket) {
                const [nvStart, nvEnd] = sliceOutside(value, start, end)
                const selection = value.slice(start, end)

                input.value = nvStart + char + selection + bracket + nvEnd
                input.setSelectionRange(start + 1, end + 1, input.selectionDirection)

                ev.preventDefault()
                return
            }
        } return

        case 'deleteContentBackward': {
            if (start === end) {
                const [bndStart, bndEnd] = value.slice(start - 1, start + 1)
                if (bndStart && bracketPairs[bndStart] === bndEnd) {
                    input.value = sliceOutside(value, start - 1, start + 1).join('')
                    input.setSelectionRange(start - 1, start - 1, )

                    ev.preventDefault()
                    return
                }
            }
        } return
    }
})

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

function sliceOutside(input: string, start: number, end: number): [string, string] {
    return [input.slice(0, start), input.slice(end)]
}

const bracketPairs: Record<string, string> = {
    '(': ')',
    '{': '}',
    '[': ']',
    '"': '"',
    "'": "'",
    '`': '`'
}
Object.setPrototypeOf(bracketPairs, null)

const bracketCloses: Record<string, null> = {
    ')': null,
    '}': null,
    ']': null,
    '"': null,
    "'": null,
    '`': null
}
Object.setPrototypeOf(bracketPairs, null)

send.addEventListener('click', () => {
    if (!input.value) return input.focus()
    sendInput(input.value)
})

handleResize(resize, input, 0, -1)
