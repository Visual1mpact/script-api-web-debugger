import { fetchThrow } from "./lib/misc.js";

export async function sendEval(script: string) {
    const res = await fetchThrow('/client/send_eval', {
        method: 'POST',
        body: script
    })

    return await res.json() as Bedrock.EvalResult
}

export async function sendEvalThrowable(script: string) {
    const res = await sendEval(script)
    if (res.error) throw new Error('Eval failed', { cause: res })
    return res
}

export function sendData<K extends keyof NodeBedrock.Messages>(name: K, data: NodeBedrock.Messages[K]) {
    return fetchThrow('/client/send_data/' + name, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}
