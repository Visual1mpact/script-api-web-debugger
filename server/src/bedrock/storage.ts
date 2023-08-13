import fs = require('fs')
import fsp = require('fs/promises')
import path = require('path')
import stream = require('stream')
import NodeBedrock from "./bedrock.js";
import { createTempWriteStream } from '../lib/misc.js';
import AbortController from '../lib/abortctrl.js';
import PromiseController from '../lib/promisectrl.js';

export default class BedrockStorage {
    constructor(bedrock: NodeBedrock) {
        this.bedrock = bedrock

        this.#bedrockLogStr = createTempWriteStream(
            this.#bedrockLogPrm = bedrock.ready.then(() => {
                const fstr = fs.createWriteStream( path.join(bedrock.sessionDir, 'bedrock.log') )
                this.#bedrockLogStr = fstr
                return fstr
            })
        )

        bedrock.events.addListener('line', data => {
            this.#bedrockLogStr.write(JSON.stringify(data))
            this.#bedrockLogStr.write('\n')
        })

        bedrock.events.addListener('data', ({name, data}) => {
            if (name === 'ready') {
                for (const str of this.#ssesList.values()) str.str.end()
                this.#ssesList.clear()

                const abort = this.#ssesPrm = new AbortController()
                const ssesid = bedrock.scriptSessionID

                fsp.mkdir(path.join( bedrock.sessionDir, 'scriptsession', ssesid), { recursive: true })
                    .then(() => abort.abort(ssesid))
            }

            let sses = this.#ssesList.get(name)?.str
            if (!sses) {
                if (!this.#ssesPrm.aborted) {
                    const pctrl = new PromiseController<fs.WriteStream>()
                    const tmpstr = createTempWriteStream(
                        this.#ssesPrm.promise.then(folder => {
                            const fstr = fs.createWriteStream( path.join( bedrock.sessionDir, 'scriptsession', folder, name ) )

                            pctrl.resolve(fstr)
                            obj.str = fstr

                            return fstr
                        })
                    )

                    const obj: {
                        str: stream.Writable | fs.WriteStream
                        prm: Promise<fs.WriteStream>
                    } = {
                        str: tmpstr,
                        prm: pctrl.promise
                    }
                    this.#ssesList.set(name, obj)
                    sses = tmpstr
                } else {
                    const fstr = fs.createWriteStream( path.join( bedrock.sessionDir, 'scriptsession', this.#ssesPrm.abortValue || '', name ) )
                    this.#ssesList.set(name, {
                        str: fstr,
                        prm: Promise.resolve(fstr)
                    })
                    sses = fstr
                }
            }

            sses.write(JSON.stringify(data))
            sses.write('\n')
        })

        bedrock.events.once('exit', () => {
            this.#bedrockLogStr.end()
            for (const v of this.#ssesList.values()) v.str.end()
        })
    }

    readonly bedrock: NodeBedrock

    #bedrockLogPrm: Promise<fs.WriteStream>
    #bedrockLogStr: stream.Writable | fs.WriteStream

    #ssesPrm = new AbortController<string>()
    #ssesList = new Map<string, {
        str: stream.Writable | fs.WriteStream
        prm: Promise<fs.WriteStream>
    }>()

    readBedrockLog() {
        return this.#bedrockLogPrm.then(v => fs.createReadStream(v.path))
    }

    readEventsLog(name: string) {
        const data = this.#ssesList.get(name)
        if (!data) return

        return data.prm.then(v => fs.createReadStream(v.path))
    }
}
