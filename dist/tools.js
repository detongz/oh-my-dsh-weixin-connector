/**
 * Model-facing tools for the weixin connector:
 * - weixin_status — connection + polling status (rich text card)
 * - weixin_login  — start the QR login flow; renders the QR as an in-chat image
 * - weixin_send   — push a message to one WeChat peer
 */
import { execFileSync } from 'node:child_process';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { listWeixinAccounts } from './account.js';
const textBlock = (text) => [{ type: 'text', text }];
/** Box a QR-login tool payload as JsonValue (render re-reads it structurally). */
function qrResult(payload) {
    return payload;
}
/** Generate a QR code PNG for a payload via python3 + the qrcode library. */
function qrPngBytes(payload) {
    const script = [
        'import io, sys, qrcode',
        "qr = qrcode.QRCode(border=2, box_size=8)",
        'qr.add_data(sys.argv[1])',
        'qr.make(fit=True)',
        "img = qr.make_image(fill_color='black', back_color='white')",
        'buf = io.BytesIO()',
        "img.save(buf, format='PNG')",
        'sys.stdout.buffer.write(buf.getvalue())',
    ].join('; ');
    try {
        return execFileSync('python3', ['-c', script, payload], { maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    }
    catch {
        return null;
    }
}
export function registerWeixinTools(ctx, host) {
    ctx.tools.register(defineTool({
        name: 'weixin_status',
        description: 'Report the DSH↔WeChat (Weixin) connector status: logged-in account, polling state, ' +
            'saved accounts, and login progress. Call this after weixin_login to verify activation.',
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => textBlock(value),
        },
        async execute() {
            const account = host.bridge.currentAccount;
            const lines = [];
            lines.push('Weixin connector status:');
            if (account) {
                lines.push(`- account_id: ${account.account_id}`);
                lines.push(`- base_url: ${account.base_url}`);
                lines.push(`- polling: ${host.poller.running ? 'running' : 'stopped'}`);
            }
            else {
                lines.push('- logged in: NO (call weixin_login to start QR login)');
            }
            lines.push(`- login in progress: ${host.login.loginRunning}`);
            const saved = listWeixinAccounts(host.dshHome);
            if (saved.length > 0) {
                lines.push(`- saved accounts: ${saved.map((a) => a.account_id).join(', ')}`);
            }
            return lines.join('\n');
        },
    }));
    ctx.tools.register(defineTool({
        name: 'weixin_login',
        description: 'Start QR login for the WeChat (Weixin) iLink bot account. Returns the QR code as an ' +
            'in-chat image plus the scannable URL; the user scans the QR with WeChat and confirms. ' +
            'Polling for inbound messages starts automatically once login completes ' +
            '(use weixin_status to check).',
        parameters: {},
        output: {
            schema: { type: 'json' },
            render: (_args, value) => {
                const v = value;
                const blocks = [];
                if (v.message)
                    blocks.push({ type: 'text', text: v.message });
                if (v.qrImage)
                    blocks.push({ type: 'image', attachment: v.qrImage });
                if (v.qrUrl && !v.qrImage) {
                    blocks.push({
                        type: 'text',
                        text: `如果二维码无法显示，请用微信扫一扫扫描此链接生成的二维码（或在浏览器打开）：\n${v.qrUrl}`,
                    });
                }
                return blocks;
            },
        },
        async execute() {
            const result = await host.login.startLogin();
            if (result.alreadyRunning) {
                return qrResult({
                    message: 'A QR login is already in progress. Ask the user to scan the previously provided QR, then check weixin_status.',
                });
            }
            if (result.error) {
                return qrResult({ message: `ERROR: failed to start QR login: ${result.error}` });
            }
            // Render the QR as an in-chat image via the attachment service.
            const png = qrPngBytes(result.qrUrl);
            if (png && ctx.attachments) {
                try {
                    const ref = await ctx.attachments.saveImage({
                        data: png,
                        mediaType: 'image/png',
                        name: 'weixin-qr.png',
                    });
                    return qrResult({
                        qrUrl: result.qrUrl,
                        qrImage: ref,
                        message: '请用微信「扫一扫」扫描上方二维码并确认登录。\n' +
                            '确认后轮询自动开始（weixin_status 可查看状态）；如果二维码过期会自动刷新。',
                    });
                }
                catch {
                    // fall through to URL-only
                }
            }
            return qrResult({
                qrUrl: result.qrUrl,
                message: '请用微信扫一扫扫描此链接生成的二维码（或在浏览器打开后扫码）：\n' +
                    `${result.qrUrl}\n\n确认后轮询自动开始。`,
            });
        },
    }));
    ctx.tools.register(defineTool({
        name: 'weixin_send',
        description: 'Send a text message to a WeChat (Weixin) peer. chat_id is the iLink user id of the ' +
            'recipient (typically the from_user_id of an inbound message). Use this to push ' +
            'proactive messages to WeChat contacts.',
        parameters: {
            chat_id: { type: 'string', required: true, description: 'iLink user id of the WeChat recipient.' },
            message: { type: 'string', required: true, description: 'The text message to send.' },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => textBlock(value),
        },
        async execute(args) {
            if (!host.bridge.currentAccount) {
                return 'ERROR: Weixin connector is not logged in. Call weixin_login first.';
            }
            try {
                await host.bridge.sendToWeChat(args.chat_id, args.message);
                return `Sent ${args.message.length} chars to ${args.chat_id}.`;
            }
            catch (error) {
                return `ERROR: weixin_send failed: ${String(error)}`;
            }
        },
    }));
}
//# sourceMappingURL=tools.js.map