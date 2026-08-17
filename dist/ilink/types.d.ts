/**
 * iLink Bot API protocol constants and types.
 *
 * Faithful port of the wire contract in
 * hermes-agent/gateway/platforms/weixin.py (Tencent iLink Bot API for
 * personal WeChat accounts).
 */
export declare const ILINK_BASE_URL = "https://ilinkai.weixin.qq.com";
export declare const ILINK_APP_ID = "bot";
export declare const CHANNEL_VERSION = "2.2.0";
export declare const ILINK_APP_CLIENT_VERSION: number;
export declare const EP_GET_UPDATES = "ilink/bot/getupdates";
export declare const EP_SEND_MESSAGE = "ilink/bot/sendmessage";
export declare const EP_SEND_TYPING = "ilink/bot/sendtyping";
export declare const EP_GET_CONFIG = "ilink/bot/getconfig";
export declare const EP_GET_BOT_QR = "ilink/bot/get_bot_qrcode";
export declare const EP_GET_QR_STATUS = "ilink/bot/get_qrcode_status";
export declare const LONG_POLL_TIMEOUT_MS = 35000;
export declare const API_TIMEOUT_MS = 15000;
export declare const CONFIG_TIMEOUT_MS = 10000;
export declare const QR_TIMEOUT_MS = 35000;
/** -14: session expired (bot token / context_token invalid). */
export declare const SESSION_EXPIRED_ERRCODE = -14;
/** -2: iLink frequency limit (unless errmsg is "unknown error" = stale session). */
export declare const RATE_LIMIT_ERRCODE = -2;
/** item_list item types */
export declare const ITEM_TEXT = 1;
export declare const ITEM_IMAGE = 2;
export declare const ITEM_VOICE = 3;
export declare const ITEM_FILE = 4;
export declare const ITEM_VIDEO = 5;
/** message_type */
export declare const MSG_TYPE_USER = 1;
export declare const MSG_TYPE_BOT = 2;
/** message_state */
export declare const MSG_STATE_FINISH = 2;
export interface BaseInfo {
    channel_version: string;
}
export interface ILinkResponse {
    ret?: number;
    errcode?: number;
    errmsg?: string;
    msg?: string;
    [key: string]: unknown;
}
export interface TextItem {
    type: typeof ITEM_TEXT;
    text_item: {
        text: string;
    };
}
export interface MediaItem {
    type: number;
    [key: string]: unknown;
}
export interface ILinkMessage {
    from_user_id?: string;
    to_user_id?: string;
    room_id?: string;
    chat_room_id?: string;
    message_id?: string;
    client_id?: string;
    context_token?: string;
    message_type?: number;
    message_state?: number;
    item_list?: Array<TextItem | MediaItem>;
    msg_type?: number;
    [key: string]: unknown;
}
export interface GetUpdatesResponse extends ILinkResponse {
    msgs?: ILinkMessage[];
    get_updates_buf?: string;
    longpolling_timeout_ms?: number;
}
export interface SendMessageResponse extends ILinkResponse {
    message_id?: string;
}
export interface GetConfigResponse extends ILinkResponse {
    typing_ticket?: string;
}
export interface GetBotQrResponse extends ILinkResponse {
    qrcode?: string;
    qrcode_img_content?: string;
}
export type QrStatus = 'wait' | 'scaned' | 'scaned_but_redirect' | 'expired' | 'confirmed';
export interface GetQrStatusResponse extends ILinkResponse {
    status?: string;
    redirect_host?: string;
    ilink_bot_id?: string;
    bot_token?: string;
    baseurl?: string;
    ilink_user_id?: string;
}
/** Persisted account credential payload (mirrors save_weixin_account). */
export interface WeixinAccount {
    account_id: string;
    token: string;
    base_url: string;
    user_id?: string;
    saved_at?: string;
}
