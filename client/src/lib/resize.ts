export function handleResize(resizer: HTMLElement, target: HTMLElement, horizontal = 1, vertical = 1) {
    resizer.addEventListener('pointerdown', ({ pageX: ox, pageY: oy }) => {
        const abort = new AbortController()
        const { width, height } = getComputedStyle(target)

        document.addEventListener('pointermove', ({pageX: x, pageY: y}) => {
            const dx = (x - ox) * horizontal, dy = (y - oy) * vertical

            if (dx) target.style.width = `calc(${width} + ${dx}px)`
            if (dy) target.style.height = `calc(${height} + ${dy}px)`
        }, {
            signal: abort.signal
        })

        document.addEventListener('pointercancel', () => abort.abort('pointercancel'), { once: true, signal: abort.signal })
        document.addEventListener('pointerup', () => abort.abort('pointerup'), { once: true, signal: abort.signal })
    })
}
