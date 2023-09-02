import express = require('express')
import NBedrock from "./bedrock.js";
import { server } from "./server.js";

Object.assign(globalThis, {
    bedrock: NBedrock,
    server,
    express
})
