/**
 * Disk persistence for iLink accounts, per-peer context tokens, and the
 * getupdates sync buffer — mirroring hermes `save_weixin_account` /
 * `ContextTokenStore` / `_sync_buf_path` under `$DSH_HOME/weixin/accounts/`.
 */
import type { WeixinAccount } from './ilink/types.js';
export declare function accountsDir(dshHome: string): string;
export declare function saveWeixinAccount(dshHome: string, account: WeixinAccount): void;
export declare function loadWeixinAccount(dshHome: string, accountId: string): WeixinAccount | null;
export declare function listWeixinAccounts(dshHome: string): WeixinAccount[];
/** Disk-backed per-peer context_token cache (account → peer → token). */
export declare class ContextTokenStore {
    private readonly dshHome;
    private readonly cache;
    constructor(dshHome: string);
    private path;
    private key;
    restore(accountId: string): void;
    get(accountId: string, userId: string): string | undefined;
    set(accountId: string, userId: string, token: string): void;
    drop(accountId: string, userId: string): void;
    private persist;
}
/** Persist the getupdates sync buffer so restarts resume mid-stream. */
export declare function loadSyncBuf(dshHome: string, accountId: string): string;
export declare function saveSyncBuf(dshHome: string, accountId: string, syncBuf: string): void;
