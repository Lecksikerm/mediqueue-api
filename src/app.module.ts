import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from './common/database/database.config';
import { CommonModule } from './common/common.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { QueuesModule } from './queues/queues.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebsocketModule } from './websocket/websocket.module';
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { VideoModule } from './video/video.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';

        return {
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
            ...(redisPassword ? { password: redisPassword } : {}),
            ...(isProduction ? { tls: {} } : {}),
          },
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    CommonModule,
    RedisModule,
    MailModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    AvailabilityModule,
    WebsocketModule,
    JobsModule,
    AppointmentsModule,
    QueuesModule,
    NotificationsModule,
    AdminModule,
    AnalyticsModule,
    VideoModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}