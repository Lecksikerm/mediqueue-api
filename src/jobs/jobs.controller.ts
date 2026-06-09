import { Controller, Post, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('/trigger-daily-slots')
  triggerDailySlots() {
    return this.jobsService.triggerDailySlotGenerationNow();
  }
}