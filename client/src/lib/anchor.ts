/**
 * Gets rect offset based on bound element / rect
 * @param bound Bound element / Rect
 * @param anchor Anchor
 * @returns Rect
 */
export function getAnchor(bound: HTMLElement | DOMRectReadOnly, anchor: Anchors) {
    const { x, y, width, height } = bound instanceof HTMLElement ? bound.getBoundingClientRect() : bound
    const [ox, oy] = anchorOffsets[anchor]

    return new DOMRect(x + width * ox, y + height * oy, width, height)
}

/**
 * Gets outer rect based on bound element / rect
 * @param target Target element / rect
 * @param bound Bound element / Rect
 * @param anchor Anchor
 * @returns Rect
 */
export function getOuterAnchor(target: HTMLElement | DOMRectReadOnly, bound: HTMLElement | DOMRectReadOnly, anchor: Anchors) {
    const { x, y, width = 0, height = 0 } = bound instanceof HTMLElement ? bound.getBoundingClientRect() : bound
    const { width: twidth, height: theight } = target instanceof HTMLElement ? target.getBoundingClientRect() : target
    const [ox, oy] = anchorOffsets[anchor]

    return new DOMRect(x + width * ox - twidth * (1 - ox), y + height * oy - theight * (1 - oy), twidth, theight)
}

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

export type AnchorVertical = 'top' | 'middle' | 'bottom'
export type AnchorHorizontal = 'left' | 'center' | 'right'
export type Anchors = `${AnchorVertical}${AnchorHorizontal}`
