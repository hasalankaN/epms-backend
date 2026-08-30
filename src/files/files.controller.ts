import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { SignedUrlDto } from './dto/signed-url.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const result = await this.filesService.uploadFile(file);
    return { success: true, ...result };
  }

  @Post('signed-url')
  @ApiOperation({ summary: 'Generate signed URL for an existing GCS object' })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  async signedUrl(@Body() body: SignedUrlDto) {
    const { filename, expiresInSeconds } = body;
    if (!filename) throw new BadRequestException('filename is required');
    const result = await this.filesService.generateSignedUrl(filename, expiresInSeconds);
    return { success: true, ...result };
  }
}
