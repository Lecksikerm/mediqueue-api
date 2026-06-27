import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { AppointmentReminderProcessor } from './processors/appointment-reminder.processor';
import { QueueRecalculationProcessor } from './processors/queue-recalculation.processor';
import { DailySlotsProcessor } from './processors/daily-slots.processor';
import { WelcomeEmailProcessor } from './processors/welcome-email.processor';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'appointment-reminders' },
      { name: 'queue-recalculation' },
      { name: 'daily-slots' },
      { name: 'welcome-emails' },
    ),
    TypeOrmModule.forFeature([
      Appointment,
      ConsultationQueue,
      AvailabilitySlot,
      Doctor,
    ]),
    WebsocketModule,
    MailModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    AppointmentReminderProcessor,
    QueueRecalculationProcessor,
    DailySlotsProcessor,
    WelcomeEmailProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}