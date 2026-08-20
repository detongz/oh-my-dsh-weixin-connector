/**
 * dsh-weixin — DSH ↔ WeChat connector plugin.
 *
 * A Cordis plugin that connects the DeepSeek Harness to personal WeChat
 * accounts through Tencent's iLink Bot API, modeled on the hermes-agent
 * `gateway/platforms/weixin.py` adapter:
 *
 *   - QR login (`weixin_login` tool / automatic on load when configured)
 *   - long-poll getupdates for inbound messages
 *   - Fixed single session (`weixin-main`) for all inbound messages
 *   - `/new` command creates fresh session (weixin-main-2, ...)
 *   - Sender identity prepended to message text
 *   - `weixin_login` tool / automatic on load when configured
 *   - long-poll getupdates for inbound messages
 *   - per-peer `context_token` tracking (disk persisted)
 *   - `weixin_send` tool for proactive pushes
 *     `agent.followup()`; assistant completions are sent back to WeChat
 *   - per-peer `context_token` tracking (disk persisted)
 *   - `weixin_send` tool for proactive pushes
 *
 * Export shape: namespace plugin — named `name` / `inject` / `apply`, no
 * default export.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { WeixinBridge } from './bridge.js';
import { WeixinPoller } from './poller.js';
import { registerWeixinTools } from './tools.js';
import { listWeixinAccounts, loadWeixinAccount, saveWeixinAccount, } from './account.js';
import { fetchQr, pollLogin } from './ilink/login.js';
export { WeixinBridge } from './bridge.js';
export { WeixinPoller } from './poller.js';
export { accountsDir, saveWeixinAccount, loadWeixinAccount, listWeixinAccounts } from './account.js';
export const name = 'dsh-weixin';
export const inject = ['tools', 'agents', 'attachments', 'connection'];
const DEFAULT_PROVIDER = 'deepseek-official';
const DEFAULT_MODEL = 'deepseek-v4-flash';
function resolveDshHome(config) {
    return config.dshHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
export function apply(ctx, config = {}) {
    const dshHome = resolveDshHome(config);
    const log = (level, message, ...rest) => {
        const fn = level === 'error' ? ctx.logger.error.bind(ctx.logger) :
            level === 'warn' ? ctx.logger.warn.bind(ctx.logger) :
                level === 'debug' ? ctx.logger.debug.bind(ctx.logger) :
                    ctx.logger.info.bind(ctx.logger);
        fn(`[dsh-weixin] ${message}`, ...rest);
    };
    // Resolve the account: explicit config wins, else the first saved account.
    let account = null;
    if (config.accountId) {
        account = loadWeixinAccount(dshHome, config.accountId);
        if (account && config.token)
            account = { ...account, token: config.token };
    }
    else {
        const saved = listWeixinAccounts(dshHome);
        if (saved.length > 0) {
            account = saved[0];
            if (config.token)
                account = { ...account, token: config.token };
        }
    }
    const bridge = new WeixinBridge(ctx, account, {
        dshHome,
        agentOptions: {
            provider: config.provider ?? DEFAULT_PROVIDER,
            model: config.model ?? DEFAULT_MODEL,
        },
        cwd: config.cwd,
        sendChunkDelayMs: config.sendChunkDelayMs,
        sendChunkRetries: config.sendChunkRetries,
        sendChunkRetryDelayMs: config.sendChunkRetryDelayMs,
        maxMessageLength: config.maxMessageLength,
        log,
    });
    bridge.attach();
    const poller = new WeixinPoller(bridge, {
        dshHome,
        groupPolicy: config.groupPolicy ?? 'disabled',
        log,
    });
    // ── QR login manager ────────────────────────────────────────────────────
    let loginTask = null;
    let loginAbort = null;
    const loginManager = {
        loginRunning: false,
        async startLogin() {
            if (loginTask)
                return { qrUrl: '', alreadyRunning: true };
            loginAbort = new AbortController();
            const signal = loginAbort.signal;
            let qr;
            try {
                qr = await fetchQr(config.baseUrl, '3', signal);
            }
            catch (error) {
                return { qrUrl: '', alreadyRunning: false, error: String(error) };
            }
            const qrUrl = qr.qrcodeUrl || qr.qrcode;
            loginTask = (async () => {
                try {
                    const result = await pollLogin(qr, {
                        baseUrl: config.baseUrl,
                        signal,
                        onRefresh: (count) => log('info', `QR expired, refreshing (${count})`),
                        onStatus: (status) => log('info', `QR status: ${status}`),
                    });
                    if (result.ok && result.account) {
                        saveWeixinAccount(dshHome, result.account);
                        log('info', `login confirmed account=${result.account.account_id}`);
                        poller.start(result.account);
                    }
                    else {
                        log('error', `login failed: ${result.error}`);
                    }
                }
                catch (error) {
                    log('error', `login task error: ${String(error)}`);
                }
                finally {
                    loginTask = null;
                    loginAbort = null;
                    loginManager.loginRunning = false;
                }
            })();
            loginManager.loginRunning = true;
            return { qrUrl, alreadyRunning: false };
        },
    };
    // ── model-facing tools ──────────────────────────────────────────────────
    const host = { bridge, poller, login: loginManager, dshHome };
    registerWeixinTools(ctx, host);
    // ── browser-facing RPC endpoints ────────────────────────────────────────
    ctx.inject(['connection'], (connectionCtx) => {
        connectionCtx.connection.rpc.intercept(
            '/api',
            (endpoint) => endpoint === 'weixin/status' || endpoint === 'weixin/login' || endpoint === 'weixin/newSession',
            async (endpoint, payload, signal) => {
                try {
                    if (endpoint === 'weixin/status') {
                        const account = bridge.currentAccount;
                        return {
                            ok: true,
                            value: {
                                connected: !!account,
                                accountId: account?.account_id ?? null,
                                sessionId: bridge.currentSessionId,
                                polling: poller.running,
                                loginRunning: loginManager.loginRunning,
                            },
                        };
                    }
                    if (endpoint === 'weixin/login') {
                        const result = await loginManager.startLogin();
                        if (result.error) {
                            return { ok: false, error: { code: 'internal', message: result.error, details: {} } };
                        }
                        if (result.alreadyRunning) {
                            return { ok: false, error: { code: 'conflict', message: 'QR login already in progress', details: {} } };
                        }
                        return { ok: true, value: { qrUrl: result.qrUrl } };
                    }
                    if (endpoint === 'weixin/newSession') {
                        bridge.sessionCounter += 1;
                        const newId = bridge.currentSessionId;
                        const old = bridge.handles.get(newId);
                        if (old) {
                            await old.dispose();
                            bridge.handles.delete(newId);
                        }
                        return { ok: true, value: { sessionId: newId } };
                    }
                    return { ok: false, error: { code: 'not-found', message: `unknown endpoint ${endpoint}`, details: {} } };
                } catch (error) {
                    return { ok: false, error: { code: 'internal', message: error instanceof Error ? error.message : String(error), details: {} } };
                }
            },
            { authority: 'loopback' },
        );
    });
    // ── lifecycle ───────────────────────────────────────────────────────────
    const host = { bridge, poller, login: loginManager, dshHome };
    registerWeixinTools(ctx, host);
    // ── lifecycle ───────────────────────────────────────────────────────────
    ctx.effect(() => {
        if (account) {
            poller.start(account);
            log('info', `started with account=${account.account_id}`);
        }
        else {
            log('warn', 'no saved account; inbound polling idle until weixin_login runs');
        }
        return async () => {
            loginAbort?.abort();
            await poller.close();
            await bridge.dispose();
            log('info', 'plugin disposed');
        };
    });
}
//# sourceMappingURL=index.js.map