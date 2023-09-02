import { abortTimeout, fetchThrow } from "./lib/misc.js";

const init = await fetchThrow('/data', { signal: abortTimeout(5000) }).then(v => v.json() as Promise<NodeBedrockInterpreter.GetData>)
export default init
