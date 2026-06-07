import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { FindAppointmentsDto } from './dto/find-appointments.dto';
import { paginate } from '../common/pagination/pagination.util';
import { AppointmentStatus, SlotStatus } from '../common/enums';
import { formatTo12Hour } from '../common/utils/time.util';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AvailabilitySlot)
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  // ─── Format appointment helper ───────────────────────────────
  private formatAppointment(appointment: Appointment) {
    return {
      ...appointment,
      slot: appointment.slot
        ? {
            ...appointment.slot,
            startTimeFormatted: formatTo12Hour(appointment.slot.startTime),
            endTimeFormatted: formatTo12Hour(appointment.slot.endTime),
            timeRange: `${formatTo12Hour(appointment.slot.startTime)} - ${formatTo12Hour(appointment.slot.endTime)}`,
          }
        : null,
      doctor: appointment.doctor
        ? {
            ...appointment.doctor,
            user: appointment.doctor.user
              ? {
                  id: appointment.doctor.user.id,
                  name: appointment.doctor.user.name,
                  email: appointment.doctor.user.email,
                }
              : null,
          }
        : null,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            name: appointment.patient.name,
            email: appointment.patient.email,
          }
        : null,
    };
  }

  // ─── Book Appointment ────────────────────────────────────────
  async book(patientId: string, dto: CreateAppointmentDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: dto.doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const slot = await this.slotRepository.findOne({
      where: { id: dto.slotId, doctorId: dto.doctorId },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('This slot is no longer available');
    }

    // Check patient doesn't already have an appointment at this time
    const existingAppointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .innerJoin('appointment.slot', 'slot')
      .where('appointment.patientId = :patientId', { patientId })
      .andWhere('slot.date = :date', { date: slot.date })
      .andWhere('slot.startTime < :endTime', { endTime: slot.endTime })
      .andWhere('slot.endTime > :startTime', { startTime: slot.startTime })
      .andWhere('appointment.status NOT IN (:...statuses)', {
        statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      })
      .getOne();

    if (existingAppointment) {
      throw new BadRequestException(
        'You already have an appointment at this time',
      );
    }

    // Create appointment
    const appointment = this.appointmentRepository.create({
      patientId,
      doctorId: dto.doctorId,
      slotId: dto.slotId,
      notes: dto.notes,
      status: AppointmentStatus.BOOKED,
    });

    await this.appointmentRepository.save(appointment);

    // Mark slot as booked
    await this.slotRepository.update(slot.id, {
      status: SlotStatus.BOOKED,
    });

    // Fetch full appointment with relations
    const full = await this.appointmentRepository.findOne({
      where: { id: appointment.id },
      relations: { slot: true, doctor: { user: true }, patient: true },
    });

    return {
      message: 'Appointment booked successfully',
      appointment: this.formatAppointment(full),
    };
  }

  // ─── Get My Appointments (Patient) ──────────────────────────
  async getMyAppointments(patientId: string, dto: FindAppointmentsDto) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .where('appointment.patientId = :patientId', { patientId });

    if (dto.status) {
      queryBuilder.andWhere('appointment.status = :status', {
        status: dto.status,
      });
    }

    if (dto.date) {
      queryBuilder.andWhere('slot.date = :date', { date: dto.date });
    }

    queryBuilder
      .orderBy('slot.date', 'DESC')
      .addOrderBy('slot.startTime', 'ASC');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((a) => this.formatAppointment(a)),
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

  // ─── Get Doctor's Appointments ───────────────────────────────
  async getDoctorAppointments(userId: string, dto: FindAppointmentsDto) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('appointment.doctorId = :doctorId', { doctorId: doctor.id });

    if (dto.status) {
      queryBuilder.andWhere('appointment.status = :status', {
        status: dto.status,
      });
    }

    if (dto.date) {
      queryBuilder.andWhere('slot.date = :date', { date: dto.date });
    }

    queryBuilder
      .orderBy('slot.date', 'ASC')
      .addOrderBy('slot.startTime', 'ASC');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((a) => this.formatAppointment(a)),
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

  // ─── Get Single Appointment ──────────────────────────────────
  async findOne(appointmentId: string, userId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: { slot: true, doctor: { user: true }, patient: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    const isPatient = appointment.patientId === userId;
    const isDoctor = doctor && appointment.doctorId === doctor.id;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatAppointment(appointment);
  }

  // ─── Cancel Appointment ──────────────────────────────────────
  async cancel(appointmentId: string, userId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: { slot: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    const isPatient = appointment.patientId === userId;
    const isDoctor = doctor && appointment.doctorId === doctor.id;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('You cannot cancel this appointment');
    }

    if (
      [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(
        appointment.status,
      )
    ) {
      throw new BadRequestException(
        `Cannot cancel an appointment that is already ${appointment.status}`,
      );
    }

    await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.CANCELLED,
    });

    // Free up the slot
    await this.slotRepository.update(appointment.slotId, {
      status: SlotStatus.AVAILABLE,
    });

    return { message: 'Appointment cancelled successfully' };
  }

  // ─── Reschedule Appointment ──────────────────────────────────
  async reschedule(
    appointmentId: string,
    patientId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException('You cannot reschedule this appointment');
    }

    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked appointments can be rescheduled',
      );
    }

    const newSlot = await this.slotRepository.findOne({
      where: { id: dto.newSlotId, doctorId: appointment.doctorId },
    });

    if (!newSlot) throw new NotFoundException('New slot not found');

    if (newSlot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('The selected slot is not available');
    }

    // Free old slot
    await this.slotRepository.update(appointment.slotId, {
      status: SlotStatus.AVAILABLE,
    });

    // Book new slot
    await this.slotRepository.update(newSlot.id, {
      status: SlotStatus.BOOKED,
    });

    await this.appointmentRepository.update(appointmentId, {
      slotId: newSlot.id,
    });

    return { message: 'Appointment rescheduled successfully' };
  }

  // ─── Doctor: Start Consultation ──────────────────────────────
  async startConsultation(appointmentId: string, userId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId: doctor.id },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    // Accept both BOOKED and WAITING — WAITING comes from queue
    if (
      ![AppointmentStatus.BOOKED, AppointmentStatus.WAITING].includes(
        appointment.status,
      )
    ) {
      throw new BadRequestException(
        'Only booked or waiting appointments can be started',
      );
    }

    await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return { message: 'Consultation started' };
  }

  // ─── Doctor: Complete Consultation ───────────────────────────
  async completeConsultation(appointmentId: string, userId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId: doctor.id },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress appointments can be completed',
      );
    }

    await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.COMPLETED,
      completedAt: new Date(),
    });

    return { message: 'Consultation completed' };
  }

  // ─── Doctor: Mark No-Show ────────────────────────────────────
  async markNoShow(appointmentId: string, userId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId: doctor.id },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (
      ![
        AppointmentStatus.BOOKED,
        AppointmentStatus.WAITING,
        AppointmentStatus.IN_PROGRESS,
      ].includes(appointment.status)
    ) {
      throw new BadRequestException(
        'Cannot mark a completed or already cancelled appointment as no-show',
      );
    }

    await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.NO_SHOW,
    });

    // Free up the slot
    await this.slotRepository.update(appointment.slotId, {
      status: SlotStatus.AVAILABLE,
    });

    return { message: 'Patient marked as no-show' };
  }

  // ─── Admin: Get All Appointments ─────────────────────────────
  async adminFindAll(dto: FindAppointmentsDto) {
    const where: Record<string, any> = {};
    const status = dto.status;
    if (status) where['status'] = status;

    const result = await paginate(this.appointmentRepository, dto, {
      where,
      relations: { slot: true, doctor: { user: true }, patient: true },
      order: { createdAt: 'DESC' },
    });

    return {
      ...result,
      data: result.data.map((a) => this.formatAppointment(a)),
    };
  }
}
