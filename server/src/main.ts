/**
 * One process, one container (D2, D76): the room service and document sync
 * share an HTTP server, and the built app is served from the same origin, so a
 * classroom needs one address and nothing else.
 */

import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import { Tokens } from './auth/token.js'
import { readConfig } from './config.js'
import { openDatabase } from './db.js'
import { JoinRequests } from './rooms/requests.js'
import { RoomsRepository } from './rooms/rooms.repository.js'
import { RoomsService } from './rooms/rooms.service.js'
import { loadSeed } from './rooms/seed.js'
import { documentStorage } from './sync/storage.js'
import { createSync, mountSync, SYNC_PATH } from './sync/sync.js'

async function bootstrap() {
  const config = readConfig()
  const db = openDatabase(config.dataFile)
  const storage = documentStorage(db)
  const repository = new RoomsRepository(db)
  const tokens = new Tokens(config.secret, config.tokenDays)
  const seed = await loadSeed()
  const hocuspocus = createSync({ storage, rooms: repository, tokens, seed })
  const rooms = new RoomsService(repository, storage, new JoinRequests(), tokens, seed, hocuspocus)
  rooms.ensureDemoRoom()

  const app = await NestFactory.create<NestExpressApplication>(AppModule.register({ rooms, tokens }), {
    logger: ['error', 'warn'],
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  // Behind a proxy in the deployed setup, so rate limits see the real address.
  app.set('trust proxy', true)

  const docs = new DocumentBuilder()
    .setTitle('Karsa room service')
    .setDescription('Ruang, token masuk, dan ruang tunggu. Dokumen ruang lewat WebSocket /sync.')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docs))

  mountSync(app.getHttpServer() as Server, hocuspocus)

  /*
    Speech model files, when this install carries them.

    Served with the same path shape the CDN uses, so one cache serves both and
    switching a device between them re-downloads nothing. Immutable, because a
    model file at a given revision never changes -- and a classroom that opens
    the same room every week should pay for the download once.
  */
  if (config.modelDir && existsSync(config.modelDir)) {
    app.useStaticAssets(config.modelDir, {
      prefix: '/models/',
      maxAge: '365d',
      immutable: true,
      setHeaders: (res: { setHeader(name: string, value: string): void }) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
      },
    })
    console.log(`Model ucapan disajikan dari ${config.modelDir} di /models`)
  }

  // The built client, when there is one. In development Vite serves it instead.
  if (existsSync(join(config.staticDir, 'index.html'))) {
    app.useStaticAssets(config.staticDir)
    app.use((req: { method: string; path: string }, res: { sendFile(path: string): void }, next: () => void) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/models')) return next()
      if (req.path === SYNC_PATH) return next()
      res.sendFile(join(config.staticDir, 'index.html'))
    })
  }

  const shutdown = async () => {
    hocuspocus.flushPendingStores()
    await app.close()
    db.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await app.listen(config.port)
  console.log(`Karsa server di http://localhost:${config.port} (API /api, dokumentasi /api/docs, sinkronisasi ${SYNC_PATH})`)
}

void bootstrap()
