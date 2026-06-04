import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { QueueStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';

@Entity('consultation_queue')
export class ConsultationQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  doctorId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  appointmentId: string;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status: QueueStatus;

  @Column({ type: 'int', nullable: true })
  estimatedWaitMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.queueEntries)
  @JoinColumn({ name: 'patientId' })
  patient: Relation<User>;

  @ManyToOne(() => Doctor, (doctor) => doctor.queueEntries)
  @JoinColumn({ name: 'doctorId' })
  doctor: Relation<Doctor>;
}
