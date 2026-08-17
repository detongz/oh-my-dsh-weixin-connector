/**
 * dsh-weixin — browser half.
 *
 * Registers a settings configuration card for the WeChat connector.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import * as React from 'react'

export const inject = ['slots']

function WeixinSettingsCard(): React.ReactElement {
  return React.createElement('div', { style: { padding: '12px' } },
    React.createElement('h3', null, '微信连接器配置'),
    React.createElement('p', null, '当前配置通过 cordis.patch.yml 管理。'),
    React.createElement('p', null, '配置项：baseUrl, provider, model, accountId, token')
  )
}

export function apply(ctx: ClientContext): void {
  console.log('[dsh-weixin] client apply() called')

  ctx.slots.inject('settings.plugin.item', () => {
    console.log('[dsh-weixin] injecting settings card')
    return ctx.slots.register({
      name: 'settings.plugin.item',
      id: 'dsh-weixin',
    }, WeixinSettingsCard)
  })
}
