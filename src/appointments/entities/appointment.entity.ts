import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AppointmentStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { AvailabilitySlot } from '../../availability/entities/availability-slot.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid' })
  doctorId: string;

  @Column({ type: 'uuid' })
  slotId: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.appointments)
  @JoinColumn({ name: 'patientId' })
  patient: Relation<User>;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
  @JoinColumn({ name: 'doctorId' })
  doctor: Relation<Doctor>;

  @OneToOne(() => AvailabilitySlot, (slot) => slot.appointment)
  @JoinColumn({ name: 'slotId' })
  slot: Relation<AvailabilitySlot>;
}
