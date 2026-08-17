/**
 * The bridge between WeChat and DSH agents.
 *
 * - Inbound: a parsed iLink message maps to a per-sender DSH agent session
 *   (`weixin-<senderId>`) and is delivered with `agent.followup()`.
 * - Outbound: `session/event` `assistant/message` completion anchors from
 *   those sessions are formatted, chunked, and sent back over iLink with the
 *   peer's latest `context_token`.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { SessionId } from '@deepseek-ai/dsh-session';
import type { AgentOptions } from '@deepseek-ai/dsh-agent';
import { ContextTokenStore } from './account.js';
import type { WeixinAccount } from './ilink/types.js';
export interface BridgeOptions {
    dshHome: string;
    /** Provider/model for the weixin agent sessions. */
    agentOptions?: Partial<AgentOptions>;
    /** Working directory for fresh weixin sessions. */
    cwd?: string;
    /** Outbound chunk send delay (ms) between chunks. */
    sendChunkDelayMs?: number;
    /** Retries per outbound chunk. */
    sendChunkRetries?: number;
    /** Base backoff (ms) between retries. */
    sendChunkRetryDelayMs?: number;
    /** Max outbound message length. */
    maxMessageLength?: number;
    /** Log sink (defaults to console). */
    log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, ...rest: unknown[]) => void;
}
/** Wrap a sender id into a DSH session id. */
export declare function sessionIdForUser(userId: string): SessionId;
export declare function isWeixinSession(sessionId: string): boolean;
export declare function userIdFromSession(sessionId: string): string;
export declare class WeixinBridge {
    private readonly ctx;
    readonly tokens: ContextTokenStore;
    private readonly handles;
    private readonly creating;
    private readonly dedup;
    private readonly opts;
    constructor(ctx: Context, account: WeixinAccount | null, options: BridgeOptions);
    private log;
    /** Register the outbound listener that forwards assistant replies to WeChat. */
    attach(): void;
    isDuplicate(messageId: string | undefined, contentKey?: string): boolean;
    /**
     * Deliver one inbound WeChat message to the owning agent session.
     * Returns false when the message was ignored (dedup, empty, or no account).
     */
    deliverInbound(payload: {
        senderId: string;
        chatId: string;
        text: string;
        contextToken?: string;
        messageId?: string;
        account: WeixinAccount;
    }): Promise<boolean>;
    /** Find or create the agent session for one WeChat sender. */
    getOrCreateAgent(userId: string): Promise<Agent>;
    private createAgent;
    /** Forward a completed assistant message back to WeChat. */
    private onSessionEvent;
    /** Send a formatted reply to one WeChat peer, chunked. */
    sendToWeChat(chatId: string, content: string): Promise<void>;
    private sendChunkWithRetry;
    /** Account snapshot for outbound sends (set by the poller after login). */
    currentAccount: WeixinAccount | null;
    /** Dispose all agent handles created by this bridge. */
    dispose(): Promise<void>;
}
