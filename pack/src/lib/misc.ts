import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net";

export function getStackTrace(deleteCount: number = 1) {
    return new Error().stack?.replace(RegExp(`(.*\\n){0,${deleteCount}}`), '') ?? ''
}

//https://gist.github.com/Yaffle/5458286
export function decode(octets: Array<number> | Uint8Array) {
    let string = "";
    let i = 0;
    while (i < octets.length) {
        let octet = octets[i] ?? 0;
        let bytesNeeded = 0;
        let codePoint = 0;

        if (octet <= 0x7F) {
            bytesNeeded = 0;
            codePoint = octet & 0xFF;
        }
        else if (octet <= 0xDF) {
            bytesNeeded = 1;
            codePoint = octet & 0x1F;
        }
        else if (octet <= 0xEF) {
            bytesNeeded = 2;
            codePoint = octet & 0x0F;
        }
        else if (octet <= 0xF4) {
            bytesNeeded = 3;
            codePoint = octet & 0x07;
        }

        if (octets.length - i - bytesNeeded > 0) {
            for (let k = 0; k < bytesNeeded; k++) {
                octet = octets[i + k + 1] ?? 0;
                codePoint = (codePoint << 6) | (octet & 0x3F);
            }
        }
        else {
            codePoint = 0xFFFD;
            bytesNeeded = octets.length - i;
        }

        string += String.fromCodePoint(codePoint);
        i += bytesNeeded + 1;
    }
    return string
};

export function post(url: string, body: string, headers: Record<string, string> = {}) {
    const req = new HttpRequest(url)
    req.method = HttpRequestMethod.Post
    req.body = body

    for (const k in headers) req.addHeader(k, headers[k] ?? '')
    
    http.request(req)
}
