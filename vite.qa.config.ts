import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Browser QA 用の分離 config。
// ユーザーの dev サーバー (vite.config.ts) と optimize-deps キャッシュを
// 共有すると 504 (Outdated Optimize Dep) を誘発するため、QA インスタンスは
// 独立した cacheDir を使う。
export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-qa-cache',
})
