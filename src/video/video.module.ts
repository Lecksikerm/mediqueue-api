import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { VideoGateway } from './video.gateway';
import { VideoSession } from './entities/video-session.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([VideoSession, Appointment, Doctor]),
    ],
    controllers: [VideoController],
    providers: [VideoService, VideoGateway],
    exports: [VideoService],
})
export class VideoModule { }