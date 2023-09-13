import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net";

/**
 * Gets current call stack trace
 * @param deleteCount Stack delete count from the topmost stack (this function).
 * Defaults to `1` which omits this function from the stack
 * @returns Stack trace
 */
export function getStackTrace(deleteCount: number = 1) {
    return new Error().stack?.replace(RegExp(`(.*\\n){0,${deleteCount}}`), '') ?? ''
}

/**
 * Sends a POST request
 * @param url URL
 * @param body Request body
 * @param headers Request headers
 * @returns Request response
 */
export async function post(url: string, body: string, headers: Record<string, string> = {}) {
    const req = new HttpRequest(url)
    req.method = HttpRequestMethod.Post
    req.body = body

    for (const k in headers) req.addHeader(k, headers[k] ?? '')
    
    return http.request(req)
}

/**
 * Sends a POST request as a JSON
 * @param url URL
 * @param body Request body
 * @param headers Request headers
 * @returns Request response
 */
export async function postJSON(url: string, body: any, headers: Record<string, string> = {}) {
    const req = new HttpRequest(url)
    req.method = HttpRequestMethod.Post
    req.body = JSON.stringify(body)
    req.addHeader('Content-Type', 'application/json')

    for (const k in headers) req.addHeader(k, headers[k] ?? '')
    
    return http.request(req)
}
