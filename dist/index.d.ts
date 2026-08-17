/**
 * dsh-weixin — DSH ↔ WeChat connector plugin.
 *
 * A Cordis plugin that connects the DeepSeek Harness to personal WeChat
 * accounts through Tencent's iLink Bot API, modeled on the hermes-agent
 * `gateway/platforms/weixin.py` adapter:
 *
 *   - QR login (`weixin_login` tool / automatic on load when configured)
 *   - long-poll getupdates for inbound messages
 *   - per-sender DSH agent sessions (`weixin-<senderId>`), driven with
 *     `agent.followup()`; assistant completions are sent back to WeChat
 *   - per-peer `context_token` tracking (disk persisted)
 *   - `weixin_send` tool for proactive pushes
 *
 * Export shape: namespace plugin — named `name` / `inject` / `apply`, no
 * default export.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { WeixinPluginConfig } from './config.js';
export type { WeixinPluginConfig } from './config.js';
export { WeixinBridge, sessionIdForUser } from './bridge.js';
export { WeixinPoller } from './poller.js';
export { accountsDir, saveWeixinAccount, loadWeixinAccount, listWeixinAccounts } from './account.js';
export declare const name = "dsh-weixin";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: WeixinPluginConfig): void;
