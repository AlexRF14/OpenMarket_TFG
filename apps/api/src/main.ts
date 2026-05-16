import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody:true expone req.rawBody — necesario para verificar la firma de Stripe
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // /webhook queda fuera del prefix porque `stripe listen --forward-to localhost:3001/webhook`
  // apunta a la raíz por defecto.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'webhook', method: RequestMethod.POST }],
  });

  // Cookie parser — necesario para leer el refresh token de httpOnly cookie
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // TODO: configurar CORS con lista de orígenes permitidos en producción
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OpenMarket API')
    .setDescription('API del marketplace digital')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API corriendo en http://localhost:${port}/api/v1`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
