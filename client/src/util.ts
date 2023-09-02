import { fetchThrow } from "./lib/misc.js";

export async function sendEval(script: string, keepOutput = true) {
    const res = await fetchThrow('/client/send_eval', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            script,
            keepOutput
        })
    })

    return await res.json() as Bedrock.EvalResult
}

export async function sendEvalThrowable(script: string, keepOutput = false) {
    const res = await sendEval(script, keepOutput)
    if (res.error) throw new Error('Eval failed', { cause: res })
    return res
}

export function sendData<K extends keyof NodeBedrock.Messages>(name: K, data: NodeBedrock.Messages[K]) {
    return fetchThrow('/client/send_data/' + name, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
}
