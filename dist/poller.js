/**
 * The long-poll background task for iLink getupdates.
 *
 * Port of hermes-agent/gateway/platforms/weixin.py `_poll_loop`:
 * - 35s long polls, honoring the server's suggested `longpolling_timeout_ms`
 * - sync buffer persisted between polls so restarts resume mid-stream
 * - session-expired (-14 / -2 "unknown error") pauses 10 minutes
 * - rate limit / transient failures back off and retry
 * - a full failure streak resets the consecutive-failure counter
 */
import { getUpdates, isStaleSession } from './ilink/client.js';
import { loadSyncBuf, saveSyncBuf } from './account.js';
import { parseMessage } from './message.js';
const MAX_CONSECUTIVE_FAILURES = 3;
const RETRY_DELAY_MS = 2000;
const BACKOFF_DELAY_MS = 30_000;
const SESSION_EXPIRED_PAUSE_MS = 600_000;
export class WeixinPoller {
    bridge;
    controller = null;
    task = null;
    opts;
    constructor(bridge, options) {
        this.bridge = bridge;
        this.opts = {
            dshHome: options.dshHome,
            groupPolicy: options.groupPolicy ?? 'disabled',
            log: options.log,
        };
    }
    get running() {
        return this.controller !== null;
    }
    log(level, msg, ...rest) {
        if (this.opts.log)
            this.opts.log(level, msg, ...rest);
    }
    /** Start polling for one account. Replaces any running poll. */
    start(account) {
        this.stop();
        this.bridge.currentAccount = account;
        this.controller = new AbortController();
        this.task = this.run(account, this.controller.signal);
    }
    stop() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
        this.task = null;
    }
    /** Abort and await the poll task (e.g. on plugin unload). */
    async close() {
        this.stop();
        if (this.task) {
            try {
                await this.task;
            }
            catch {
                // cancelled tasks settle quietly
            }
            this.task = null;
        }
    }
    async run(account, signal) {
        let syncBuf = loadSyncBuf(this.opts.dshHome, account.account_id);
        let timeoutMs = 35_000;
        let consecutiveFailures = 0;
        this.log('info', `polling started account=${account.account_id} base=${account.base_url}`);
        while (!signal.aborted) {
            try {
                const response = await getUpdates(account.base_url, account.token, syncBuf, timeoutMs, signal);
                if (signal.aborted)
                    break;
                const suggested = response.longpolling_timeout_ms;
                if (typeof suggested === 'number' && suggested > 0)
                    timeoutMs = suggested;
                const ret = response.ret;
                const errcode = response.errcode;
                if ((ret !== undefined && ret !== 0) || (errcode !== undefined && errcode !== 0)) {
                    if (isStaleSession(response)) {
                        this.log('error', `session expired; pausing for ${SESSION_EXPIRED_PAUSE_MS / 1000}s`);
                        await sleepAbortable(SESSION_EXPIRED_PAUSE_MS, signal);
                        consecutiveFailures = 0;
                        continue;
                    }
                    consecutiveFailures += 1;
                    this.log('warn', `getUpdates failed ret=${ret} errcode=${errcode} errmsg=${response.errmsg ?? response.msg ?? ''} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
                    const delay = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? BACKOFF_DELAY_MS : RETRY_DELAY_MS;
                    if (!(await sleepAbortable(delay, signal)))
                        break;
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
                        consecutiveFailures = 0;
                    continue;
                }
                consecutiveFailures = 0;
                const newSyncBuf = String(response.get_updates_buf ?? '');
                if (newSyncBuf) {
                    syncBuf = newSyncBuf;
                    saveSyncBuf(this.opts.dshHome, account.account_id, syncBuf);
                }
                for (const message of response.msgs ?? []) {
                    if (signal.aborted)
                        break;
                    try {
                        await this.handleMessage(message, account);
                    }
                    catch (error) {
                        this.log('error', `inbound processing error: ${String(error)}`);
                    }
                }
            }
            catch (error) {
                if (signal.aborted)
                    break;
                consecutiveFailures += 1;
                this.log('error', `poll error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${String(error)}`);
                const delay = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? BACKOFF_DELAY_MS : RETRY_DELAY_MS;
                if (!(await sleepAbortable(delay, signal)))
                    break;
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
                    consecutiveFailures = 0;
            }
        }
        this.log('info', `polling stopped account=${account.account_id}`);
    }
    async handleMessage(message, account) {
        const parsed = parseMessage(message, account.account_id);
        if (!parsed)
            return;
        if (parsed.chatType === 'group') {
            if (this.opts.groupPolicy === 'disabled')
                return;
            // MVP: groups route through the same per-sender session as DMs.
        }
        await this.bridge.deliverInbound({
            senderId: parsed.senderId,
            chatId: parsed.chatId,
            text: parsed.text,
            contextToken: parsed.contextToken,
            messageId: parsed.messageId,
            account,
        });
    }
}
/** Sleep that resolves false when aborted early. */
function sleepAbortable(ms, signal) {
    return new Promise((resolve) => {
        if (signal.aborted) {
            resolve(false);
            return;
        }
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve(true);
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            resolve(false);
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}
//# sourceMappingURL=poller.js.map