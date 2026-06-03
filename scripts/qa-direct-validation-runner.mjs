import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  clearScreen: false,
  logLevel: 'error',
  server: {
    middlewareMode: true,
  },
})

try {
  const module = await server.ssrLoadModule('/scripts/qa-direct-validation.entry.ts')
  const result = await module.runDirectQaValidation()
  console.log(JSON.stringify(result, null, 2))
} finally {
  await server.close()
}
