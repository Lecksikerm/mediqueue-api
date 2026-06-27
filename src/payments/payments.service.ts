import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Payment } from './entities/payment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationDto } from '../common/pagination/pagination.dto';
import {
    AppointmentStatus,
    PaymentStatus,
    PaymentCurrency,
} from '../common/enums';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private readonly paystackBaseUrl = 'https://api.paystack.co';

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(Doctor)
        private readonly doctorRepository: Repository<Doctor>,
        private readonly configService: ConfigService,
    ) { }

    // ─── Paystack API headers ────────────────────────────────────
    private get paystackHeaders() {
        return {
            Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}`,
            'Content-Type': 'application/json',
        };
    }

    // ─── Generate unique payment reference ───────────────────────
    private generateReference(): string {
        return `mq_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    }

    // ─── Initiate Payment ────────────────────────────────────────
    async initiatePayment(patientId: string, dto: InitiatePaymentDto) {
        const appointment = await this.appointmentRepository.findOne({
            where: { id: dto.appointmentId, patientId },
            relations: { patient: true },
        });

        if (!appointment) throw new NotFoundException('Appointment not found');

        if (appointment.status === AppointmentStatus.CANCELLED) {
            throw new BadRequestException('Cannot pay for a cancelled appointment');
        }

        if (appointment.status === AppointmentStatus.COMPLETED) {
            throw new BadRequestException(
                'This appointment has already been completed',
            );
        }

        // Check if already paid
        const existingPayment = await this.paymentRepository.findOne({
            where: {
                appointmentId: dto.appointmentId,
                status: PaymentStatus.SUCCESS,
            },
        });

        if (existingPayment) {
            throw new BadRequestException(
                'This appointment has already been paid for',
            );
        }

        // Get consultation fee from doctor profile
        const doctor = await this.doctorRepository.findOne({
            where: { id: appointment.doctorId },
            relations: { user: true },
        });

        if (!doctor) throw new NotFoundException('Doctor not found');

        const amount = Number(doctor.consultationFee);

        if (amount <= 0) {
            throw new BadRequestException('Invalid consultation fee');
        }

        const reference = this.generateReference();

        // Create pending payment record
        const payment = this.paymentRepository.create({
            patientId,
            appointmentId: dto.appointmentId,
            reference,
            amount,
            currency: PaymentCurrency.NGN,
            status: PaymentStatus.PENDING,
            metadata: {
                doctorName: doctor.user.name,
                specialization: doctor.specialization,
                appointmentId: dto.appointmentId,
            },
        });

        await this.paymentRepository.save(payment);

        // Initialize transaction on Paystack
        try {
            const response = await axios.post(
                `${this.paystackBaseUrl}/transaction/initialize`,
                {
                    email: appointment.patient.email,
                    amount: amount * 100, // Paystack uses kobo
                    reference,
                    currency: 'NGN',
                    callback_url: this.configService.get<string>(
                        'PAYSTACK_CALLBACK_URL',
                    ),
                    metadata: {
                        custom_fields: [
                            {
                                display_name: 'Patient Name',
                                variable_name: 'patient_name',
                                value: appointment.patient.name,
                            },
                            {
                                display_name: 'Doctor',
                                variable_name: 'doctor_name',
                                value: doctor.user.name,
                            },
                            {
                                display_name: 'Appointment ID',
                                variable_name: 'appointment_id',
                                value: dto.appointmentId,
                            },
                        ],
                    },
                },
                { headers: this.paystackHeaders },
            );

            const { authorization_url, access_code } = response.data.data;

            // Save authorization URL
            await this.paymentRepository.update(payment.id, {
                authorizationUrl: authorization_url,
                paystackReference: reference,
            });

            return {
                message: 'Payment initiated successfully',
                payment: {
                    id: payment.id,
                    reference,
                    amount: `₦${amount.toLocaleString()}`,
                    currency: 'NGN',
                    status: PaymentStatus.PENDING,
                },
                paystack: {
                    authorizationUrl: authorization_url,
                    accessCode: access_code,
                    reference,
                },
                instruction:
                    'Redirect the user to authorizationUrl to complete payment',
            };
        } catch (error) {
            await this.paymentRepository.update(payment.id, {
                status: PaymentStatus.FAILED,
            });

            this.logger.error('Paystack initialization failed', error.message);
            throw new BadRequestException(
                'Payment initialization failed. Try again.',
            );
        }
    }

    // ─── Verify Payment ──────────────────────────────────────────
    async verifyPayment(reference: string) {
        const payment = await this.paymentRepository.findOne({
            where: { reference },
            relations: { patient: true, appointment: true },
        });

        if (!payment) throw new NotFoundException('Payment record not found');

        if (payment.status === PaymentStatus.SUCCESS) {
            return {
                message: 'Payment already verified',
                payment: this.formatPayment(payment),
            };
        }

        try {
            const response = await axios.get(
                `${this.paystackBaseUrl}/transaction/verify/${reference}`,
                { headers: this.paystackHeaders },
            );

            const { status, paid_at, channel, amount } = response.data.data;

            if (status === 'success') {
                const updatedMetadata = {
                    ...(payment.metadata || {}),
                    paystackAmount: String(amount / 100),
                    verifiedAt: new Date().toISOString(),
                };

                await this.paymentRepository.update(payment.id, {
                    status: PaymentStatus.SUCCESS,
                    paidAt: new Date(paid_at),
                    channel,
                    metadata: updatedMetadata as any,
                });

                this.logger.log(`Payment verified successfully — ref: ${reference}`);

                return {
                    message: 'Payment verified successfully',
                    payment: {
                        ...this.formatPayment(payment),
                        status: PaymentStatus.SUCCESS,
                        paidAt: new Date(paid_at),
                        channel,
                    },
                };
            } else {
                await this.paymentRepository.update(payment.id, {
                    status: PaymentStatus.FAILED,
                });

                throw new BadRequestException(
                    `Payment was not successful. Status: ${status}`,
                );
            }
        } catch (error) {
            if (error instanceof BadRequestException) throw error;

            this.logger.error('Paystack verification failed', error.message);
            throw new BadRequestException('Payment verification failed. Try again.');
        }
    }

    // ─── Paystack Webhook ────────────────────────────────────────
    async handleWebhook(payload: any, signature: string) {
        const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');

        const hash = crypto
            .createHmac('sha512', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn('Invalid Paystack webhook signature');
            throw new BadRequestException('Invalid webhook signature');
        }

        const { event, data } = payload;
        this.logger.log(`Webhook received: ${event}`);

        if (event === 'charge.success') {
            const { reference, paid_at, channel } = data;

            const payment = await this.paymentRepository.findOne({
                where: { reference },
            });

            if (payment && payment.status !== PaymentStatus.SUCCESS) {
                await this.paymentRepository.update(payment.id, {
                    status: PaymentStatus.SUCCESS,
                    paidAt: new Date(paid_at),
                    channel,
                });

                this.logger.log(
                    `Webhook: payment ${reference} marked as successful`,
                );
            }
        }

        return { received: true };
    }

    // ─── Get my payments (Patient) ───────────────────────────────
    async getMyPayments(patientId: string, dto: PaginationDto) {
        const result = await paginate(this.paymentRepository, dto, {
            where: { patientId },
            relations: { appointment: true },
            order: { createdAt: 'DESC' },
        });

        return {
            ...result,
            data: result.data.map((p) => this.formatPayment(p)),
        };
    }

    // ─── Get payment by reference ────────────────────────────────
    async getPaymentByReference(reference: string, patientId: string) {
        const payment = await this.paymentRepository.findOne({
            where: { reference, patientId },
            relations: { appointment: true },
        });

        if (!payment) throw new NotFoundException('Payment not found');

        return this.formatPayment(payment);
    }

    // ─── Get payment for appointment ────────────────────────────
    async getAppointmentPayment(appointmentId: string, patientId: string) {
        const payment = await this.paymentRepository.findOne({
            where: { appointmentId, patientId },
            order: { createdAt: 'DESC' },
        });

        if (!payment) {
            throw new NotFoundException(
                'No payment found for this appointment',
            );
        }

        return this.formatPayment(payment);
    }

    // ─── Admin: Get all payments ─────────────────────────────────
    async adminGetAllPayments(dto: PaginationDto) {
        const result = await paginate(this.paymentRepository, dto, {
            relations: { patient: true, appointment: true },
            order: { createdAt: 'DESC' },
        });

        return {
            ...result,
            data: result.data.map((p) => ({
                ...this.formatPayment(p),
                patient: p.patient
                    ? {
                        id: p.patient.id,
                        name: p.patient.name,
                        email: p.patient.email,
                    }
                    : null,
            })),
        };
    }

    // ─── Admin: Get payment stats ────────────────────────────────
    async adminGetPaymentStats() {
        const [
            totalPayments,
            successfulPayments,
            failedPayments,
            pendingPayments,
        ] = await Promise.all([
            this.paymentRepository.count(),
            this.paymentRepository.count({
                where: { status: PaymentStatus.SUCCESS },
            }),
            this.paymentRepository.count({
                where: { status: PaymentStatus.FAILED },
            }),
            this.paymentRepository.count({
                where: { status: PaymentStatus.PENDING },
            }),
        ]);

        const revenueResult = await this.paymentRepository
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'total')
            .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
            .getRawOne();

        const totalRevenue = Number(revenueResult?.total || 0);

        const monthlyRevenue = await this.paymentRepository
            .createQueryBuilder('payment')
            .select("DATE_TRUNC('month', payment.paidAt)", 'month')
            .addSelect('SUM(payment.amount)', 'revenue')
            .addSelect('COUNT(*)', 'count')
            .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
            .groupBy("DATE_TRUNC('month', payment.paidAt)")
            .orderBy("DATE_TRUNC('month', payment.paidAt)", 'DESC')
            .limit(6)
            .getRawMany();

        return {
            summary: {
                totalPayments,
                successfulPayments,
                failedPayments,
                pendingPayments,
                totalRevenue: `₦${totalRevenue.toLocaleString()}`,
                successRate:
                    totalPayments > 0
                        ? `${((successfulPayments / totalPayments) * 100).toFixed(1)}%`
                        : '0%',
            },
            monthlyRevenue: monthlyRevenue.map((row) => ({
                month: row.month,
                revenue: `₦${Number(row.revenue).toLocaleString()}`,
                count: parseInt(row.count),
            })),
        };
    }

    private formatPayment(payment: Payment) {
        return {
            id: payment.id,
            reference: payment.reference,
            amount: `₦${Number(payment.amount).toLocaleString()}`,
            rawAmount: Number(payment.amount),
            currency: payment.currency,
            status: payment.status,
            channel: payment.channel,
            metadata: payment.metadata,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
            appointmentId: payment.appointmentId,
        };
    }
}