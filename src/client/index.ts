/**
 * dsh-weixin — browser half.
 *
 * WeChat connector settings card:
 * - Polls connection status from host RPC
 * - Shows QR code for login when disconnected
 * - Shows current session + "New Session" button when connected
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import * as React from 'react'

export const inject = ['slots', 'connection']

/* ─── module-level connection ref (set by apply) ─── */
let connRef: ConnectionHandle | null = null

/* ─── state shape ─── */
interface WeixinState {
  connected: boolean
  accountId: string | null
  sessionId: string
  polling: boolean
  loginRunning: boolean
  qrUrl: string | null
  qrVisible: boolean
  error: string | null
  loading: boolean
}

/* ─── card component ─── */
function WeixinSettingsCard(): React.ReactElement {
  const [state, setState] = React.useState<WeixinState>({
    connected: false,
    accountId: null,
    sessionId: 'weixin-main',
    polling: false,
    loginRunning: false,
    qrUrl: null,
    qrVisible: false,
    error: null,
    loading: false,
  })

  // Poll status every 3s
  React.useEffect(() => {
    let alive = true
    async function poll() {
      if (!connRef) return
      try {
        const resp = await connRef.rpc.call('/api', 'weixin/status', {})
        if (!alive) return
        if (resp.ok && typeof resp.value === 'object' && resp.value !== null) {
          const v = resp.value as any
          setState(prev => ({
            ...prev,
            connected: !!v.connected,
            accountId: v.accountId ?? null,
            sessionId: v.sessionId ?? 'weixin-main',
            polling: !!v.polling,
            loginRunning: !!v.loginRunning,
          }))
        }
      } catch {
        // ignore polling errors
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const doLogin = React.useCallback(async () => {
    if (!connRef) return
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const resp = await connRef.rpc.call('/api', 'weixin/login', {})
      if (!resp.ok) {
        throw new Error((resp.error as any)?.message || 'Login failed')
      }
      const v = resp.value as any
      setState(prev => ({
        ...prev,
        qrUrl: v.qrUrl ?? null,
        qrVisible: true,
        loading: false,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      }))
    }
  }, [])

  const doNewSession = React.useCallback(async () => {
    if (!connRef) return
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const resp = await connRef.rpc.call('/api', 'weixin/newSession', {})
      if (!resp.ok) {
        throw new Error((resp.error as any)?.message || 'Failed to create session')
      }
      const v = resp.value as any
      setState(prev => ({
        ...prev,
        sessionId: v.sessionId ?? prev.sessionId,
        loading: false,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      }))
    }
  }, [])

  const hideQr = React.useCallback(() => {
    setState(prev => ({ ...prev, qrVisible: false }))
  }, [])

  // Simple QR display: if URL looks like an image, show it; else show text
  const qrDisplay = React.useMemo(() => {
    if (!state.qrUrl) return null
    const isImage = state.qrUrl.startsWith('http') &&
      (state.qrUrl.includes('qrcode') || state.qrUrl.endsWith('.png') || state.qrUrl.endsWith('.jpg'))
    if (isImage) {
      return React.createElement('img', {
        src: state.qrUrl,
        alt: 'WeChat QR',
        style: { width: 200, height: 200, display: 'block', margin: '12px 0', border: '1px solid #ddd', borderRadius: 4 },
      })
    }
    return React.createElement('div', { style: { margin: '12px 0', padding: 12, background: '#f5f5f5', borderRadius: 4, wordBreak: 'break-all' } },
      React.createElement('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#666' } }, '请用微信「扫一扫」扫描以下二维码：'),
      React.createElement('code', { style: { fontSize: 12 } }, state.qrUrl)
    )
  }, [state.qrUrl])

  return React.createElement('div', { style: { padding: '12px 16px', fontSize: 14, lineHeight: 1.5 } },
    // Header
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
      React.createElement('span', {
        style: {
          width: 10, height: 10, borderRadius: '50%',
          background: state.connected ? '#22c55e' : '#ef4444',
          display: 'inline-block',
        }
      }),
      React.createElement('strong', null, '微信连接器'),
      React.createElement('span', { style: { color: '#888', fontSize: 12 } }, state.connected ? '已连接' : '未连接')
    ),

    // Status details
    state.connected && React.createElement('div', { style: { marginBottom: 12, color: '#444' } },
      React.createElement('div', null, `账号: ${state.accountId ?? '-'}`),
      React.createElement('div', null, `当前对话: ${state.sessionId}`),
      React.createElement('div', null, `轮询: ${state.polling ? '运行中' : '已停止'}`)
    ),

    // Actions
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
      !state.connected && React.createElement('button', {
        onClick: doLogin,
        disabled: state.loading,
        style: {
          padding: '6px 14px', borderRadius: 4, border: 'none',
          background: '#2563eb', color: '#fff', cursor: state.loading ? 'not-allowed' : 'pointer',
          opacity: state.loading ? 0.6 : 1,
        }
      }, state.loading ? '处理中…' : '扫码登录'),

      state.connected && React.createElement('button', {
        onClick: doNewSession,
        disabled: state.loading,
        style: {
          padding: '6px 14px', borderRadius: 4, border: '1px solid #2563eb',
          background: '#fff', color: '#2563eb', cursor: state.loading ? 'not-allowed' : 'pointer',
          opacity: state.loading ? 0.6 : 1,
        }
      }, state.loading ? '处理中…' : '新建对话 (/new)'),

      state.qrVisible && React.createElement('button', {
        onClick: hideQr,
        style: {
          padding: '6px 14px', borderRadius: 4, border: '1px solid #ccc',
          background: '#f9f9f9', color: '#444', cursor: 'pointer',
        }
      }, '隐藏二维码')
    ),

    // QR code display
    state.qrVisible && qrDisplay,

    // Error
    state.error && React.createElement('div', { style: { color: '#dc2626', fontSize: 13, marginTop: 8 } }, state.error),

    // Hint
    React.createElement('p', { style: { color: '#888', fontSize: 12, marginTop: 8 } },
      '提示: 微信消息会路由到固定对话 session，发送 /new 可切换到新对话。'
    )
  )
}

export function apply(ctx: ClientContext): void {
  console.log('[dsh-weixin] client apply() called')

  // Capture connection handle for card callbacks
  try {
    connRef = ctx.get('connection') as ConnectionHandle
  } catch {
    console.warn('[dsh-weixin] connection service not available')
  }

  ctx.slots.inject('settings.plugin.item', () => {
    console.log('[dsh-weixin] injecting settings card (v0.2.0)')
    try {
      return ctx.slots.register({
        name: 'settings.plugin.item',
        id: 'dsh-weixin',
        order: 30,
        label: '微信连接器',
      }, WeixinSettingsCard)
    } catch (err) {
      console.error('[dsh-weixin] register failed:', err)
      throw err
    }
  })
}
