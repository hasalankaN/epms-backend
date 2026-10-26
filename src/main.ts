import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getAppName } from './common/app-name';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appName = getAppName(app.get(ConfigService));

  // Enable CORS
  // app.enableCors({
  //   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  //   credentials: true,
  // });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);

      const isVercel = /\.vercel\.app$/.test(origin);

      const isCustomFrontend = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;

      if (isLocalhost || isVercel || isCustomFrontend) {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy මඟින් අවහිර කර ඇත'));
      }
    },
    credentials: true,
  });
  // -------------------------------------------------------------

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(`API documentation for ${appName}`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}
bootstrap();
