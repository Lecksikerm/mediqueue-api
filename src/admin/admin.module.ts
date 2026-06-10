import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Doctor,
      Appointment,
      ConsultationQueue,
      AvailabilitySlot,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}