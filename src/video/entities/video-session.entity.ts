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
import { VideoSessionStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('video_sessions')
export class VideoSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    appointmentId: string;

    @Column({ type: 'uuid' })
    doctorId: string;

    @Column({ type: 'uuid' })
    patientId: string;

    @Column({ type: 'varchar', unique: true })
    roomId: string;

    @Column({
        type: 'enum',
        enum: VideoSessionStatus,
        default: VideoSessionStatus.WAITING,
    })
    status: VideoSessionStatus;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    endedAt: Date;

    @Column({ type: 'int', nullable: true })
    durationSeconds: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Appointment)
    @JoinColumn({ name: 'appointmentId' })
    appointment: Relation<Appointment>;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'doctorId' })
    doctor: Relation<User>;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'patientId' })
    patient: Relation<User>;
}