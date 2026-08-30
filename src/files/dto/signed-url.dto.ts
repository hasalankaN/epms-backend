import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SignedUrlDto {
  @ApiProperty({ description: 'Filename (path) of the existing object in GCS' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Expiration in seconds (default 86400 = 24 hours)', required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  expiresInSeconds?: number;
}
