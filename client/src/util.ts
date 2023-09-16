import { fetchThrow } from "./lib/misc.js";

/**
 * Sends an eval request to the server to be passed to the script API
 * @param script Script
 * @param keepOutput Tells the script API to keep the eval output (`$_`)
 * @returns Eval result
 */
export async function sendEval(script: string, keepOutput = true, async = false) {
    const res = await fetchThrow('/client/send_eval', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            script,
            keepOutput,
            async
        })
    })

    return await res.json() as Bedrock.EvalResult
}

/**
 * {@link sendEval} but throws if error
 * @param script Script
 * @param keepOutput Tells the script API to keep the eval output (`$_`)
 * @returns Eval result
 */
export async function sendEvalThrowable(script: string, keepOutput = false, async = false) {
    const res = await sendEval(script, keepOutput, async)
    if (res.error) throw new EvalError('Eval failed', { cause: res })
    return res
}

/**
 * Sends JSON data to the server to be passed to the script API
 * @param name Event name
 * @param data Event data
 * @returns Fetch response
 */
export function sendData<K extends keyof NodeBedrock.Messages>(name: K, data: NodeBedrock.Messages[K]) {
    return fetchThrow('/client/send_data/' + name, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
}
