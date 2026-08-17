import { defineConfig } from 'rolldown'

const CLIENT_EXTERNALS = [
  '@deepseek-ai/dsh-client-runtime/client',
  'react',
  'react/jsx-runtime',
]

export default defineConfig({
  input: 'src/client/index.ts',
  output: {
    file: 'lib/client.js',
    format: 'cjs',
    banner: `window.__ModuleLoader__.load({ id: "dsh-weixin", factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
  external: CLIENT_EXTERNALS,
})
