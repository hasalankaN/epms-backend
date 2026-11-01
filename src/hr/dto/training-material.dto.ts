import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTrainingMaterialDto {
  @ApiProperty({ example: 'Module 1 - Leadership Basics' })
  @IsString() @IsNotEmpty() title: string;

  @ApiProperty({ example: 'trainings/leadership/module1.pdf' })
  @IsString() @IsNotEmpty() file_path: string;
}

export class UpdateTrainingMaterialDto {
  @ApiProperty({ example: 'Module 1 - Leadership Basics (Updated)', required: false })
  title?: string;

  @ApiProperty({ example: 'trainings/leadership/module1_v2.pdf', required: false })
  file_path?: string;
}

