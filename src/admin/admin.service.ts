import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ConsultationQueue } from '../queues/entities/consultation-queue.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';
import { RedisService } from '../common/redis/redis.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import {
    UserRole,
    AppointmentStatus,
    DoctorStatus,
    QueueStatus,
} from '../common/enums';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Doctor)
        private readonly doctorRepository: Repository<Doctor>,
        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(ConsultationQueue)
        private readonly queueRepository: Repository<ConsultationQueue>,
        @InjectRepository(AvailabilitySlot)
        private readonly slotRepository: Repository<AvailabilitySlot>,
        private readonly redisService: RedisService,
    ) { }

    // ─── System Overview ─────────────────────────────────────────
    async getSystemOverview() {
        const [
            totalUsers,
            totalPatients,
            totalDoctors,
            totalAdmins,
            activeDoctors,
            inactiveDoctors,
            onLeaveDoctors,
            totalAppointments,
            bookedAppointments,
            completedAppointments,
            cancelledAppointments,
            noShowAppointments,
            activeQueueEntries,
            totalSlots,
            availableSlots,
            bookedSlots,
        ] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { role: UserRole.PATIENT } }),
            this.userRepository.count({ where: { role: UserRole.DOCTOR } }),
            this.userRepository.count({ where: { role: UserRole.ADMIN } }),
            this.doctorRepository.count({ where: { status: DoctorStatus.ACTIVE } }),
            this.doctorRepository.count({ where: { status: DoctorStatus.INACTIVE } }),
            this.doctorRepository.count({ where: { status: DoctorStatus.ON_LEAVE } }),
            this.appointmentRepository.count(),
            this.appointmentRepository.count({
                where: { status: AppointmentStatus.BOOKED },
            }),
            this.appointmentRepository.count({
                where: { status: AppointmentStatus.COMPLETED },
            }),
            this.appointmentRepository.count({
                where: { status: AppointmentStatus.CANCELLED },
            }),
            this.appointmentRepository.count({
                where: { status: AppointmentStatus.NO_SHOW },
            }),
            this.queueRepository.count({ where: { status: QueueStatus.WAITING } }),
            this.slotRepository.count(),
            this.slotRepository.count({ where: { status: 'available' as any } }),
            this.slotRepository.count({ where: { status: 'booked' as any } }),
        ]);

        const appointmentCompletionRate =
            totalAppointments > 0
                ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
                : '0';

        const noShowRate =
            totalAppointments > 0
                ? ((noShowAppointments / totalAppointments) * 100).toFixed(1)
                : '0';

        return {
            users: {
                total: totalUsers,
                patients: totalPatients,
                doctors: totalDoctors,
                admins: totalAdmins,
                activeUsers: await this.userRepository.count({
                    where: { isActive: true },
                }),
                inactiveUsers: await this.userRepository.count({
                    where: { isActive: false },
                }),
            },
            doctors: {
                total: totalDoctors,
                active: activeDoctors,
                inactive: inactiveDoctors,
                onLeave: onLeaveDoctors,
            },
            appointments: {
                total: totalAppointments,
                booked: bookedAppointments,
                completed: completedAppointments,
                cancelled: cancelledAppointments,
                noShow: noShowAppointments,
                completionRate: `${appointmentCompletionRate}%`,
                noShowRate: `${noShowRate}%`,
            },
            queues: {
                currentlyWaiting: activeQueueEntries,
            },
            slots: {
                total: totalSlots,
                available: availableSlots,
                booked: bookedSlots,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── User Growth Stats ───────────────────────────────────────
    async getUserGrowth(dto: AdminQueryDto) {
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .select("DATE_TRUNC('day', user.createdAt)", 'date')
            .addSelect('COUNT(*)', 'count')
            .addSelect('user.role', 'role');

        if (dto.from) {
            queryBuilder.andWhere('user.createdAt >= :from', {
                from: new Date(dto.from),
            });
        }

        if (dto.to) {
            queryBuilder.andWhere('user.createdAt <= :to', {
                to: new Date(dto.to),
            });
        }

        queryBuilder.groupBy("DATE_TRUNC('day', user.createdAt), user.role");
        queryBuilder.orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC');

        const raw = await queryBuilder.getRawMany();

        return {
            data: raw.map((row) => ({
                date: row.date,
                role: row.role,
                count: parseInt(row.count),
            })),
        };
    }

    // ─── Appointment Stats Over Time ─────────────────────────────
    async getAppointmentStats(dto: AdminQueryDto) {
        const queryBuilder = this.appointmentRepository
            .createQueryBuilder('appointment')
            .select("DATE_TRUNC('day', appointment.createdAt)", 'date')
            .addSelect('appointment.status', 'status')
            .addSelect('COUNT(*)', 'count');

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

        queryBuilder.groupBy(
            "DATE_TRUNC('day', appointment.createdAt), appointment.status",
        );
        queryBuilder.orderBy("DATE_TRUNC('day', appointment.createdAt)", 'ASC');

        const raw = await queryBuilder.getRawMany();

        return {
            data: raw.map((row) => ({
                date: row.date,
                status: row.status,
                count: parseInt(row.count),
            })),
        };
    }

    // ─── Doctor Performance ──────────────────────────────────────
    async getDoctorPerformance(dto: AdminQueryDto) {
        const queryBuilder = this.appointmentRepository
            .createQueryBuilder('appointment')
            .leftJoin('appointment.doctor', 'doctor')
            .leftJoin('doctor.user', 'user')
            .select('doctor.id', 'doctorId')
            .addSelect('user.name', 'doctorName')
            .addSelect('doctor.specialization', 'specialization')
            .addSelect('COUNT(*)', 'totalAppointments')
            .addSelect(
                `SUM(CASE WHEN appointment.status = 'completed' THEN 1 ELSE 0 END)`,
                'completed',
            )
            .addSelect(
                `SUM(CASE WHEN appointment.status = 'cancelled' THEN 1 ELSE 0 END)`,
                'cancelled',
            )
            .addSelect(
                `SUM(CASE WHEN appointment.status = 'no_show' THEN 1 ELSE 0 END)`,
                'noShow',
            )
            .addSelect(
                `ROUND(
          SUM(CASE WHEN appointment.status = 'completed' THEN 1 ELSE 0 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 1
        )`,
                'completionRate',
            );

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

        queryBuilder
            .groupBy('doctor.id, user.name, doctor.specialization')
            .orderBy('totalAppointments', 'DESC');

        const page = dto.page ?? 1;
        const limit = dto.limit ?? 10;
        queryBuilder.skip((page - 1) * limit).take(limit);

        const raw = await queryBuilder.getRawMany();

        return {
            data: raw.map((row) => ({
                doctorId: row.doctorId,
                doctorName: row.doctorName,
                specialization: row.specialization,
                totalAppointments: parseInt(row.totalAppointments),
                completed: parseInt(row.completed),
                cancelled: parseInt(row.cancelled),
                noShow: parseInt(row.noShow),
                completionRate: `${row.completionRate ?? 0}%`,
            })),
            meta: { page, limit },
        };
    }

    // ─── Revenue Report ──────────────────────────────────────────
    async getRevenueReport(dto: AdminQueryDto) {
        const queryBuilder = this.appointmentRepository
            .createQueryBuilder('appointment')
            .leftJoin('appointment.doctor', 'doctor')
            .leftJoin('doctor.user', 'user')
            .select("DATE_TRUNC('month', appointment.createdAt)", 'month')
            .addSelect('doctor.id', 'doctorId')
            .addSelect('user.name', 'doctorName')
            .addSelect('doctor.specialization', 'specialization')
            .addSelect('doctor.consultationFee', 'fee')
            .addSelect('COUNT(*)', 'totalAppointments')
            .addSelect(
                `SUM(CASE WHEN appointment.status = 'completed'
          THEN doctor.consultationFee ELSE 0 END)`,
                'totalRevenue',
            )
            .where(`appointment.status = 'completed'`);

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

        queryBuilder
            .groupBy(
                "DATE_TRUNC('month', appointment.createdAt), doctor.id, user.name, doctor.specialization, doctor.consultationFee",
            )
            .orderBy("DATE_TRUNC('month', appointment.createdAt)", 'DESC');

        const raw = await queryBuilder.getRawMany();

        const totalRevenue = raw.reduce(
            (sum, row) => sum + parseFloat(row.totalRevenue || 0),
            0,
        );

        return {
            summary: {
                totalRevenue: `₦${totalRevenue.toLocaleString()}`,
                totalCompletedAppointments: raw.reduce(
                    (sum, row) => sum + parseInt(row.totalAppointments),
                    0,
                ),
            },
            data: raw.map((row) => ({
                month: row.month,
                doctorId: row.doctorId,
                doctorName: row.doctorName,
                specialization: row.specialization,
                consultationFee: `₦${parseFloat(row.fee).toLocaleString()}`,
                completedAppointments: parseInt(row.totalAppointments),
                revenue: `₦${parseFloat(row.totalRevenue || 0).toLocaleString()}`,
            })),
        };
    }

    // ─── Live Queue Overview ─────────────────────────────────────
    async getLiveQueueOverview() {
        const activeDoctors = await this.doctorRepository.find({
            where: { status: DoctorStatus.ACTIVE },
            relations: { user: true },
        });

        const queueOverview = await Promise.all(
            activeDoctors.map(async (doctor) => {
                const liveCount = await this.redisService.getQueueLength(doctor.id);
                const waitingInDb = await this.queueRepository.count({
                    where: { doctorId: doctor.id, status: QueueStatus.WAITING },
                });

                return {
                    doctorId: doctor.id,
                    doctorName: doctor.user.name,
                    specialization: doctor.specialization,
                    status: doctor.status,
                    liveQueueCount: liveCount,
                    waitingCount: waitingInDb,
                    estimatedClearTime:
                        liveCount === 0 ? 'Queue empty' : `~${liveCount * 15} minutes`,
                };
            }),
        );

        return {
            totalDoctorsActive: activeDoctors.length,
            totalPatientsWaiting: queueOverview.reduce(
                (sum, d) => sum + d.waitingCount,
                0,
            ),
            doctors: queueOverview.sort((a, b) => b.liveQueueCount - a.liveQueueCount),
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Suspend / Unsuspend Doctor ──────────────────────────────
    async suspendDoctor(doctorId: string) {
        const doctor = await this.doctorRepository.findOne({
            where: { id: doctorId },
            relations: { user: true },
        });

        if (!doctor) throw new NotFoundException('Doctor not found');

        await this.doctorRepository.update(doctorId, {
            status: DoctorStatus.INACTIVE,
        });

        await this.userRepository.update(doctor.userId, {
            isActive: false,
            refreshToken: null,
        });

        return { message: `Dr. ${doctor.user.name} has been suspended` };
    }

    async unsuspendDoctor(doctorId: string) {
        const doctor = await this.doctorRepository.findOne({
            where: { id: doctorId },
            relations: { user: true },
        });

        if (!doctor) throw new NotFoundException('Doctor not found');

        await this.doctorRepository.update(doctorId, {
            status: DoctorStatus.ACTIVE,
        });

        await this.userRepository.update(doctor.userId, { isActive: true });

        return { message: `Dr. ${doctor.user.name} has been unsuspended` };
    }
}