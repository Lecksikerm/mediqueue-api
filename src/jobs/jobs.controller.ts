import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Jobs')
@ApiBearerAuth('access-token')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('/trigger-daily-slots')
  @ApiOperation({
    summary: '[Admin] Manually trigger daily slot generation job',
    description:
      'Generates availability slots for the next 7 days for all active doctors that have recurring schedules. This job normally runs automatically at midnight every day.',
  })
  @ApiResponse({
    status: 201,
    description: 'Daily slot generation job queued successfully',
    schema: {
      example: { message: 'Daily slot generation job queued' },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  triggerDailySlots() {
    return this.jobsService.triggerDailySlotGenerationNow();
  }
}