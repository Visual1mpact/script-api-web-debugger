import { fetchThrow } from "./lib/misc.js";

const init = await fetchThrow('/data').then(v => v.json() as Promise<NodeBedrockInterpreter.GetData>)
export default init
