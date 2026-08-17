/**
 * iLink Bot API protocol constants and types.
 *
 * Faithful port of the wire contract in
 * hermes-agent/gateway/platforms/weixin.py (Tencent iLink Bot API for
 * personal WeChat accounts).
 */
export const ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com';
export const ILINK_APP_ID = 'bot';
export const CHANNEL_VERSION = '2.2.0';
export const ILINK_APP_CLIENT_VERSION = (2 << 16) | (2 << 8) | 0;
export const EP_GET_UPDATES = 'ilink/bot/getupdates';
export const EP_SEND_MESSAGE = 'ilink/bot/sendmessage';
export const EP_SEND_TYPING = 'ilink/bot/sendtyping';
export const EP_GET_CONFIG = 'ilink/bot/getconfig';
export const EP_GET_BOT_QR = 'ilink/bot/get_bot_qrcode';
export const EP_GET_QR_STATUS = 'ilink/bot/get_qrcode_status';
export const LONG_POLL_TIMEOUT_MS = 35_000;
export const API_TIMEOUT_MS = 15_000;
export const CONFIG_TIMEOUT_MS = 10_000;
export const QR_TIMEOUT_MS = 35_000;
/** -14: session expired (bot token / context_token invalid). */
export const SESSION_EXPIRED_ERRCODE = -14;
/** -2: iLink frequency limit (unless errmsg is "unknown error" = stale session). */
export const RATE_LIMIT_ERRCODE = -2;
/** item_list item types */
export const ITEM_TEXT = 1;
export const ITEM_IMAGE = 2;
export const ITEM_VOICE = 3;
export const ITEM_FILE = 4;
export const ITEM_VIDEO = 5;
/** message_type */
export const MSG_TYPE_USER = 1;
export const MSG_TYPE_BOT = 2;
/** message_state */
export const MSG_STATE_FINISH = 2;
//# sourceMappingURL=types.js.map