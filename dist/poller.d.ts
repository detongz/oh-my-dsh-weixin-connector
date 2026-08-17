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
import type { WeixinBridge } from './bridge.js';
import type { WeixinAccount } from './ilink/types.js';
export interface PollerOptions {
    dshHome: string;
    /** Group intake policy: 'disabled' (default), 'open'. MVP ignores groups. */
    groupPolicy?: 'disabled' | 'open';
    log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, ...rest: unknown[]) => void;
}
export declare class WeixinPoller {
    private readonly bridge;
    private controller;
    private task;
    private readonly opts;
    constructor(bridge: WeixinBridge, options: PollerOptions);
    get running(): boolean;
    private log;
    /** Start polling for one account. Replaces any running poll. */
    start(account: WeixinAccount): void;
    stop(): void;
    /** Abort and await the poll task (e.g. on plugin unload). */
    close(): Promise<void>;
    private run;
    private handleMessage;
}
