/**
 * Inbound message parsing and outbound text formatting for WeChat.
 *
 * Ports the essential pieces of hermes-agent/gateway/platforms/weixin.py:
 * `_extract_text`, `_guess_chat_type`, `_normalize_markdown_blocks`, and a
 * simplified version of `_split_text_for_weixin_delivery`.
 */
import { ITEM_TEXT, MSG_TYPE_USER, } from './ilink/types.js';
export const WEIXIN_MAX_MESSAGE_LENGTH = 2000;
/** Extract the text of a message (first text item wins), like `_extract_text`. */
export function extractText(itemList) {
    for (const item of itemList ?? []) {
        if (item.type === ITEM_TEXT) {
            const textItem = item.text_item;
            return String(textItem?.text ?? '').trim();
        }
    }
    return '';
}
/**
 * Guess dm/group and the effective chat id, like `_guess_chat_type`.
 * Groups are identified by room_id/chat_room_id, or by a to_user_id that is
 * not the bot's own account id on a user message.
 */
export function guessChatType(message, accountId) {
    const roomId = String(message.room_id ?? message.chat_room_id ?? '').trim();
    const toUserId = String(message.to_user_id ?? '').trim();
    const isGroup = Boolean(roomId) ||
        (Boolean(toUserId) && Boolean(accountId) && toUserId !== accountId && message.msg_type === MSG_TYPE_USER);
    if (isGroup) {
        return { chatType: 'group', chatId: roomId || toUserId || String(message.from_user_id ?? '') };
    }
    return { chatType: 'dm', chatId: String(message.from_user_id ?? '') };
}
export function parseMessage(message, accountId) {
    const senderId = String(message.from_user_id ?? '').trim();
    if (!senderId)
        return null;
    if (senderId === accountId)
        return null; // ignore self
    const itemList = message.item_list;
    const text = extractText(itemList);
    const { chatType, chatId } = guessChatType(message, accountId);
    const contextToken = String(message.context_token ?? '').trim();
    return {
        text,
        senderId,
        chatType,
        chatId,
        contextToken: contextToken || undefined,
        messageId: String(message.message_id ?? '').trim() || undefined,
    };
}
/** Collapse runs of blank lines outside code fences (mirrors `_normalize_markdown_blocks`). */
export function normalizeMarkdown(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let inCodeBlock = false;
    let blankRun = 0;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, '');
        const stripped = line.trim();
        if (/^```/.test(stripped)) {
            inCodeBlock = !inCodeBlock;
            result.push(line);
            blankRun = 0;
            continue;
        }
        if (inCodeBlock) {
            result.push(line);
            continue;
        }
        if (!stripped) {
            blankRun += 1;
            if (blankRun <= 1)
                result.push('');
            continue;
        }
        blankRun = 0;
        result.push(line);
    }
    return result.join('\n').trim();
}
/**
 * Split long content into sequential WeChat messages. Keeps fenced code
 * blocks intact and never cuts a code fence mid-block; each chunk is at most
 * `maxLength` characters (WeChat renders ~2000-char messages).
 */
export function splitTextForDelivery(content, maxLength = WEIXIN_MAX_MESSAGE_LENGTH) {
    if (!content)
        return [];
    if (content.length <= maxLength)
        return [content];
    const blocks = [];
    const lines = content.split(/\r?\n/);
    let current = [];
    let inCodeBlock = false;
    const flush = () => {
        const block = current.join('\n').trim();
        if (block)
            blocks.push(block);
        current = [];
    };
    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, '');
        const stripped = line.trim();
        if (/^```/.test(stripped)) {
            flush();
            current.push(line);
            inCodeBlock = !inCodeBlock;
            if (!inCodeBlock)
                flush(); // closing fence: keep the whole fence block intact
            continue;
        }
        if (inCodeBlock) {
            current.push(line);
            continue;
        }
        if (!stripped) {
            flush();
            continue;
        }
        current.push(line);
    }
    flush();
    // Greedy block packing with hard splits for oversized units.
    const chunks = [];
    const pushWrapped = (text) => {
        // Split a possibly-oversized piece into maxLength chunks, preferring line
        // boundaries and then hard cuts.
        let rest = text;
        while (rest.length > maxLength) {
            let cut = rest.lastIndexOf('\n', maxLength);
            if (cut < 0)
                cut = maxLength;
            chunks.push(rest.slice(0, cut).trim());
            rest = rest.slice(cut + (rest[cut] === '\n' ? 1 : 0));
        }
        if (rest.trim())
            chunks.push(rest.trim());
    };
    let pending = '';
    for (const block of blocks) {
        if (block.length > maxLength) {
            if (pending) {
                chunks.push(pending);
                pending = '';
            }
            pushWrapped(block);
            continue;
        }
        if (pending && pending.length + 1 + block.length > maxLength) {
            chunks.push(pending);
            pending = '';
        }
        pending = pending ? `${pending}\n${block}` : block;
    }
    if (pending)
        chunks.push(pending);
    return chunks.filter((c) => c.trim());
}
/** True when an iLink response signals a rate limit (ret/errcode -2). */
export { isRateLimited, isStaleSession } from './ilink/client.js';
//# sourceMappingURL=message.js.map