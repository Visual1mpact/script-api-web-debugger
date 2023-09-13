/**
 * Gets outer rect close to the specified rect based on the anchor type
 * @param size Rect size, must have `width` and `height` property
 * @param rect Rect, which the outer rect will anchor to
 * @param anchor Anchor type
 * @returns Outer rect
 */
export function getOuterAnchor(size: Size, rect: RectSizeOptional, anchor: Anchors) {
    const { width: twidth, height: theight } = size instanceof HTMLElement ? size.getBoundingClientRect() : size
    const { x, y, width = 0, height = 0 } = rect instanceof HTMLElement ? rect.getBoundingClientRect() : rect
    const [ox, oy] = anchorOffsets[anchor]

    return new DOMRect(x + width * ox - twidth * (1 - ox), y + height * oy - theight * (1 - oy), twidth, theight)
}

/**
 * Anchor offsets
 * 
 * Key is an anchor type, value is the offset multiplier (0, 0.5, or 1)
 */
export const anchorOffsets: Record<Anchors, [x: number, y: number]> = {
    topleft     : [0.0, 0.0],
    topcenter   : [0.5, 0.0],
    topright    : [1.0, 0.0],

    middleleft  : [0.0, 0.5],
    middlecenter: [0.5, 0.5],
    middleright : [1.0, 0.5],

    bottomleft  : [0.0, 1.0],
    bottomcenter: [0.5, 1.0],
    bottomright : [1.0, 1.0],
}

export type Anchors = `${'top' | 'middle' | 'bottom'}${'left' | 'center' | 'right'}`

export interface Size {
    readonly width: number
    readonly height: number
}

export interface Position {
    readonly x: number
    readonly y: number
}

export interface Rect extends Size, Position {}
export interface RectSizeOptional extends Partial<Size>, Position {}
