import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AppointmentStatus, QueueStatus } from '../common/enums';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(ConsultationQueue)
        private readonly queueRepository: Repository<ConsultationQueue>,
        @InjectRepository(Doctor)
        private readonly doctorRepository: Repository<Doctor>,
    ) { }

    // ─── Doctor's Own Analytics ──────────────────────────────────
    async getDoctorAnalytics(userId: string, dto: AnalyticsQueryDto) {
        const doctor = await this.doctorRepository.findOne({ where: { userId } });
        if (!doctor) return { message: 'Doctor profile not found' };

        const queryBuilder = this.appointmentRepository
            .createQueryBuilder('appointment')
            .where('appointment.doctorId = :doctorId', { doctorId: doctor.id });

        if (dto.from) {
            queryBuilder.andWhere('appointment.createdAt >= :from', {
                from: new Date(dto.from),
            });
        }

        if (dto.to) {
            queryBuilder.andWhere('appointment.createdAt <= :to', {
                to: new Date(dto.to),
            });
        }

        const [
            total,
            completed,
            cancelled,
            noShow,
            booked,
            inProgress,
        ] = await Promise.all([
            queryBuilder.getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', {
                    s: AppointmentStatus.COMPLETED,
                })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', {
                    s: AppointmentStatus.CANCELLED,
                })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', { s: AppointmentStatus.NO_SHOW })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', { s: AppointmentStatus.BOOKED })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', {
                    s: AppointmentStatus.IN_PROGRESS,
                })
                .getCount(),
        ]);

        // Queue stats
        const totalQueued = await this.queueRepository.count({
            where: { doctorId: doctor.id },
        });

        const completedToday = await this.queueRepository
            .createQueryBuilder('q')
            .where('q.doctorId = :doctorId', { doctorId: doctor.id })
            .andWhere('q.status = :status', { status: QueueStatus.COMPLETED })
            .andWhere('DATE(q.updatedAt) = CURRENT_DATE')
            .getCount();

        // Monthly breakdown
        const monthlyBreakdown = await this.appointmentRepository
            .createQueryBuilder('appointment')
            .select("DATE_TRUNC('month', appointment.createdAt)", 'month')
            .addSelect('COUNT(*)', 'total')
            .addSelect(
                `SUM(CASE WHEN appointment.status = 'completed' THEN 1 ELSE 0 END)`,
                'completed',
            )
            .where('appointment.doctorId = :doctorId', { doctorId: doctor.id })
            .groupBy("DATE_TRUNC('month', appointment.createdAt)")
            .orderBy("DATE_TRUNC('month', appointment.createdAt)", 'DESC')
            .limit(6)
            .getRawMany();

        return {
            summary: {
                totalAppointments: total,
                completed,
                cancelled,
                noShow,
                booked,
                inProgress,
                completionRate:
                    total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '0%',
                noShowRate:
                    total > 0 ? `${((noShow / total) * 100).toFixed(1)}%` : '0%',
            },
            queue: {
                totalQueued,
                completedToday,
            },
            monthlyBreakdown: monthlyBreakdown.map((row) => ({
                month: row.month,
                total: parseInt(row.total),
                completed: parseInt(row.completed),
            })),
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Patient's Own Analytics ─────────────────────────────────
    async getPatientAnalytics(patientId: string, dto: AnalyticsQueryDto) {
        const queryBuilder = this.appointmentRepository
            .createQueryBuilder('appointment')
            .where('appointment.patientId = :patientId', { patientId });

        if (dto.from) {
            queryBuilder.andWhere('appointment.createdAt >= :from', {
                from: new Date(dto.from),
            });
        }

        if (dto.to) {
            queryBuilder.andWhere('appointment.createdAt <= :to', {
                to: new Date(dto.to),
            });
        }

        const [total, completed, cancelled, noShow, upcoming] = await Promise.all([
            queryBuilder.getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', {
                    s: AppointmentStatus.COMPLETED,
                })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', {
                    s: AppointmentStatus.CANCELLED,
                })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status = :s', { s: AppointmentStatus.NO_SHOW })
                .getCount(),
            queryBuilder
                .clone()
                .andWhere('appointment.status IN (:...statuses)', {
                    statuses: [AppointmentStatus.BOOKED, AppointmentStatus.WAITING],
                })
                .getCount(),
        ]);

        return {
            summary: {
                totalAppointments: total,
                completed,
                cancelled,
                noShow,
                upcoming,
                attendanceRate:
                    total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '0%',
            },
            generatedAt: new Date().toISOString(),
        };
    }
}