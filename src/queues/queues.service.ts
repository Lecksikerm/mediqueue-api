import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConsultationQueue } from './entities/consultation-queue.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { RedisService } from '../common/redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { JoinQueueDto } from './dto/join-queue.dto';
import { FindQueueDto } from './dto/find-queue.dto';
import { paginate } from '../common/pagination/pagination.util';
import { AppointmentStatus, QueueStatus } from '../common/enums';

const AVG_CONSULTATION_MINUTES = 15;

@Injectable()
export class QueuesService {
  constructor(
    @InjectRepository(ConsultationQueue)
    private readonly queueRepository: Repository<ConsultationQueue>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  // ─── Join Queue ──────────────────────────────────────────────
  async joinQueue(patientId: string, dto: JoinQueueDto) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: dto.appointmentId, patientId },
      relations: { slot: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked appointments can join the queue',
      );
    }

    // Check if already in queue
    const existing = await this.queueRepository.findOne({
      where: {
        appointmentId: dto.appointmentId,
        status: QueueStatus.WAITING,
      },
    });

    if (existing) {
      throw new ConflictException('Already in queue for this appointment');
    }

    // Get current queue position
    const position = await this.redisService.addToQueue(
      appointment.doctorId,
      patientId,
    );

    const estimatedWait = (position - 1) * AVG_CONSULTATION_MINUTES;

    // Save to DB
    const queueEntry = this.queueRepository.create({
      doctorId: appointment.doctorId,
      patientId,
      appointmentId: dto.appointmentId,
      position,
      status: QueueStatus.WAITING,
      estimatedWaitMinutes: estimatedWait,
    });

    await this.queueRepository.save(queueEntry);

    // Update appointment status to WAITING
    await this.appointmentRepository.update(dto.appointmentId, {
      status: AppointmentStatus.WAITING,
    });

    // Emit real-time update
    await this.emitQueueUpdate(appointment.doctorId);

    return {
      message: 'Joined queue successfully',
      position,
      estimatedWaitMinutes: estimatedWait,
      estimatedWaitFormatted:
        estimatedWait === 0 ? 'You are next' : `~${estimatedWait} minutes wait`,
      queueEntry,
    };
  }

  // ─── Get My Queue Position ───────────────────────────────────
  async getMyPosition(patientId: string, appointmentId: string) {
    const queueEntry = await this.queueRepository.findOne({
      where: {
        appointmentId,
        patientId,
        status: QueueStatus.WAITING,
      },
    });

    if (!queueEntry) {
      throw new NotFoundException('You are not in the queue');
    }

    const position = await this.redisService.getQueuePosition(
      queueEntry.doctorId,
      patientId,
    );

    const estimatedWait =
      position <= 1 ? 0 : (position - 1) * AVG_CONSULTATION_MINUTES;

    return {
      position,
      estimatedWaitMinutes: estimatedWait,
      estimatedWaitFormatted:
        position === 1 ? 'You are next' : `~${estimatedWait} minutes wait`,
      status: queueEntry.status,
    };
  }

  // ─── Get Doctor's Full Queue ─────────────────────────────────
  async getDoctorQueue(userId: string, dto: FindQueueDto) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const where: FindOptionsWhere<ConsultationQueue> = { doctorId: doctor.id };
    if (dto?.status) where.status = dto.status;
    else where.status = QueueStatus.WAITING;

    const result = await paginate(this.queueRepository, dto, {
      where,
      relations: { patient: true },
      order: { position: 'ASC' },
    });

    // Enrich with live Redis positions
    const liveQueue = await this.redisService.getQueueList(doctor.id);

    return {
      ...result,
      data: result.data.map((entry) => {
        const livePosition = liveQueue.indexOf(entry.patientId) + 1;
        const estimatedWait =
          livePosition <= 1 ? 0 : (livePosition - 1) * AVG_CONSULTATION_MINUTES;

        return {
          ...entry,
          livePosition: livePosition || entry.position,
          estimatedWaitMinutes: estimatedWait,
          estimatedWaitFormatted:
            livePosition === 1 ? 'Next up' : `~${estimatedWait} minutes`,
          patient: entry.patient
            ? {
                id: entry.patient.id,
                name: entry.patient.name,
                email: entry.patient.email,
              }
            : null,
        };
      }),
    };
  }

  // ─── Advance Queue (Doctor calls next patient) ───────────────
  async advanceQueue(userId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // Get first in queue
    const nextEntry = await this.queueRepository.findOne({
      where: { doctorId: doctor.id, status: QueueStatus.WAITING },
      order: { position: 'ASC' },
      relations: { patient: true },
    });

    if (!nextEntry) {
      throw new NotFoundException('No patients in queue');
    }

    // Mark current as in progress
    await this.queueRepository.update(nextEntry.id, {
      status: QueueStatus.IN_PROGRESS,
    });

    // Update appointment to in_progress
    await this.appointmentRepository.update(nextEntry.appointmentId, {
      status: AppointmentStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    // Remove from Redis queue
    await this.redisService.removeFromQueue(doctor.id, nextEntry.patientId);

    // Recalculate positions for remaining patients
    await this.recalculatePositions(doctor.id);

    // Emit update
    await this.emitQueueUpdate(doctor.id);

    // Notify the specific patient
    this.websocketGateway.emitConsultationStarted(doctor.id, {
      patientId: nextEntry.patientId,
      message: 'Your consultation is starting now',
    });

    return {
      message: 'Queue advanced — next patient called',
      patient: {
        id: nextEntry.patient.id,
        name: nextEntry.patient.name,
      },
    };
  }

  // ─── Leave Queue ─────────────────────────────────────────────
  async leaveQueue(patientId: string, appointmentId: string) {
    const queueEntry = await this.queueRepository.findOne({
      where: { appointmentId, patientId, status: QueueStatus.WAITING },
    });

    if (!queueEntry) {
      throw new NotFoundException('You are not in the queue');
    }

    // Remove from Redis
    await this.redisService.removeFromQueue(queueEntry.doctorId, patientId);

    // Mark queue entry as skipped
    await this.queueRepository.update(queueEntry.id, {
      status: QueueStatus.SKIPPED,
    });

    // Revert appointment to booked
    await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.BOOKED,
    });

    // Recalculate remaining positions
    await this.recalculatePositions(queueEntry.doctorId);

    // Emit update
    await this.emitQueueUpdate(queueEntry.doctorId);

    return { message: 'Left queue successfully' };
  }

  // ─── Complete Queue Entry ────────────────────────────────────
  async completeQueueEntry(appointmentId: string) {
    const queueEntry = await this.queueRepository.findOne({
      where: { appointmentId, status: QueueStatus.IN_PROGRESS },
    });

    if (!queueEntry) return;

    await this.queueRepository.update(queueEntry.id, {
      status: QueueStatus.COMPLETED,
    });

    await this.emitQueueUpdate(queueEntry.doctorId);
  }

  // ─── Get Queue Stats (Admin) ─────────────────────────────────
  async getQueueStats(doctorId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: { user: true },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const liveLength = await this.redisService.getQueueLength(doctorId);

    const waiting = await this.queueRepository.count({
      where: { doctorId, status: QueueStatus.WAITING },
    });

    const inProgress = await this.queueRepository.count({
      where: { doctorId, status: QueueStatus.IN_PROGRESS },
    });

    const completedToday = await this.queueRepository
      .createQueryBuilder('q')
      .where('q.doctorId = :doctorId', { doctorId })
      .andWhere('q.status = :status', { status: QueueStatus.COMPLETED })
      .andWhere('DATE(q.updatedAt) = CURRENT_DATE')
      .getCount();

    return {
      doctor: {
        id: doctor.id,
        name: doctor.user.name,
        specialization: doctor.specialization,
        status: doctor.status,
      },
      queue: {
        liveCount: liveLength,
        waitingCount: waiting,
        inProgressCount: inProgress,
        completedTodayCount: completedToday,
        estimatedClearTime: `~${liveLength * AVG_CONSULTATION_MINUTES} minutes`,
      },
    };
  }

  private async recalculatePositions(doctorId: string) {
    const waitingEntries = await this.queueRepository.find({
      where: { doctorId, status: QueueStatus.WAITING },
      order: { position: 'ASC' },
    });

    for (let i = 0; i < waitingEntries.length; i++) {
      const newPosition = i + 1;
      const estimatedWait = i === 0 ? 0 : i * AVG_CONSULTATION_MINUTES;

      await this.queueRepository.update(waitingEntries[i].id, {
        position: newPosition,
        estimatedWaitMinutes: estimatedWait,
      });
    }
  }

  private async emitQueueUpdate(doctorId: string) {
    const liveQueue = await this.redisService.getQueueList(doctorId);
    const queueLength = liveQueue.length;

    this.websocketGateway.emitQueueUpdate(doctorId, {
      doctorId,
      queueLength,
      queue: liveQueue.map((patientId, index) => ({
        patientId,
        position: index + 1,
        estimatedWaitMinutes:
          index === 0 ? 0 : index * AVG_CONSULTATION_MINUTES,
        estimatedWaitFormatted:
          index === 0 ? 'Next up' : `~${index * AVG_CONSULTATION_MINUTES} mins`,
      })),
    });
  }
}
