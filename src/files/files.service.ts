import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private storage: Storage;
  private bucketName: string = '';

  constructor(private configService: ConfigService) {
    const credString = this.configService.get<string>('FILE_UPLOADER_SERVICE_ACCOUNT');
    this.bucketName = this.configService.get<string>('GCS_BUCKET') || '';

    if (!credString) {
      this.logger.warn('FILE_UPLOADER_SERVICE_ACCOUNT not configured');
      return;
    }
    if (!this.bucketName) {
      this.logger.warn('GCS_BUCKET not configured');
    }

    try {
      const credentials = JSON.parse(credString);
      this.storage = new Storage({ credentials, projectId: credentials.project_id });
      this.logger.log('Google Cloud Storage client initialized');
    } catch (err) {
      this.logger.error('Failed to initialize GCS client', err as any);
      throw err;
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ filename: string; url: string }> {
    if (!this.storage) throw new Error('GCS client not configured');
    if (!this.bucketName) throw new Error('GCS_BUCKET not configured');

    const filename = `${Date.now()}_${file.originalname}`;
    const bucket = this.storage.bucket(this.bucketName);
    const fileRef = bucket.file(filename);

    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    // Optionally set ACL or make public depending on requirements
    // await fileRef.makePublic();

    // Return a signed URL (read) for the uploaded object. Default expiry is 24 hours.
    const { url } = await this.generateSignedUrl(filename, 24 * 60 * 60);
    return { filename, url };
  }

  async generateSignedUrl(filename: string, expiresInSeconds = 24 * 60 * 60): Promise<{ url: string }> {
    if (!this.storage) throw new Error('GCS client not configured');
    if (!this.bucketName) throw new Error('GCS_BUCKET not configured');

    const file = this.storage.bucket(this.bucketName).file(filename);
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const [url] = await file.getSignedUrl({ action: 'read', expires: expiresAt });
    return { url };
  }
}
