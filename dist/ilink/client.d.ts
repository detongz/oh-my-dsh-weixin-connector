/**
 * iLink Bot API client. Thin async wrapper over fetch implementing the same
 * endpoints and header contract as hermes-agent/gateway/platforms/weixin.py.
 */
import { type GetBotQrResponse, type GetConfigResponse, type GetQrStatusResponse, type GetUpdatesResponse, type ILinkResponse, type SendMessageResponse } from './types.js';
/** Long-poll getupdates. Timeout is treated as an empty poll (no messages). */
export declare function getUpdates(baseUrl: string, token: string, syncBuf: string, timeoutMs?: number, signal?: AbortSignal): Promise<GetUpdatesResponse>;
/** Send one text message. Returns the raw API response (may carry error codes). */
export declare function sendMessage(baseUrl: string, token: string, to: string, text: string, contextToken: string | undefined, clientId: string, signal?: AbortSignal): Promise<SendMessageResponse>;
/** Fetch a typing ticket for a peer (getconfig). */
export declare function getConfig(baseUrl: string, token: string, userId: string, contextToken: string | undefined, signal?: AbortSignal): Promise<GetConfigResponse>;
/** Fetch a fresh QR code for bot login (GET, no token). */
export declare function fetchBotQr(baseUrl?: string, botType?: string, signal?: AbortSignal): Promise<GetBotQrResponse>;
/** Poll QR scan status (GET, no token). */
export declare function pollQrStatus(qrcode: string, baseUrl?: string, signal?: AbortSignal): Promise<GetQrStatusResponse>;
/** True when an iLink response signals a stale/expired session. */
export declare function isStaleSession(resp: ILinkResponse): boolean;
export declare function isRateLimited(resp: ILinkResponse): boolean;
