import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getAppName } from './common/app-name';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appName = getAppName(app.get(ConfigService));

  const allowedOrigins = [
    'https://epms-web-rho.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hasavps.ooguy.com', 
  ];

  // CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development'
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

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

// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { ConfigService } from '@nestjs/config';
// import { AppModule } from './app.module';
// import { getAppName } from './common/app-name';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const appName = getAppName(app.get(ConfigService));

//   const allowedOrigins = [
//     'https://epms-web-rho.vercel.app',
//     'http://localhost:5173',
//     'http://localhost:3000',
//   ];

//   app.enableCors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (like mobile apps, Postman, or curl)
//       if (!origin) return callback(null, true);
      
//       if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
//         callback(null, true);
//       } else {
//         callback(new Error('Not allowed by CORS'));
//       }
//     },
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//     credentials: true,
//   });

//   // Enable CORS
//   // app.enableCors({
//   //   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   //   credentials: true,
//   // });

//   // Enable CORS
//   // app.enableCors({
//   //   origin: true, 
//   //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//   //   allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//   //   credentials: true,
//   // });
//   // -------------------------------------------------------------

//   // Global validation pipe
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   // Swagger documentation
//   const config = new DocumentBuilder()
//     .setTitle(`${appName} API`)
//     .setDescription(`API documentation for ${appName}`)
//     .setVersion('1.0')
//     .addBearerAuth()
//     .build();
//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api', app, document);

//   const port = process.env.PORT || 3000;
//   await app.listen(port);
//   console.log(`🚀 Application is running on: http://localhost:${port}`);
//   console.log(`📚 API Documentation: http://localhost:${port}/api`);
// }
// bootstrap();
