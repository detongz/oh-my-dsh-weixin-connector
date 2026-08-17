/**
 * QR login flow for iLink bot accounts.
 *
 * Port of hermes-agent/gateway/platforms/weixin.py `qr_login()`. Split into
 * `fetchQr()` (fast, returns the scannable payload) and `pollLogin()` (long
 * background polling until confirmed), so a tool can show the QR immediately
 * and let the polling run in the background.
 */
import { fetchBotQr, pollQrStatus } from './client.js';
import { ILINK_BASE_URL } from './types.js';
const QR_MAX_REFRESHES = 3;
/** Fetch a fresh QR code for bot login (GET, no token). */
export async function fetchQr(baseUrl = ILINK_BASE_URL, botType = '3', signal) {
    const resp = await fetchBotQr(baseUrl, botType, signal);
    const qrcode = String(resp.qrcode ?? '').trim();
    const qrcodeUrl = String(resp.qrcode_img_content ?? '').trim();
    if (!qrcode)
        throw new Error('QR response missing qrcode');
    return { qrcode, qrcodeUrl };
}
/**
 * Poll a QR's scan status until confirmed.
 *
 * @param initialQr - payload from {@link fetchQr}.
 * @param opts.baseUrl - iLink base URL (defaults to the official one).
 * @param opts.timeoutMs - overall deadline for the whole login.
 * @param opts.signal - abort to cancel.
 */
export async function pollLogin(initialQr, opts = {}) {
    const { baseUrl = ILINK_BASE_URL, timeoutMs = 480_000, signal, onRefresh, onStatus, } = opts;
    if (signal?.aborted)
        return { ok: false, error: 'aborted' };
    let currentBaseUrl = baseUrl;
    let qr = initialQr;
    const deadline = Date.now() + timeoutMs;
    let refreshCount = 0;
    while (Date.now() < deadline) {
        if (signal?.aborted)
            return { ok: false, error: 'aborted' };
        let statusResp;
        try {
            statusResp = await pollQrStatus(qr.qrcode, currentBaseUrl, signal);
        }
        catch {
            // Poll hiccups are non-fatal; keep waiting.
            await sleep(1000);
            continue;
        }
        const status = String(statusResp.status ?? 'wait');
        switch (status) {
            case 'scaned':
                onStatus?.('scaned');
                break;
            case 'scaned_but_redirect': {
                const redirectHost = String(statusResp.redirect_host ?? '');
                if (redirectHost)
                    currentBaseUrl = `https://${redirectHost}`;
                break;
            }
            case 'expired': {
                refreshCount += 1;
                if (refreshCount > QR_MAX_REFRESHES) {
                    return { ok: false, error: 'QR expired too many times; please retry login' };
                }
                onRefresh?.(refreshCount);
                try {
                    qr = await fetchQr(currentBaseUrl, undefined, signal);
                }
                catch (error) {
                    return { ok: false, error: `QR refresh failed: ${String(error)}` };
                }
                break;
            }
            case 'confirmed': {
                const accountId = String(statusResp.ilink_bot_id ?? '').trim();
                const token = String(statusResp.bot_token ?? '').trim();
                const confirmedBaseUrl = String(statusResp.baseurl ?? currentBaseUrl).trim();
                const userId = String(statusResp.ilink_user_id ?? '').trim();
                if (!accountId || !token) {
                    return { ok: false, error: 'QR confirmed but credential payload was incomplete' };
                }
                return {
                    ok: true,
                    account: {
                        account_id: accountId,
                        token,
                        base_url: confirmedBaseUrl,
                        user_id: userId,
                        saved_at: new Date().toISOString(),
                    },
                };
            }
            default:
                break;
        }
        await sleep(1000);
    }
    return { ok: false, error: 'QR login timed out' };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=login.js.map