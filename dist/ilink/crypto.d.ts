/**
 * AES-128-ECB helpers for the WeChat CDN media protocol, plus the header
 * fingerprint helpers the iLink API expects.
 *
 * Port of hermes-agent/gateway/platforms/weixin.py `_aes128_ecb_*`,
 * `_random_wechat_uin`, `_aes_padded_size` using Node's built-in crypto.
 * (Media delivery is not part of the MVP text loop, but the primitives are
 * kept so the media path can be added without touching the client.)
 */
/** AES-128-ECB encrypt with PKCS7 padding. */
export declare function aes128EcbEncrypt(plaintext: Buffer, key: Buffer): Buffer;
/** AES-128-ECB decrypt with PKCS7 unpad (tolerant of missing pad). */
export declare function aes128EcbDecrypt(ciphertext: Buffer, key: Buffer): Buffer;
/** Padded size for the CDN upload size field. */
export declare function aesPaddedSize(size: number): number;
/**
 * Random X-WECHAT-UIN header value: base64 of the decimal string of a random
 * uint32, exactly as the reference implementation does.
 */
export declare function randomWechatUin(): string;
/** Parse an iLink aes_key (base64 of 16 raw bytes, or base64 of a 32-char hex string). */
export declare function parseAesKey(aesKeyB64: string): Buffer;
/** Random 16-byte AES key for outbound media encryption. */
export declare function randomAesKey(): Buffer;
