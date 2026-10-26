import { ConfigService } from '@nestjs/config';

export function getAppName(configService: ConfigService): string {
  return configService.get<string>('APP_NAME')?.trim() || 'EPMS';
}