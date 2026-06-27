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
import { PaymentStatus, PaymentCurrency } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    patientId: string;

    @Column({ type: 'uuid' })
    appointmentId: string;

    @Column({ type: 'varchar', unique: true })
    reference: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: PaymentCurrency,
        default: PaymentCurrency.NGN,
    })
    currency: PaymentCurrency;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Column({ type: 'varchar', nullable: true })
    paystackReference: string;

    @Column({ type: 'varchar', nullable: true })
    authorizationUrl: string;

    @Column({ type: 'varchar', nullable: true })
    channel: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'patientId' })
    patient: Relation<User>;

    @ManyToOne(() => Appointment)
    @JoinColumn({ name: 'appointmentId' })
    appointment: Relation<Appointment>;
}