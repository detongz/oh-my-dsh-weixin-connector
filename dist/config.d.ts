/**
 * Plugin configuration schema for dsh-weixin.
 */
export interface WeixinPluginConfig {
    /** Explicit account id. When absent, the first saved account under $DSH_HOME/weixin/accounts is used. */
    accountId?: string;
    /** Explicit bot token. When absent, loaded from the saved account file. */
    token?: string;
    /** iLink base URL override (defaults to https://ilinkai.weixin.qq.com). */
    baseUrl?: string;
    /** DSH home directory (defaults to $DSH_HOME or ~/.dsh). */
    dshHome?: string;
    /** Provider route for the per-user weixin agent sessions. */
    provider?: string;
    /** Model id for the per-user weixin agent sessions. */
    model?: string;
    /** Working directory for fresh weixin sessions. */
    cwd?: string;
    /** Group intake policy: 'disabled' (default) ignores group messages. */
    groupPolicy?: 'disabled' | 'open';
    /** Delay (ms) between outbound chunks. */
    sendChunkDelayMs?: number;
    /** Retries per outbound chunk. */
    sendChunkRetries?: number;
    /** Base backoff (ms) between chunk retries. */
    sendChunkRetryDelayMs?: number;
    /** Max outbound message length (default 2000). */
    maxMessageLength?: number;
}
