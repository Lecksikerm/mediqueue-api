import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../mail/mail.service';

@Processor('welcome-emails')
export class WelcomeEmailProcessor extends WorkerHost {
    private readonly logger = new Logger(WelcomeEmailProcessor.name);

    constructor(private readonly mailService: MailService) {
        super();
    }

    async process(job: Job) {
        const { email, name, role } = job.data;
        this.logger.log(`Processing welcome email for ${email}`);

        await this.mailService.sendWelcomeEmail(email, name, role);

        this.logger.log(`Welcome email sent to ${email}`);
    }
}