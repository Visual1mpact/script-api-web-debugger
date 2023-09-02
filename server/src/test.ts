import express = require('express')
import NodeBedrockInst from "./bedrock.js";
import { server } from "./server.js";

Object.assign(globalThis, {
    bedrock: NodeBedrockInst,
    server,
    express
})
