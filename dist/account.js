/**
 * Disk persistence for iLink accounts, per-peer context tokens, and the
 * getupdates sync buffer — mirroring hermes `save_weixin_account` /
 * `ContextTokenStore` / `_sync_buf_path` under `$DSH_HOME/weixin/accounts/`.
 */
import { mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export function accountsDir(dshHome) {
    const dir = join(dshHome, 'weixin', 'accounts');
    mkdirSync(dir, { recursive: true });
    return dir;
}
function atomicWriteJson(path, payload) {
    const tmp = `${path}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
    renameSync(tmp, path);
    try {
        chmodSync(path, 0o600);
    }
    catch {
        // best effort
    }
}
export function saveWeixinAccount(dshHome, account) {
    atomicWriteJson(join(accountsDir(dshHome), `${account.account_id}.json`), {
        ...account,
        saved_at: account.saved_at ?? new Date().toISOString(),
    });
}
export function loadWeixinAccount(dshHome, accountId) {
    try {
        const raw = readFileSync(join(accountsDir(dshHome), `${accountId}.json`), 'utf-8');
        const data = JSON.parse(raw);
        if (!data.account_id && accountId)
            data.account_id = accountId;
        if (!data.account_id || !data.token)
            return null;
        return data;
    }
    catch {
        return null;
    }
}
export function listWeixinAccounts(dshHome) {
    try {
        const entries = readdirSync(accountsDir(dshHome));
        const accounts = [];
        for (const name of entries) {
            if (!name.endsWith('.json') || name.includes('.context-tokens') || name.includes('.sync'))
                continue;
            try {
                const data = JSON.parse(readFileSync(join(accountsDir(dshHome), name), 'utf-8'));
                if (data.token)
                    accounts.push(data);
            }
            catch {
                // skip unreadable
            }
        }
        return accounts;
    }
    catch {
        return [];
    }
}
/** Disk-backed per-peer context_token cache (account → peer → token). */
export class ContextTokenStore {
    dshHome;
    cache = new Map();
    constructor(dshHome) {
        this.dshHome = dshHome;
    }
    path(accountId) {
        return join(accountsDir(this.dshHome), `${accountId}.context-tokens.json`);
    }
    key(accountId, userId) {
        return `${accountId}:${userId}`;
    }
    restore(accountId) {
        try {
            const data = JSON.parse(readFileSync(this.path(accountId), 'utf-8'));
            for (const [userId, token] of Object.entries(data)) {
                if (typeof token === 'string' && token)
                    this.cache.set(this.key(accountId, userId), token);
            }
        }
        catch {
            // nothing to restore
        }
    }
    get(accountId, userId) {
        return this.cache.get(this.key(accountId, userId));
    }
    set(accountId, userId, token) {
        this.cache.set(this.key(accountId, userId), token);
        this.persist(accountId);
    }
    drop(accountId, userId) {
        if (this.cache.delete(this.key(accountId, userId)))
            this.persist(accountId);
    }
    persist(accountId) {
        const prefix = `${accountId}:`;
        const payload = {};
        for (const [key, value] of this.cache) {
            if (key.startsWith(prefix))
                payload[key.slice(prefix.length)] = value;
        }
        try {
            atomicWriteJson(this.path(accountId), payload);
        }
        catch {
            // persistence is best effort
        }
    }
}
/** Persist the getupdates sync buffer so restarts resume mid-stream. */
export function loadSyncBuf(dshHome, accountId) {
    try {
        const data = JSON.parse(readFileSync(join(accountsDir(dshHome), `${accountId}.sync.json`), 'utf-8'));
        return data.get_updates_buf ?? '';
    }
    catch {
        return '';
    }
}
export function saveSyncBuf(dshHome, accountId, syncBuf) {
    try {
        atomicWriteJson(join(accountsDir(dshHome), `${accountId}.sync.json`), { get_updates_buf: syncBuf });
    }
    catch {
        // best effort
    }
}
//# sourceMappingURL=account.js.map