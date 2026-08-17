/**
 * Model-facing tools for the weixin connector:
 * - weixin_status — connection + polling status (rich text card)
 * - weixin_login  — start the QR login flow; renders the QR as an in-chat image
 * - weixin_send   — push a message to one WeChat peer
 */
import type { Context } from '@deepseek-ai/cordis';
import type { WeixinBridge } from './bridge.js';
import type { WeixinPoller } from './poller.js';
export interface LoginManager {
    /** Start (or return) a background QR login; resolves with the QR scan data. */
    startLogin(): Promise<{
        qrUrl: string;
        alreadyRunning: boolean;
        error?: string;
    }>;
    loginRunning: boolean;
}
export interface ToolHost {
    bridge: WeixinBridge;
    poller: WeixinPoller;
    login: LoginManager;
    dshHome: string;
}
export declare function registerWeixinTools(ctx: Context, host: ToolHost): void;
