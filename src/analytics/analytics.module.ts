import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Appointment, ConsultationQueue, Doctor])],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }