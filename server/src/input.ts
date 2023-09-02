import cp = require('child_process')
import { keypressEvent } from "./lib/input.js"
import { port } from './server.js'

keypressEvent.on('keypress', ({ name, ctrl }) => {
    if (!ctrl) return
    switch (name) {
        case 'r':
            process.exit(99)
    
        case 'o':
            cp.exec(`start http://localhost:${port}`)
    }
})

console.log('Input options:')
console.log(' : Ctrl + R - Restart')
console.log(' : Ctrl + O - Open browser')
console.log(' ')
