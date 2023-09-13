import { clamp } from "./misc.js"

/**
 * Transforms a color (or perhaps an array of numbers)
 * @param from Original
 * @param to Target
 * @param rate Transform rate from original to target
 * @returns Transformed colors
 */
export function transformColor<T extends [] | number[]>(from: T, to: T, rate: number): T {
    rate = clamp(rate, 0, 1)
    return from.map((a, i) => a + (to[i] - a) * rate) as T
}

/**
 * Creates a CSS background value for a value
 * @param value Value
 * @param c1 Color origin
 * @param c2 Color target
 * @param max Max value, defaults to `100`
 * @param min Min value, defaults to `0`
 * @returns 
 */
export function valueBar(value: number, c1: RGB, c2: RGB, max = 100, min = 0) {
    const rate = (value - min) / (max - min)
    const [r, g, b] = transformColor(c1, c2, rate)
    return `linear-gradient(to right, rgba(${r}, ${g}, ${b}, ${0.5+rate/2}) ${rate * 100}%, transparent 0%)`
}

export function stableAverage(arr: number[], defaultZero = NaN) {
    return arr.length === 0 ? defaultZero
        : arr.length === 1 ? arr[0] ?? 0
        : arr.reduce((a, b, i) => a + b * i / (arr.length - 1) * 2, 0) / arr.length
}

export type RGB = [number, number, number]
