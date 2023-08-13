import * as anchor from './lib/anchor.js'
import * as color from './lib/color.js'
import * as element from './lib/element.js'
import * as elminspector from './lib/elminspector.js'
import * as jsoninspector from './lib/jsoninspector.js'
import * as misc from './lib/misc.js'

Object.assign(window, 
    anchor,
    color,
    element,
    elminspector,
    jsoninspector,
    misc
)
