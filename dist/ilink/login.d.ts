/**
 * QR login flow for iLink bot accounts.
 *
 * Port of hermes-agent/gateway/platforms/weixin.py `qr_login()`. Split into
 * `fetchQr()` (fast, returns the scannable payload) and `pollLogin()` (long
 * background polling until confirmed), so a tool can show the QR immediately
 * and let the polling run in the background.
 */
import type { WeixinAccount } from './types.js';
export interface QrPayload {
    /** Raw hex token used for status polling. */
    qrcode: string;
    /** Full scannable liteapp URL (preferred for scanning), may be empty. */
    qrcodeUrl: string;
}
export interface QrLoginCallbacks {
    /** Called when the QR expired and is being refreshed (1-based count). */
    onRefresh?: (count: number) => void;
    /** Called on status transitions worth reporting (scaned, …). */
    onStatus?: (status: string) => void;
}
export interface QrLoginResult {
    ok: boolean;
    account?: WeixinAccount;
    error?: string;
}
/** Fetch a fresh QR code for bot login (GET, no token). */
export declare function fetchQr(baseUrl?: string, botType?: string, signal?: AbortSignal): Promise<QrPayload>;
/**
 * Poll a QR's scan status until confirmed.
 *
 * @param initialQr - payload from {@link fetchQr}.
 * @param opts.baseUrl - iLink base URL (defaults to the official one).
 * @param opts.timeoutMs - overall deadline for the whole login.
 * @param opts.signal - abort to cancel.
 */
export declare function pollLogin(initialQr: QrPayload, opts?: {
    baseUrl?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
} & QrLoginCallbacks): Promise<QrLoginResult>;
