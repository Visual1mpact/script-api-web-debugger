import { average, clamp } from "./misc.js"

export type RGB = [red: number, green: number, blue: number]
export type CMYK = [cyan: number, magenta: number, yellow: number, key: number]

// https://stackoverflow.com/a/62369367 - modified

export function toHex(rgb: RGB) {
    return '#' + Array.from(new Uint8ClampedArray(rgb), v => v.toString(16).padStart(2, '0')).join('')
}

export function fromHex(hex: string): RGB {
    const res = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!res) return [NaN, NaN, NaN]

    const [, r = '', g = '', b = ''] = res
    return [r, g, b].map(v => parseInt(v, 16)) as RGB
}

export function toCMYK([r, g, b]: RGB): CMYK {
    let c = 1 - (r / 255)
    let m = 1 - (g / 255)
    let y = 1 - (b / 255)

    const k = Math.min(c, m, y), kf = 1 - k

    c = kf === 0 ? 0 : (c - k) / kf
    m = kf === 0 ? 0 : (m - k) / kf
    y = kf === 0 ? 0 : (y - k) / kf

    return [c, m, y, k]
}

export function toRGB([c, m, y, k]: CMYK): RGB {
    const kf = 1 - k

    let r = c * kf + k
    let g = m * kf + k
    let b = y * kf + k

    r = (1 - r) * 255 + .5
    g = (1 - g) * 255 + .5
    b = (1 - b) * 255 + .5

    return [r, g, b].map(Math.floor) as RGB
}

export function mixCMYK(...cmyks: CMYK[]): CMYK {
    const cl: number[] = [], ml: number[] = [], yl: number[] = [], kl: number[] = []
    for (const [c, m, y, k] of cmyks) {
        cl.push(c)
        ml.push(m)
        yl.push(y)
        kl.push(k)
    }
    return [cl, ml, yl, kl].map(average) as CMYK
}

export function mixRGB(...rgb: RGB[]): RGB {
    const rl: number[] = [], gl: number[] = [], bl: number[] = []
    for (const [r, g, b] of rgb) {
        rl.push(r)
        gl.push(g)
        bl.push(b)
    }
    return [rl, gl, bl].map(average) as RGB
}

export function transformColor<T extends [] | number[]>(from: T, to: T, rate: number): T {
    rate = clamp(rate, 0, 1)
    return from.map((a, i) => a + (to[i] - a) * rate) as T
}
