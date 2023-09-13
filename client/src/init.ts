import { abortTimeout, fetchThrow } from "./lib/misc.js";

/** Initial data */
const init = await fetchThrow('/client/data', { signal: abortTimeout(5000) }).then(v => v.json() as Promise<NodeBedrock.GetData>)
export default init
