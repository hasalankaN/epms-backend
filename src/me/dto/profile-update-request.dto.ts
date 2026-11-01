import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileUpdateRequestDto {
  @ApiProperty({
    example: { first_name: 'Kamal', mobile_no: '+94712345678', city: 'Colombo' },
    description: 'Object with the fields to update in the profile',
  })
  updateData: Record<string, any>;

  @ApiPropertyOptional({ example: 'Changed mobile number and moved to Colombo.' })
  reason?: string;
}

