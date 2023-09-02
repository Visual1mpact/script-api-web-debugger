import './proc/eval.js'
import './proc/tick.js'
import './proc/test.js'

import './wrap/propreg.js'

import './wrap/run.js'
import './wrap/event.js'
import './wrap/console.js'

import './drop.js'

import Debugger from './lib/debugger.js'
Debugger.sendConsole('ready', undefined)
