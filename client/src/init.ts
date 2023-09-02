import { abortTimeout, fetchThrow } from "./lib/misc.js";

const init = await fetchThrow('/client/data', { signal: abortTimeout(5000) }).then(v => v.json() as Promise<NodeBedrock.GetData>)
export default init
