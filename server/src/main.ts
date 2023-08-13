import NodeBedrock from "./bedrock/bedrock.js"
import BedrockStorage from "./bedrock/storage.js"

let dir = process.argv[2]
if (!dir) throw new Error('hook requires a directory argument')

export const bedrock = new NodeBedrock(dir)
export const bedrockStorage = new BedrockStorage(bedrock)

import './misc/server.js'
import './misc/log.js'
import './misc/input.js'

process.on('unhandledRejection', (err, prm) => {
    console.log('Unhandles rejection:', err)
})
