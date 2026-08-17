/**
 * iLink Bot API client. Thin async wrapper over fetch implementing the same
 * endpoints and header contract as hermes-agent/gateway/platforms/weixin.py.
 */
import { API_TIMEOUT_MS, CHANNEL_VERSION, CONFIG_TIMEOUT_MS, EP_GET_BOT_QR, EP_GET_CONFIG, EP_GET_QR_STATUS, EP_GET_UPDATES, EP_SEND_MESSAGE, ILINK_APP_CLIENT_VERSION, ILINK_APP_ID, ILINK_BASE_URL, ITEM_TEXT, LONG_POLL_TIMEOUT_MS, MSG_STATE_FINISH, MSG_TYPE_BOT, QR_TIMEOUT_MS, RATE_LIMIT_ERRCODE, SESSION_EXPIRED_ERRCODE, } from './types.js';
import { randomWechatUin } from './crypto.js';
function baseInfo() {
    return { channel_version: CHANNEL_VERSION };
}
function jsonDumps(payload) {
    return JSON.stringify(payload);
}
/** Request headers, mirroring weixin.py `_headers`. */
function headers(token, body) {
    const h = {
        'Content-Type': 'application/json',
        AuthorizationType: 'ilink_bot_token',
        'Content-Length': String(Buffer.byteLength(body, 'utf-8')),
        'X-WECHAT-UIN': randomWechatUin(),
        'iLink-App-Id': ILINK_APP_ID,
        'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
    };
    if (token)
        h.Authorization = `Bearer ${token}`;
    return h;
}
function qrHeaders() {
    return {
        'iLink-App-Id': ILINK_APP_ID,
        'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
    };
}
async function apiPost(baseUrl, endpoint, payload, token, timeoutMs, signal) {
    const body = jsonDumps({ ...payload, base_info: baseInfo() });
    const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`iLink POST ${endpoint} timed out after ${timeoutMs}ms`)), timeoutMs);
    const onOuter = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onOuter, { once: true });
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers(token, body),
            body,
            signal: controller.signal,
        });
        const raw = await response.text();
        if (!response.ok) {
            throw new Error(`iLink POST ${endpoint} HTTP ${response.status}: ${raw.slice(0, 200)}`);
        }
        return JSON.parse(raw);
    }
    finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onOuter);
    }
}
async function apiGet(baseUrl, endpoint, timeoutMs, signal) {
    const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`iLink GET ${endpoint} timed out after ${timeoutMs}ms`)), timeoutMs);
    const onOuter = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onOuter, { once: true });
    try {
        const response = await fetch(url, { headers: qrHeaders(), signal: controller.signal });
        const raw = await response.text();
        if (!response.ok) {
            throw new Error(`iLink GET ${endpoint} HTTP ${response.status}: ${raw.slice(0, 200)}`);
        }
        return JSON.parse(raw);
    }
    finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onOuter);
    }
}
/** Long-poll getupdates. Timeout is treated as an empty poll (no messages). */
export async function getUpdates(baseUrl, token, syncBuf, timeoutMs = LONG_POLL_TIMEOUT_MS, signal) {
    try {
        const resp = await apiPost(baseUrl, EP_GET_UPDATES, { get_updates_buf: syncBuf }, token, timeoutMs, signal);
        return resp;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return { ret: 0, msgs: [], get_updates_buf: syncBuf };
        }
        throw error;
    }
}
/** Send one text message. Returns the raw API response (may carry error codes). */
export async function sendMessage(baseUrl, token, to, text, contextToken, clientId, signal) {
    if (!text || !text.trim())
        throw new Error('sendMessage: text must not be empty');
    const message = {
        from_user_id: '',
        to_user_id: to,
        client_id: clientId,
        message_type: MSG_TYPE_BOT,
        message_state: MSG_STATE_FINISH,
        item_list: [{ type: ITEM_TEXT, text_item: { text } }],
    };
    if (contextToken)
        message.context_token = contextToken;
    const resp = await apiPost(baseUrl, EP_SEND_MESSAGE, { msg: message }, token, API_TIMEOUT_MS, signal);
    return resp;
}
/** Fetch a typing ticket for a peer (getconfig). */
export async function getConfig(baseUrl, token, userId, contextToken, signal) {
    const payload = { ilink_user_id: userId };
    if (contextToken)
        payload.context_token = contextToken;
    const resp = await apiPost(baseUrl, EP_GET_CONFIG, payload, token, CONFIG_TIMEOUT_MS, signal);
    return resp;
}
/** Fetch a fresh QR code for bot login (GET, no token). */
export async function fetchBotQr(baseUrl = ILINK_BASE_URL, botType = '3', signal) {
    const resp = await apiGet(baseUrl, `${EP_GET_BOT_QR}?bot_type=${botType}`, QR_TIMEOUT_MS, signal);
    return resp;
}
/** Poll QR scan status (GET, no token). */
export async function pollQrStatus(qrcode, baseUrl = ILINK_BASE_URL, signal) {
    const resp = await apiGet(baseUrl, `${EP_GET_QR_STATUS}?qrcode=${encodeURIComponent(qrcode)}`, QR_TIMEOUT_MS, signal);
    return resp;
}
/** True when an iLink response signals a stale/expired session. */
export function isStaleSession(resp) {
    const ret = resp.ret;
    const errcode = resp.errcode;
    const retHit = ret === SESSION_EXPIRED_ERRCODE || errcode === SESSION_EXPIRED_ERRCODE;
    if (retHit)
        return true;
    // ret=-2 / errcode=-2 with errmsg "unknown error" is also a stale session.
    if (ret !== RATE_LIMIT_ERRCODE && errcode !== RATE_LIMIT_ERRCODE)
        return false;
    const errmsg = String(resp.errmsg ?? resp.msg ?? '').toLowerCase();
    return errmsg === 'unknown error';
}
export function isRateLimited(resp) {
    return resp.ret === RATE_LIMIT_ERRCODE || resp.errcode === RATE_LIMIT_ERRCODE;
}
//# sourceMappingURL=client.js.map