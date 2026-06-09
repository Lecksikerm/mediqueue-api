import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { ConsultationQueue } from './entities/consultation-queue.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsultationQueue, Appointment, Doctor]),
    WebsocketModule,
    JobsModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
