import express = require('express')
import NBedrock from "./bedrock.js";
import { server } from "./server.js";
import NInterpreter from './interpreter.js';

Object.assign(globalThis, {
    bedrock: NBedrock,
    interpreter: NInterpreter,
    int: NInterpreter,
    server,
    express
})
