import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../../queues/entities/consultation-queue.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Doctor, (doctor) => doctor.user, { nullable: true })
  doctor: Relation<Doctor>;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Relation<Appointment[]>;

  @OneToMany(() => ConsultationQueue, (queue) => queue.patient)
  queueEntries: Relation<ConsultationQueue[]>;
}
