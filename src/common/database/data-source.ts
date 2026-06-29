import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { AvailabilitySlot } from '../../availability/entities/availability-slot.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../../queues/entities/consultation-queue.entity';
import { VideoSession } from '../../video/entities/video-session.entity';
import { Payment } from '../../payments/entities/payment.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Doctor,
    AvailabilitySlot,
    Appointment,
    ConsultationQueue,
    VideoSession,
    Payment,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
