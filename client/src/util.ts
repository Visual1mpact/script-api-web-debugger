import { fetchThrow } from "./lib/misc";

export async function sendEval(script: string) {
    const res = await fetchThrow('/session/eval', {
        method: 'POST',
        body: script
    })

    return await res.json() as Bedrock.Events['eval']
}