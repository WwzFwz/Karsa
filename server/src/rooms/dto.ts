/**
 * What the room service accepts, validated before any handler runs.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

const ROOM_CODE = /^[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/
const ACTOR_ID = /^a_[a-z0-9]{6,32}$/

/** Who is asking, as this device knows itself (no accounts). */
export class ActorDto {
  @ApiProperty({ example: 'a_mfq2k0a1b2c3' })
  @Matches(ACTOR_ID)
  actorId!: string

  @ApiProperty({ example: 'Fawwaz' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string

  @ApiProperty({ minimum: 0, maximum: 359 })
  @IsInt()
  @Min(0)
  @Max(359)
  hue!: number
}

export class CreateRoomDto extends ActorDto {
  @ApiProperty({ example: 'Rapat kurikulum' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string

  @ApiProperty({ enum: ['terkunci', 'terbuka'] })
  @IsIn(['terkunci', 'terbuka'])
  access!: 'terkunci' | 'terbuka'

  @ApiPropertyOptional({ description: 'Kode yang sudah ditampilkan di dialog. Diganti bila sudah dipakai.', example: 'RUANG-512' })
  @IsOptional()
  @Matches(ROOM_CODE)
  id?: string
}

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title?: string

  @ApiPropertyOptional({ enum: ['terkunci', 'terbuka'] })
  @IsOptional()
  @IsIn(['terkunci', 'terbuka'])
  access?: 'terkunci' | 'terbuka'
}

export class JoinDto extends ActorDto {
  @ApiProperty({ enum: ['kode', 'tautan'] })
  @IsIn(['kode', 'tautan'])
  via!: 'kode' | 'tautan'
}

export class AnswerDto {
  @ApiProperty({ enum: ['diterima', 'ditolak'] })
  @IsIn(['diterima', 'ditolak'])
  status!: 'diterima' | 'ditolak'
}
