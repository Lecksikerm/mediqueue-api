import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { DoctorStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { AvailabilitySlot } from '../../availability/entities/availability-slot.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../../queues/entities/consultation-queue.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  specialization: string;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  consultationFee: number;

  @Column({ type: 'simple-array', nullable: true })
  languagesSpoken: string[];

  @Column({ type: 'varchar', nullable: true })
  bio: string;

  @Column({ type: 'enum', enum: DoctorStatus, default: DoctorStatus.ACTIVE })
  status: DoctorStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.doctor)
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @OneToMany(() => AvailabilitySlot, (slot) => slot.doctor)
  availabilitySlots: Relation<AvailabilitySlot[]>;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Relation<Appointment[]>;

  @OneToMany(() => ConsultationQueue, (queue) => queue.doctor)
  queueEntries: Relation<ConsultationQueue[]>;
}
