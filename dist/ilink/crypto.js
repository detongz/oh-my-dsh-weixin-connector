/**
 * AES-128-ECB helpers for the WeChat CDN media protocol, plus the header
 * fingerprint helpers the iLink API expects.
 *
 * Port of hermes-agent/gateway/platforms/weixin.py `_aes128_ecb_*`,
 * `_random_wechat_uin`, `_aes_padded_size` using Node's built-in crypto.
 * (Media delivery is not part of the MVP text loop, but the primitives are
 * kept so the media path can be added without touching the client.)
 */
import { createCipheriv, createDecipheriv, randomBytes, randomInt, } from 'node:crypto';
const BLOCK_SIZE = 16;
function pkcs7Pad(data, blockSize = BLOCK_SIZE) {
    const padLen = blockSize - (data.length % blockSize);
    return Buffer.concat([data, Buffer.alloc(padLen, padLen)]);
}
/** AES-128-ECB encrypt with PKCS7 padding. */
export function aes128EcbEncrypt(plaintext, key) {
    const cipher = createCipheriv('aes-128-ecb', key, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(pkcs7Pad(plaintext)), cipher.final()]);
}
/** AES-128-ECB decrypt with PKCS7 unpad (tolerant of missing pad). */
export function aes128EcbDecrypt(ciphertext, key) {
    const decipher = createDecipheriv('aes-128-ecb', key, null);
    decipher.setAutoPadding(false);
    const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    if (padded.length === 0)
        return padded;
    const padLen = padded[padded.length - 1];
    if (padLen >= 1 && padLen <= 16 && padded.subarray(-padLen).every((b) => b === padLen)) {
        return padded.subarray(0, padded.length - padLen);
    }
    return padded;
}
/** Padded size for the CDN upload size field. */
export function aesPaddedSize(size) {
    return Math.ceil((size + 1) / 16) * 16;
}
/**
 * Random X-WECHAT-UIN header value: base64 of the decimal string of a random
 * uint32, exactly as the reference implementation does.
 */
export function randomWechatUin() {
    const value = randomInt(0, 0xffffffff + 1);
    return Buffer.from(String(value), 'utf-8').toString('base64');
}
/** Parse an iLink aes_key (base64 of 16 raw bytes, or base64 of a 32-char hex string). */
export function parseAesKey(aesKeyB64) {
    const decoded = Buffer.from(aesKeyB64, 'base64');
    if (decoded.length === 16)
        return decoded;
    if (decoded.length === 32) {
        const text = decoded.toString('ascii');
        if (/^[0-9a-fA-F]{32}$/.test(text))
            return Buffer.from(text, 'hex');
    }
    throw new Error(`unexpected aes_key format (${decoded.length} decoded bytes)`);
}
/** Random 16-byte AES key for outbound media encryption. */
export function randomAesKey() {
    return randomBytes(16);
}
//# sourceMappingURL=crypto.js.map