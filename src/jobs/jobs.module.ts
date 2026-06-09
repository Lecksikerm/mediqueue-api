import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AppointmentReminderProcessor } from './processors/appointment-reminder.processor';
import { DailySlotsProcessor } from './processors/daily-slots.processor';
import { QueueRecalculationProcessor } from './processors/queue-recalculation.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'appointment-reminders' },
      { name: 'queue-recalculation' },
      { name: 'daily-slots' },
    ),
    TypeOrmModule.forFeature([
      Appointment,
      AvailabilitySlot,
      Doctor,
      ConsultationQueue,
    ]),
    WebsocketModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    AppointmentReminderProcessor,
    DailySlotsProcessor,
    QueueRecalculationProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
