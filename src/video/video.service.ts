import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { VideoSession } from './entities/video-session.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';
import { VideoQueryDto } from './dto/video-query.dto';
import { VideoGateway } from './video.gateway';
import { paginate } from '../common/pagination/pagination.util';
import { AppointmentStatus, VideoSessionStatus } from '../common/enums';

@Injectable()
export class VideoService {
    constructor(
        @InjectRepository(VideoSession)
        private readonly videoSessionRepository: Repository<VideoSession>,
        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(Doctor)
        private readonly doctorRepository: Repository<Doctor>,
        private readonly videoGateway: VideoGateway,
    ) { }

    // ─── Get ICE server config ───────────────────────────────────
    getIceServers() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ],
        };
    }

    // ─── Doctor creates a video session ─────────────────────────
    async createSession(userId: string, dto: CreateVideoSessionDto) {
        const doctor = await this.doctorRepository.findOne({ where: { userId } });
        if (!doctor) throw new NotFoundException('Doctor profile not found');

        const appointment = await this.appointmentRepository.findOne({
            where: { id: dto.appointmentId, doctorId: doctor.id },
            relations: { patient: true, slot: true },
        });

        if (!appointment) throw new NotFoundException('Appointment not found');

        if (
            ![AppointmentStatus.BOOKED, AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.WAITING].includes(appointment.status)
        ) {
            throw new BadRequestException(
                'Video session can only be created for active appointments',
            );
        }

        // Check if session already exists for this appointment
        const existing = await this.videoSessionRepository.findOne({
            where: {
                appointmentId: dto.appointmentId,
                status: VideoSessionStatus.WAITING,
            },
        });

        if (existing) {
            return {
                message: 'Video session already exists',
                session: existing,
                iceServers: this.getIceServers(),
            };
        }

        const roomId = `room_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

        const session = this.videoSessionRepository.create({
            appointmentId: dto.appointmentId,
            doctorId: doctor.userId,
            patientId: appointment.patientId,
            roomId,
            status: VideoSessionStatus.WAITING,
        });

        await this.videoSessionRepository.save(session);

        // Update appointment to in_progress
        await this.appointmentRepository.update(dto.appointmentId, {
            status: AppointmentStatus.IN_PROGRESS,
            startedAt: new Date(),
        });

        return {
            message: 'Video session created successfully',
            session,
            iceServers: this.getIceServers(),
        };
    }

    // ─── Patient joins a video session ───────────────────────────
    async joinSession(userId: string, appointmentId: string) {
        const appointment = await this.appointmentRepository.findOne({
            where: { id: appointmentId, patientId: userId },
        });

        if (!appointment) throw new NotFoundException('Appointment not found');

        const session = await this.videoSessionRepository.findOne({
            where: { appointmentId },
            relations: { doctor: true, patient: true },
        });

        if (!session) {
            throw new NotFoundException(
                'Video session not found. Wait for the doctor to start the call',
            );
        }

        if (session.status === VideoSessionStatus.ENDED) {
            throw new BadRequestException('This video session has already ended');
        }

        // Mark session as active when patient joins
        if (session.status === VideoSessionStatus.WAITING) {
            const startedAt = new Date();
            await this.videoSessionRepository.update(session.id, {
                status: VideoSessionStatus.ACTIVE,
                startedAt,
            });

            session.status = VideoSessionStatus.ACTIVE;
            session.startedAt = startedAt;

            this.videoGateway.emitSessionStarted(session.roomId, {
                message: 'Patient has joined — video session is now active',
                roomId: session.roomId,
                appointmentId,
            });
        }

        return {
            message: 'Joined video session successfully',
            session: this.sanitizeSession({ ...session, status: VideoSessionStatus.ACTIVE }),
            iceServers: this.getIceServers(),
        };
    }

    // ─── End a video session ─────────────────────────────────────
    async endSession(userId: string, sessionId: string) {
        const session = await this.videoSessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) throw new NotFoundException('Video session not found');

        const doctor = await this.doctorRepository.findOne({ where: { userId } });
        const isDoctor = doctor && session.doctorId === userId;
        const isPatient = session.patientId === userId;

        if (!isDoctor && !isPatient) {
            throw new ForbiddenException('You are not a participant in this session');
        }

        if (session.status === VideoSessionStatus.ENDED) {
            throw new BadRequestException('Session has already ended');
        }

        const endedAt = new Date();
        const durationSeconds = session.startedAt
            ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
            : 0;

        await this.videoSessionRepository.update(sessionId, {
            status: VideoSessionStatus.ENDED,
            endedAt,
            durationSeconds,
        });

        // Mark appointment as completed
        await this.appointmentRepository.update(session.appointmentId, {
            status: AppointmentStatus.COMPLETED,
            completedAt: endedAt,
        });

        // Emit end call to all participants
        this.videoGateway.emitSessionEnded(session.roomId, {
            message: 'Video session has ended',
            durationSeconds,
            durationFormatted: this.formatDuration(durationSeconds),
        });

        return {
            message: 'Video session ended successfully',
            durationSeconds,
            durationFormatted: this.formatDuration(durationSeconds),
        };
    }

    // ─── Get session by appointment ID ───────────────────────────
    async getSessionByAppointment(userId: string, appointmentId: string) {
        const appointment = await this.appointmentRepository.findOne({
            where: { id: appointmentId },
        });

        if (!appointment) throw new NotFoundException('Appointment not found');

        const doctor = await this.doctorRepository.findOne({ where: { userId } });
        const isDoctor = doctor && appointment.doctorId === doctor.id;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            throw new ForbiddenException('Access denied');
        }

        const session = await this.videoSessionRepository.findOne({
            where: { appointmentId },
            relations: { doctor: true, patient: true },
        });

        if (!session) throw new NotFoundException('No video session found for this appointment');

        return {
            ...session,
            iceServers: this.getIceServers(),
            doctor: {
                id: session.doctor.id,
                name: session.doctor.name,
            },
            patient: {
                id: session.patient.id,
                name: session.patient.name,
            },
        };
    }

    // ─── Get my video sessions ───────────────────────────────────
    async getMySessions(userId: string, dto: VideoQueryDto) {
        const queryBuilder = this.videoSessionRepository
            .createQueryBuilder('session')
            .where(
                '(session.doctorId = :userId OR session.patientId = :userId)',
                { userId },
            );

        if (dto.status) {
            queryBuilder.andWhere('session.status = :status', { status: dto.status });
        }

        queryBuilder.orderBy('session.createdAt', 'DESC');

        const page = dto.page ?? 1;
        const limit = dto.limit ?? 10;
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map((s) => ({
                ...s,
                durationFormatted: s.durationSeconds
                    ? this.formatDuration(s.durationSeconds)
                    : null,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    // ─── Admin get all sessions ──────────────────────────────────
    async adminGetAllSessions(dto: VideoQueryDto) {
        const where: any = {};
        if (dto.status) where.status = dto.status;

        const result = await paginate(this.videoSessionRepository, dto, {
            where,
            relations: { doctor: true, patient: true, appointment: true },
            order: { createdAt: 'DESC' },
        });

        return {
            ...result,
            data: result.data.map((s) => ({
                ...s,
                durationFormatted: s.durationSeconds
                    ? this.formatDuration(s.durationSeconds)
                    : null,
                doctor: { id: s.doctor.id, name: s.doctor.name },
                patient: { id: s.patient.id, name: s.patient.name },
            })),
        };
    }

    private formatDuration(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    private sanitizeSession(session: VideoSession) {
        return {
            id: session.id,
            appointmentId: session.appointmentId,
            roomId: session.roomId,
            status: session.status,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            durationSeconds: session.durationSeconds,
            durationFormatted: session.durationSeconds
                ? this.formatDuration(session.durationSeconds)
                : null,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            doctor: session.doctor
                ? {
                    id: session.doctor.id,
                    name: session.doctor.name,
                    email: session.doctor.email,
                }
                : null,
            patient: session.patient
                ? {
                    id: session.patient.id,
                    name: session.patient.name,
                    email: session.patient.email,
                }
                : null,
        };
    }
}