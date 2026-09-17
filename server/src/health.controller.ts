import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  /** For the container's health check, and for "is the server there at all". */
  @Get()
  check() {
    return { ok: true }
  }
}
