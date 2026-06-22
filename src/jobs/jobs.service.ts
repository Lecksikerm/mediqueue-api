import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('appointment-reminders')
    private readonly reminderQueue: Queue,

    @InjectQueue('queue-recalculation')
    private readonly recalcQueue: Queue,

    @InjectQueue('daily-slots')
    private readonly dailySlotsQueue: Queue,

    @InjectQueue('welcome-emails')
    private readonly welcomeEmailQueue: Queue,
  ) { }

  async scheduleAppointmentReminder(
    appointmentId: string,
    slotDate: string,
    slotStartTime: string,
  ): Promise<void> {
    const timeStr =
      slotStartTime.length === 5
        ? `${slotStartTime}:00`
        : slotStartTime;

    const appointmentDateTime = new Date(`${slotDate}T${timeStr}`);

    if (isNaN(appointmentDateTime.getTime())) {
      this.logger.warn(
        `Invalid appointment datetime for ${appointmentId}: ${slotDate}T${timeStr}`,
      );
      return;
    }

    const reminderTime = new Date(appointmentDateTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 30);

    const delay = reminderTime.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn(
        `Reminder time has already passed for appointment ${appointmentId}`,
      );
      return;
    }

    await this.reminderQueue.add(
      'send-reminder',
      { appointmentId },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Reminder scheduled for appointment ${appointmentId}. Delay: ${Math.round(
        delay / 60000,
      )} minutes`,
    );
  }

  async triggerQueueRecalculation(
    doctorId: string,
  ): Promise<void> {
    await this.recalcQueue.add(
      'recalculate',
      { doctorId },
      {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
      },
    );

    this.logger.log(
      `Queue recalculation triggered for doctor ${doctorId}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailySlotGeneration(): Promise<void> {
    this.logger.log('Triggering nightly slot generation job');

    await this.dailySlotsQueue.add(
      'generate-slots',
      {},
      {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      },
    );
  }

  async triggerDailySlotGenerationNow(): Promise<{
    message: string;
  }> {
    await this.dailySlotsQueue.add('generate-slots', {});

    this.logger.log(
      'Daily slot generation triggered manually',
    );

    return {
      message: 'Daily slot generation job queued',
    };
  }

  
  async scheduleWelcomeEmail(
    email: string,
    name: string,
    role: string,
  ): Promise<void> {
    await this.welcomeEmailQueue.add(
      'send-welcome',
      {
        email,
        name,
        role,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Welcome email job queued for ${email}`,
    );
  }
}