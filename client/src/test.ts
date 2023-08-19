import * as anchor from './lib/anchor.js'
import * as color from './lib/color.js'
import * as element from './lib/element.js'
import * as json_elm_uninspector from './lib/json_elm_uninspector.js'
import * as json_uninspector from './lib/json_uninspector.js'
import * as misc from './lib/misc.js'
import * as misc2 from './lib/misc2.js'

import * as tabs from './tab.js'
import * as util from './util.js'

import init from './init.js'
import { sse, sseEvents } from './sse.js'

Object.assign(globalThis, {
    init,
    sse,
    sseEvents
},
    anchor,
    color,
    element,
    json_elm_uninspector,
    json_uninspector,
    misc,
    misc2,
    tabs,
    util
)
