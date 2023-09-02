import './proc/eval.js'
import './proc/tick.js'
import './proc/buffer.js'
import './proc/test.js'

import './wrap/propreg.js'

import './wrap/run.js'
import './wrap/event.js'
import './wrap/console.js'

import './drop.js'

import HookSignal from './lib/hooksig.js'
HookSignal.sendConsole('ready', undefined)
