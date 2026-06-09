import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { AvailabilitySlot } from '../../availability/entities/availability-slot.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { DoctorStatus, SlotStatus } from '../../common/enums';

@Processor('daily-slots')
export class DailySlotsProcessor extends WorkerHost {
  private readonly logger = new Logger(DailySlotsProcessor.name);

  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log('Running daily slot generation job');

    const activeDoctors = await this.doctorRepository.find({
      where: { status: DoctorStatus.ACTIVE },
    });

    let totalGenerated = 0;

    for (const doctor of activeDoctors) {
      const generated = await this.generateSlotsForDoctor(doctor);
      totalGenerated += generated;
    }

    this.logger.log(`Daily slot generation complete — ${totalGenerated} slots created for ${activeDoctors.length} doctors`);
  }

  private async generateSlotsForDoctor(doctor: Doctor): Promise<number> {
    // Get all recurring slots for this doctor
    const recurringSlots = await this.slotRepository.find({
      where: { doctorId: doctor.id, isRecurring: true },
    });

    if (!recurringSlots.length) return 0;

    // Generate for next 7 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let generated = 0;
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayName = dayNames[targetDate.getDay()];
      const dateStr = targetDate.toISOString().split('T')[0];

      for (const recurring of recurringSlots) {
        if (!recurring.recurrenceDays?.includes(dayName)) continue;

        const exists = await this.slotRepository.findOne({
          where: {
            doctorId: doctor.id,
            date: dateStr,
            startTime: recurring.startTime,
          },
        });

        if (!exists) {
          await this.slotRepository.save(
            this.slotRepository.create({
              doctorId: doctor.id,
              date: dateStr,
              startTime: recurring.startTime,
              endTime: recurring.endTime,
              isRecurring: true,
              recurrenceDays: recurring.recurrenceDays,
              status: SlotStatus.AVAILABLE,
            }),
          );
          generated++;
        }
      }
    }

    return generated;
  }
}
