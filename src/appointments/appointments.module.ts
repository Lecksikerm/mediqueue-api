import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, AvailabilitySlot, Doctor])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
