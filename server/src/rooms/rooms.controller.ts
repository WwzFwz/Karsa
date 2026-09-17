import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  ConflictException,
  Param,
  Patch,
  Post,
  Query,
  Ip,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Member, Tokens } from '../auth/token.js'
import { AnswerDto, CreateRoomDto, JoinDto, UpdateRoomDto } from './dto.js'
import { RoomError, RoomsService } from './rooms.service.js'

export const ROOMS_SERVICE = 'ROOMS_SERVICE'
export const TOKENS = 'TOKENS'

@ApiTags('ruang')
@Controller('rooms')
export class RoomsController {
  constructor(
    @Inject(ROOMS_SERVICE) private readonly rooms: RoomsService,
    @Inject(TOKENS) private readonly tokens: Tokens,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Buat ruang. Pembuatnya langsung mendapat token.' })
  create(@Body() body: CreateRoomDto) {
    return guard(() => this.rooms.create(body))
  }

  @Get()
  @ApiOperation({ summary: 'Kartu dasbor untuk kode-kode yang diingat perangkat ini.' })
  list(@Query('ids') ids = '') {
    return this.rooms.list(ids.split(',').map((id) => id.trim()).filter(Boolean))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Info ruang: ada atau tidak, judul, akses.' })
  get(@Param('id') id: string) {
    return guard(() => this.rooms.get(id))
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ganti judul atau akses. Hanya peserta.' })
  update(@Param('id') id: string, @Body() body: UpdateRoomDto, @Headers('authorization') auth?: string) {
    return guard(() => this.rooms.update(id, this.member(auth, id), body))
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Masuk. Ruang terbuka memberi token; ruang terkunci memberi nomor antrean.' })
  join(@Param('id') id: string, @Body() body: JoinDto, @Ip() ip: string) {
    return guard(() => this.rooms.join(id, body, ip))
  }

  @Get(':id/join/:requestId')
  @ApiOperation({ summary: 'Dicek berkala oleh yang menunggu di pintu.' })
  status(@Param('id') id: string, @Param('requestId') requestId: string, @Query('actorId') actorId = '') {
    return guard(() => this.rooms.requestStatus(id, requestId, actorId))
  }

  @Delete(':id/join/:requestId')
  @ApiOperation({ summary: 'Berhenti menunggu.' })
  withdraw(@Param('id') id: string, @Param('requestId') requestId: string, @Query('actorId') actorId = '') {
    return guard(() => this.rooms.withdraw(id, requestId, actorId))
  }

  @Get(':id/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yang menunggu dan yang sudah dijawab. Hanya peserta.' })
  requests(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return guard(() => this.rooms.listRequests(id, this.member(auth, id)))
  }

  @Post(':id/requests/:requestId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terima atau tolak. Semua peserta boleh.' })
  answer(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() body: AnswerDto,
    @Headers('authorization') auth?: string,
  ) {
    return guard(() => this.rooms.answer(id, requestId, body.status, this.member(auth, id)))
  }

  private member(auth: string | undefined, id: string): Member {
    const member = this.tokens.verify(auth?.replace(/^Bearer\s+/i, ''), id)
    if (!member) throw new ForbiddenException('Hanya peserta ruang ini yang boleh melakukannya.')
    return member
  }
}

/** Domain errors become HTTP answers with the same sentence. */
function guard<T>(run: () => T): T {
  try {
    return run()
  } catch (error) {
    if (!(error instanceof RoomError)) throw error
    if (error.kind === 'tidak-ada') throw new NotFoundException(error.message)
    if (error.kind === 'dilarang') throw new ForbiddenException(error.message)
    if (error.kind === 'bentrok') throw new ConflictException(error.message)
    throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS)
  }
}
