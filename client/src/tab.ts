import { getIdThrow, iterateLength } from './lib/misc.js'

export { BDSList } from './tabs/bds.js'
export { ConsoleList } from './tabs/console.js'
import './tabs/eval.js'
export { EventListeners, EventLogList } from './tabs/event.js'
export { PropertiesTable } from './tabs/properties.js'
//import './tabs/runs.js'
import './tabs/stats.js'

const tabs = new Map<string, HTMLElement>()
for (const elm of iterateLength(document.querySelectorAll<HTMLElement>('#tabs > [data-tab]'))) tabs.set(elm.dataset.tab ?? '', elm)

const header = getIdThrow('header')
header.addEventListener('click', ({ target }) => {
    if (!(
        target instanceof HTMLButtonElement
        && target.classList.contains('hnav')
        && target.dataset.tab
    )) return

    for (const elm of tabs.values()) elm.hidden = true
    
    const tab = tabs.get(target.dataset.tab)
    if (tab) tab.hidden = false
})
