/**
 * The bridge between WeChat and DSH agents.
 *
 * - Inbound: a parsed iLink message maps to a per-sender DSH agent session
 *   (`weixin-<senderId>`) and is delivered with `agent.followup()`.
 * - Outbound: `session/event` `assistant/message` completion anchors from
 *   those sessions are formatted, chunked, and sent back over iLink with the
 *   peer's latest `context_token`.
 */
import { randomUUID } from 'node:crypto';
import { MessageId } from '@deepseek-ai/dsh-llm';
import { SessionId } from '@deepseek-ai/dsh-session';
import { ContextTokenStore } from './account.js';
import { sendMessage, isStaleSession, isRateLimited } from './ilink/client.js';
import { normalizeMarkdown, splitTextForDelivery, WEIXIN_MAX_MESSAGE_LENGTH } from './message.js';
const SESSION_PREFIX = 'weixin-';
const MESSAGE_DEDUP_TTL_MS = 300_000;
/** Wrap a sender id into a DSH session id. */
export function sessionIdForUser(userId) {
    return SessionId(`${SESSION_PREFIX}${userId}`);
}
export function isWeixinSession(sessionId) {
    return sessionId.startsWith(SESSION_PREFIX);
}
export function userIdFromSession(sessionId) {
    return sessionId.slice(SESSION_PREFIX.length);
}
export class WeixinBridge {
    ctx;
    tokens;
    handles = new Map();
    creating = new Map();
    dedup = new Map();
    opts;
    constructor(ctx, account, options) {
        this.ctx = ctx;
        this.tokens = new ContextTokenStore(options.dshHome);
        if (account) {
            this.tokens.restore(account.account_id);
        }
        this.opts = {
            dshHome: options.dshHome,
            agentOptions: options.agentOptions ?? {},
            cwd: options.cwd ?? process.cwd(),
            sendChunkDelayMs: options.sendChunkDelayMs ?? 1500,
            sendChunkRetries: options.sendChunkRetries ?? 4,
            sendChunkRetryDelayMs: options.sendChunkRetryDelayMs ?? 1000,
            maxMessageLength: options.maxMessageLength ?? WEIXIN_MAX_MESSAGE_LENGTH,
            log: options.log ?? ((level, msg, ...rest) => {
                const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log;
                fn(`[dsh-weixin] ${msg}`, ...rest);
            }),
        };
    }
    log(level, msg, ...rest) {
        this.opts.log(level, msg, ...rest);
    }
    /** Register the outbound listener that forwards assistant replies to WeChat. */
    attach() {
        this.ctx.on('session/event', (session, event) => {
            void this.onSessionEvent(session, event);
        });
    }
    isDuplicate(messageId, contentKey) {
        const now = Date.now();
        const check = (key) => {
            const seenAt = this.dedup.get(key);
            if (seenAt !== undefined && now - seenAt < MESSAGE_DEDUP_TTL_MS)
                return true;
            return false;
        };
        if (messageId && check(`id:${messageId}`))
            return true;
        if (contentKey && check(`content:${contentKey}`))
            return true;
        if (messageId)
            this.dedup.set(`id:${messageId}`, now);
        if (contentKey)
            this.dedup.set(`content:${contentKey}`, now);
        return false;
    }
    /**
     * Deliver one inbound WeChat message to the owning agent session.
     * Returns false when the message was ignored (dedup, empty, or no account).
     */
    async deliverInbound(payload) {
        const { senderId, chatId, text, contextToken, messageId, account } = payload;
        if (!senderId || !text)
            return false;
        if (contextToken) {
            this.tokens.set(account.account_id, senderId, contextToken);
        }
        const contentKey = `${senderId}:${hashText(text)}`;
        if (this.isDuplicate(messageId, contentKey)) {
            this.log('debug', `dedup: skipping ${messageId ?? contentKey}`);
            return false;
        }
        const agent = await this.getOrCreateAgent(senderId);
        agent.followup({
            id: MessageId(`weixin-in-${messageId ?? randomUUID()}`),
            role: 'user',
            content: [{ type: 'text', text }],
            source: { kind: 'plugin', plugin: 'dsh-weixin' },
        });
        this.log('info', `inbound from=${senderId} -> agent=${agent.id}`);
        return true;
    }
    /** Find or create the agent session for one WeChat sender. */
    async getOrCreateAgent(userId) {
        const sessionId = sessionIdForUser(userId);
        const existing = this.ctx.agents.get(sessionId);
        if (existing)
            return existing;
        const inflight = this.creating.get(userId);
        if (inflight)
            return inflight;
        const creating = this.createAgent(userId).finally(() => {
            this.creating.delete(userId);
        });
        this.creating.set(userId, creating);
        return creating;
    }
    async createAgent(userId) {
        const sessionId = sessionIdForUser(userId);
        this.log('info', `creating agent session ${sessionId}`);
        const handle = await this.ctx.agents.create({
            sessionId,
            agentOptions: this.opts.agentOptions,
            meta: { cwd: this.opts.cwd },
        });
        this.handles.set(sessionId, handle);
        return handle.agent;
    }
    /** Forward a completed assistant message back to WeChat. */
    async onSessionEvent(session, event) {
        if (event.type !== 'assistant/message')
            return;
        if (!isWeixinSession(session.id))
            return;
        const chatId = userIdFromSession(session.id);
        const text = contentToText(event.data.message.content);
        if (!text)
            return;
        try {
            await this.sendToWeChat(chatId, text);
        }
        catch (error) {
            this.log('error', `reply to ${chatId} failed: ${String(error)}`);
        }
    }
    /** Send a formatted reply to one WeChat peer, chunked. */
    async sendToWeChat(chatId, content) {
        const account = this.currentAccount;
        if (!account) {
            this.log('warn', `no account configured; dropping reply to ${chatId}`);
            return;
        }
        const formatted = normalizeMarkdown(content);
        const chunks = splitTextForDelivery(formatted, this.opts.maxMessageLength);
        if (chunks.length === 0)
            return;
        const contextToken = this.tokens.get(account.account_id, chatId);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            await this.sendChunkWithRetry(account, chatId, chunk, contextToken);
            if (i < chunks.length - 1 && this.opts.sendChunkDelayMs > 0) {
                await sleep(this.opts.sendChunkDelayMs);
            }
        }
    }
    async sendChunkWithRetry(account, chatId, chunk, contextToken) {
        let token = contextToken;
        let retriedWithoutToken = false;
        let lastError = null;
        for (let attempt = 0; attempt <= this.opts.sendChunkRetries; attempt++) {
            try {
                const resp = await sendMessage(account.base_url, account.token, chatId, chunk, token, `dsh-weixin-${randomUUID()}`);
                if (resp.ret !== undefined && resp.ret !== 0) {
                    if (isStaleSession(resp) && !retriedWithoutToken && token) {
                        retriedWithoutToken = true;
                        token = undefined;
                        this.tokens.drop(account.account_id, chatId);
                        this.log('warn', `session expired for ${chatId}; retrying without context_token`);
                        continue;
                    }
                    if (isRateLimited(resp)) {
                        lastError = new Error(`iLink rate limited: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? resp.msg}`);
                        if (attempt >= this.opts.sendChunkRetries)
                            break;
                        await sleep(this.opts.sendChunkRetryDelayMs * 3);
                        continue;
                    }
                    throw new Error(`iLink sendmessage error: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? resp.msg}`);
                }
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt >= this.opts.sendChunkRetries)
                    break;
                await sleep(this.opts.sendChunkRetryDelayMs * (attempt + 1));
            }
        }
        if (lastError)
            throw lastError;
    }
    /** Account snapshot for outbound sends (set by the poller after login). */
    currentAccount = null;
    /** Dispose all agent handles created by this bridge. */
    async dispose() {
        await Promise.allSettled([...this.handles.values()].map((h) => h.dispose()));
        this.handles.clear();
    }
}
function contentToText(blocks) {
    return blocks
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text)
        .join('\n');
}
function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=bridge.js.map