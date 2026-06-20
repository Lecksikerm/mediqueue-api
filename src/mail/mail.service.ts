import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { appointmentReminderTemplate } from './templates/appointment-reminder.template';
import { resetPasswordTemplate } from './templates/reset-password.template';
import { welcomeTemplate } from './templates/welcome.template';


@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string, role: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject: 'Welcome to MediQueue 🎉',
        html: welcomeTemplate(name, role),
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
      
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject: 'MediQueue — Password Reset Request',
        html: resetPasswordTemplate(name, resetToken),
      });

      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendAppointmentReminder(
    to: string,
    patientName: string,
    doctorName: string,
    date: string,
    timeRange: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject: 'MediQueue — Appointment Reminder',
        html: appointmentReminderTemplate(
          patientName,
          doctorName,
          date,
          timeRange,
        ),
      });

      this.logger.log(`Appointment reminder sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment reminder to ${to}`, error);
      throw error;
    }
  }
}
