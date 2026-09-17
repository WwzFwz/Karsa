/**
 * One process, one container (D2, D75): the room service and document sync
 * share an HTTP server, and the built app is served from the same origin, so a
 * classroom needs one address and nothing else.
 */

import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Server } from 'node:http'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'
import { openStorage } from './sync/storage.js'
import { mountSync, SYNC_PATH } from './sync/sync.js'

const PORT = Number(process.env.PORT ?? 3000)
const DATA_FILE = resolve(process.env.KARSA_DATA ?? 'data/karsa.sqlite')
const STATIC_DIR = resolve(process.env.KARSA_STATIC ?? '../dist')

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'] })
  app.setGlobalPrefix('api')

  const storage = openStorage(DATA_FILE)
  const hocuspocus = mountSync(app.getHttpServer() as Server, storage)

  // The built client, when there is one. In development Vite serves it instead.
  if (existsSync(join(STATIC_DIR, 'index.html'))) {
    app.useStaticAssets(STATIC_DIR)
    app.use((req: { method: string; path: string }, res: { sendFile(path: string): void }, next: () => void) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path === SYNC_PATH) return next()
      res.sendFile(join(STATIC_DIR, 'index.html'))
    })
  }

  app.enableShutdownHooks()
  const shutdown = async () => {
    hocuspocus.flushPendingStores()
    await app.close()
    storage.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await app.listen(PORT)
  console.log(`Karsa server di http://localhost:${PORT} (sinkronisasi ${SYNC_PATH}, data ${DATA_FILE})`)
}

void bootstrap()
