/**
 * Inbound message parsing and outbound text formatting for WeChat.
 *
 * Ports the essential pieces of hermes-agent/gateway/platforms/weixin.py:
 * `_extract_text`, `_guess_chat_type`, `_normalize_markdown_blocks`, and a
 * simplified version of `_split_text_for_weixin_delivery`.
 */
import { type ILinkMessage } from './ilink/types.js';
export declare const WEIXIN_MAX_MESSAGE_LENGTH = 2000;
export interface ParsedMessage {
    text: string;
    senderId: string;
    chatType: 'dm' | 'group';
    chatId: string;
    contextToken?: string;
    messageId?: string;
}
/** Extract the text of a message (first text item wins), like `_extract_text`. */
export declare function extractText(itemList: Array<Record<string, unknown>> | undefined): string;
/**
 * Guess dm/group and the effective chat id, like `_guess_chat_type`.
 * Groups are identified by room_id/chat_room_id, or by a to_user_id that is
 * not the bot's own account id on a user message.
 */
export declare function guessChatType(message: ILinkMessage, accountId: string): {
    chatType: 'dm' | 'group';
    chatId: string;
};
export declare function parseMessage(message: ILinkMessage, accountId: string): ParsedMessage | null;
/** Collapse runs of blank lines outside code fences (mirrors `_normalize_markdown_blocks`). */
export declare function normalizeMarkdown(content: string): string;
/**
 * Split long content into sequential WeChat messages. Keeps fenced code
 * blocks intact and never cuts a code fence mid-block; each chunk is at most
 * `maxLength` characters (WeChat renders ~2000-char messages).
 */
export declare function splitTextForDelivery(content: string, maxLength?: number): string[];
/** True when an iLink response signals a rate limit (ret/errcode -2). */
export { isRateLimited, isStaleSession } from './ilink/client.js';
