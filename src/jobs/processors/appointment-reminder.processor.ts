import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { MailService } from '../../mail/mail.service';
import { AppointmentStatus } from '../../common/enums';
import { formatTo12Hour } from '../../common/utils/time.util';

@Processor('appointment-reminders')
export class AppointmentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job) {
    const { appointmentId } = job.data;
    this.logger.log(`Processing reminder for appointment ${appointmentId}`);

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: { patient: true, doctor: { user: true }, slot: true },
    });

    if (!appointment) {
      this.logger.warn(`Appointment ${appointmentId} not found`);
      return;
    }

    if (
      [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED].includes(
        appointment.status,
      )
    ) {
      this.logger.log(`Skipping reminder — appointment ${appointmentId} is ${appointment.status}`);
      return;
    }

    const timeRange = `${formatTo12Hour(appointment.slot.startTime)} - ${formatTo12Hour(appointment.slot.endTime)}`;

    await this.mailService.sendAppointmentReminder(
      appointment.patient.email,
      appointment.patient.name,
      appointment.doctor.user.name,
      appointment.slot.date,
      timeRange,
    );

    this.logger.log(`Reminder sent for appointment ${appointmentId}`);
  }
}
