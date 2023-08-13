namespace Color {
    export const formats = {
        reset       : '0',
        bold        : '1',
        underline   : '4',
        inverse     : '7'
    }
    
    export const foregrounds: Record<ColorKeys, string> = {
        cyan    : '36',
        white   : '37',
        magenta : '35',
        blue    : '34',
        yellow  : '33',
        green   : '32',
        red     : '31',
        black   : '30',
    
        strong_cyan     : '96',
        strong_white    : '97',
        strong_magenta  : '95',
        strong_blue     : '94',
        strong_yellow   : '93',
        strong_green    : '92',
        strong_red      : '91',
        strong_black    : '90',
    }
    
    export const backgrounds: Record<ColorKeys, string> = {
        black   : '40',
        red     : '41',
        green   : '42',
        yellow  : '43',
        blue    : '44',
        magenta : '45',
        cyan    : '46',
        white   : '47',
    
        strong_black    : '100',
        strong_red      : '101',
        strong_green    : '102',
        strong_yellow   : '103',
        strong_blue     : '104',
        strong_magenta  : '105',
        strong_cyan     : '106',
        strong_white    : '107',
    }

    export const minecraftColors: Record<string, ColorKeys> = {
        0: 'black',
        1: 'blue',
        2: 'green',
        3: 'cyan',
        4: 'red',
        5: 'magenta',
        6: 'yellow',
        7: 'white',
        8: 'strong_black',
        9: 'strong_blue',
        a: 'strong_green',
        b: 'strong_cyan',
        c: 'strong_red',
        d: 'strong_magenta',
        e: 'strong_yellow',
        f: 'white'
    }
    
    export const minecraftFormats: Record<string, FormatKeys> = {
        l: 'bold',
        n: 'underline',
        r: 'reset'
    }
    
    Object.setPrototypeOf(formats, null)
    Object.setPrototypeOf(foregrounds, null)
    Object.setPrototypeOf(backgrounds, null)
    Object.setPrototypeOf(minecraftColors, null)
    
    export function color(foreground: ColorKeys, background?: ColorKeys) {
        if (background) return `\x1B[${backgrounds[background]};${foregrounds[foreground]}m`
        return `\x1B[${foregrounds[foreground]}m`
    }

    export function format(format: FormatKeys) {
        return `\x1B[${formats[format]}m`
    }

    export function minecraft(code: string) {
        const fg = minecraftColors[code]
        if (fg) return `\x1B[${foregrounds[fg]}m`

        const fm = minecraftFormats[code]
        if (fm) return `\x1B[${formats[fm]}m`

        return ''
    }

    export function escape(input: string) {
        return input.replace(/\[(\d+(;(?=\d)|m))+/g, '')
    }

    export type ColorKeys = `${'strong_' | ''}${'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white'}`
    export type FormatKeys = 'reset' | 'bold' | 'underline' | 'inverse'
}

export default Color
