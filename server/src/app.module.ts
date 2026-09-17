import { Module, type DynamicModule } from '@nestjs/common'
import type { Tokens } from './auth/token.js'
import { HealthController } from './health.controller.js'
import { ROOMS_SERVICE, RoomsController, TOKENS } from './rooms/rooms.controller.js'
import type { RoomsService } from './rooms/rooms.service.js'

/**
 * The room service. Its collaborators are built in main.ts, beside sync, and
 * handed in here -- so the two can be split into separate processes later
 * without rewriting either (D76).
 */
@Module({})
export class AppModule {
  static register(deps: { rooms: RoomsService; tokens: Tokens }): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, RoomsController],
      providers: [
        { provide: ROOMS_SERVICE, useValue: deps.rooms },
        { provide: TOKENS, useValue: deps.tokens },
      ],
    }
  }
}
