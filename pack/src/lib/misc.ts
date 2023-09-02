import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net";

export function getStackTrace(deleteCount: number = 1) {
    return new Error().stack?.replace(RegExp(`(.*\\n){0,${deleteCount}}`), '') ?? ''
}

export function post(url: string, body: string, headers: Record<string, string> = {}) {
    const req = new HttpRequest(url)
    req.method = HttpRequestMethod.Post
    req.body = body

    for (const k in headers) req.addHeader(k, headers[k] ?? '')
    
    http.request(req)
}

export function postJSON(url: string, body: any, headers: Record<string, string> = {}) {
    const req = new HttpRequest(url)
    req.method = HttpRequestMethod.Post
    req.body = JSON.stringify(body)
    req.addHeader('Content-Type', 'application/json')

    for (const k in headers) req.addHeader(k, headers[k] ?? '')
    
    http.request(req)
}
