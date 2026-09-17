import { Module } from '@nestjs/common'
import { HealthController } from './health.controller.js'

/**
 * The room service. Rooms, join tokens and the waiting room land here as their
 * own modules (stage d); sync is mounted beside it in main.ts, not inside it,
 * so the two can be split into separate processes without rewriting either.
 */
@Module({
  controllers: [HealthController],
})
export class AppModule {}
