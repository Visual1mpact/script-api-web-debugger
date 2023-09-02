import express = require('express')

const port = process.env.PORT ? +process.env.PORT : 7070

const server = express()
const httpServer = server.listen(port, () => console.log(`server started on port ${port}`))

export { port, server, httpServer }
