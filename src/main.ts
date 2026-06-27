import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // ─── Swagger Setup ───────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('MediQueue API')
    .setDescription(
      `
      Production-grade Teleconsultation Booking & Real-Time Queue Management API.

      ## Authentication
      This API uses **JWT Bearer tokens**. After logging in, copy the \`accessToken\`
      from the response, click **Authorize** above and paste it as: \`Bearer <token>\`

      ## Roles
      - **Patient** — book appointments, join queue, track position
      - **Doctor** — manage availability, handle consultations
      - **Admin** — system management, analytics, reports
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Registration, login, token refresh, password reset')
    .addTag('Users', 'User profile management')
    .addTag('Doctors', 'Doctor profile and status management')
    .addTag('Availability', 'Doctor slot scheduling')
    .addTag('Appointments', 'Booking, cancellation, consultation flow')
    .addTag('Queues', 'Real-time queue management')
    .addTag('Admin', 'System administration and reports')
    .addTag('Analytics', 'Performance and usage analytics')
    .addTag('Jobs', 'Background job management')
    .addTag('Payments', 'Paystack payment initiation, verification and history')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,       
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'MediQueue API Docs',
  });

  await app.listen(port);
  console.log(`MediQueue API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger Docs available at http://localhost:${port}/api/docs`);
}
bootstrap();