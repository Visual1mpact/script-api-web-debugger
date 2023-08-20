import { fetchThrow } from "./lib/misc.js";

export async function sendEval(script: string) {
    const res = await fetchThrow('/sendeval', {
        method: 'POST',
        body: script
    })

    return await res.json() as Bedrock.Events['eval']
}

export async function sendEvalThrowable(script: string) {
    const res = await sendEval(script)
    if (res.error) throw new Error('Eval failed', { cause: res })
    return res
}

export function sendData<K extends keyof Bedrock.Messages>(name: K, data: Bedrock.Messages[K]) {
    return fetchThrow('/senddata/' + name, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}
