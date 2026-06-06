import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { SlotStatus } from '../common/enums';
import { formatTo12Hour } from '../common/utils/time.util';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  private formatAvailabilitySlot(slot: AvailabilitySlot) {
    return {
      ...slot,
      startTime: slot.startTime,
      endTime: slot.endTime,
      startTimeFormatted: formatTo12Hour(slot.startTime),
      endTimeFormatted: formatTo12Hour(slot.endTime),
      timeRange: `${formatTo12Hour(slot.startTime)} - ${formatTo12Hour(
        slot.endTime,
      )}`,
    };
  }

  // ─── Create Slot ─────────────────────────────────────────────
  async createSlot(userId: string, dto: CreateSlotDto) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // Validate end time is after start time
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping slots
    const overlap = await this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('slot.date = :date', { date: dto.date })
      .andWhere('slot.status != :cancelled', {
        cancelled: SlotStatus.BLOCKED,
      })
      .andWhere('(slot.startTime < :endTime AND slot.endTime > :startTime)', {
        startTime: dto.startTime,
        endTime: dto.endTime,
      })
      .getOne();

    if (overlap) {
      throw new BadRequestException(
        'This time slot overlaps with an existing slot',
      );
    }

    // Handle recurring slots
    if (dto.isRecurring && dto.recurrenceDays?.length) {
      return this.createRecurringSlots(doctor.id, dto);
    }

    const slot = this.slotRepository.create({
      doctorId: doctor.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isRecurring: false,
    });

    await this.slotRepository.save(slot);

    return {
      message: 'Availability slot created successfully',
      slot: this.formatAvailabilitySlot(slot),
    };
  }

  // ─── Create Recurring Slots ──────────────────────────────────
  private async createRecurringSlots(doctorId: string, dto: CreateSlotDto) {
    const startDate = new Date(dto.date);
    const slots: AvailabilitySlot[] = [];

    // Generate slots for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      for (const day of dto.recurrenceDays) {
        const dayIndex = [
          'SUN',
          'MON',
          'TUE',
          'WED',
          'THU',
          'FRI',
          'SAT',
        ].indexOf(day);

        const slotDate = new Date(startDate);
        const currentDay = slotDate.getDay();
        const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
        slotDate.setDate(slotDate.getDate() + daysUntilTarget + week * 7);

        const dateStr = slotDate.toISOString().split('T')[0];

        // Skip if slot already exists
        const exists = await this.slotRepository.findOne({
          where: {
            doctorId,
            date: dateStr,
            startTime: dto.startTime,
          },
        });

        if (!exists) {
          slots.push(
            this.slotRepository.create({
              doctorId,
              date: dateStr,
              startTime: dto.startTime,
              endTime: dto.endTime,
              isRecurring: true,
              recurrenceDays: dto.recurrenceDays.join(','),
            }),
          );
        }
      }
    }

    await this.slotRepository.save(slots);

    return {
      message: `${slots.length} recurring slots created successfully`,
      count: slots.length,
      slots: slots.map((slot) => this.formatAvailabilitySlot(slot)),
    };
  }

  // ─── Get My Slots (Doctor) ───────────────────────────────────
  async getMySlots(userId: string, dto: FindSlotsDto) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const queryBuilder = this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId: doctor.id });

    if (dto.date) {
      queryBuilder.andWhere('slot.date = :date', { date: dto.date });
    }

    if (dto.status) {
      queryBuilder.andWhere('slot.status = :status', { status: dto.status });
    }

    queryBuilder
      .orderBy('slot.date', 'ASC')
      .addOrderBy('slot.startTime', 'ASC');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((slot) => this.formatAvailabilitySlot(slot)),
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

  // ─── Get Available Slots for a Doctor (Patients) ─────────────
  async getAvailableSlots(doctorId: string, dto: PaginationDto, date?: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const queryBuilder = this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId })
      .andWhere('slot.status = :status', { status: SlotStatus.AVAILABLE })
      .andWhere('slot.date >= :today', {
        today: new Date().toISOString().split('T')[0],
      });

    if (date) {
      queryBuilder.andWhere('slot.date = :date', { date });
    }

    queryBuilder
      .orderBy('slot.date', 'ASC')
      .addOrderBy('slot.startTime', 'ASC');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((slot) => this.formatAvailabilitySlot(slot)),
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

  // ─── Block a Slot ────────────────────────────────────────────
  async blockSlot(userId: string, slotId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const slot = await this.slotRepository.findOne({
      where: { id: slotId, doctorId: doctor.id },
    });

    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        'Cannot block a slot that is already booked',
      );
    }

    await this.slotRepository.update(slotId, { status: SlotStatus.BLOCKED });

    return { message: 'Slot blocked successfully' };
  }

  // ─── Delete a Slot ───────────────────────────────────────────
  async deleteSlot(userId: string, slotId: string) {
    const doctor = await this.doctorRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const slot = await this.slotRepository.findOne({
      where: { id: slotId, doctorId: doctor.id },
    });

    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        'Cannot delete a booked slot. Cancel the appointment first',
      );
    }

    await this.slotRepository.remove(slot);

    return { message: 'Slot deleted successfully' };
  }

  // ─── Admin: Get All Slots for a Doctor ───────────────────────
  async adminGetDoctorSlots(doctorId: string, dto: FindSlotsDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const where: Record<string, unknown> = { doctorId };
    if (dto.date) where.date = dto.date;
    if (dto.status) where['status'] = dto.status;

    const result = await paginate<AvailabilitySlot>(this.slotRepository, dto, {
      where,
      order: { date: 'ASC' },
    });

    return {
      ...result,
      data: result.data.map((slot) => this.formatAvailabilitySlot(slot)),
    };
  }
}
