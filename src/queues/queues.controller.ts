import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { FindQueueDto } from './dto/find-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { QueueStatus, UserRole } from '../common/enums';

@ApiTags('Queues')
@ApiBearerAuth('access-token')
@Controller('queues')
@UseGuards(JwtAuthGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) { }

  // ─── Patient Routes ──────────────────────────────────────────

  @Post('/join')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[Patient] Join the consultation queue for a booked appointment' })
  @ApiResponse({
    status: 201,
    description: 'Joined queue successfully',
    schema: {
      example: {
        message: 'Joined queue successfully',
        position: 2,
        estimatedWaitMinutes: 15,
        estimatedWaitFormatted: '~15 minutes wait',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Only booked appointments can join the queue' })
  @ApiResponse({ status: 409, description: 'Already in queue for this appointment' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  joinQueue(@CurrentUser() user: User, @Body() dto: JoinQueueDto) {
    return this.queuesService.joinQueue(user.id, dto);
  }

  @Get('/my-position/:appointmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[Patient] Get my current position in the queue' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Queue position retrieved successfully',
    schema: {
      example: {
        position: 2,
        estimatedWaitMinutes: 15,
        estimatedWaitFormatted: '~15 minutes wait',
        status: 'waiting',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'You are not in the queue' })
  getMyPosition(
    @CurrentUser() user: User,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.queuesService.getMyPosition(user.id, appointmentId);
  }

  @Delete('/leave/:appointmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Patient] Leave the consultation queue' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Left queue successfully',
    schema: { example: { message: 'Left queue successfully' } },
  })
  @ApiResponse({ status: 404, description: 'You are not in the queue' })
  leaveQueue(
    @CurrentUser() user: User,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.queuesService.leaveQueue(user.id, appointmentId);
  }

  // ─── Doctor Routes ───────────────────────────────────────────

  @Get('/doctor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[Doctor] View my current patient queue' })
  @ApiQuery({ name: 'status', enum: QueueStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Doctor queue retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            position: 1,
            livePosition: 1,
            estimatedWaitFormatted: 'Next up',
            status: 'waiting',
            patient: { id: 'uuid', name: 'Ahmed Musa', email: 'ahmed@example.com' },
          },
        ],
        meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  getDoctorQueue(@CurrentUser() user: User, @Query() dto: FindQueueDto) {
    return this.queuesService.getDoctorQueue(user.id, dto);
  }

  @Patch('/doctor/advance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Doctor] Call next patient — advance the queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue advanced — next patient called',
    schema: {
      example: {
        message: 'Queue advanced — next patient called',
        patient: { id: 'uuid', name: 'Ahmed Musa' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No patients in queue' })
  advanceQueue(@CurrentUser() user: User) {
    return this.queuesService.advanceQueue(user.id);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/stats/:doctorId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get queue statistics for a specific doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor UUID' })
  @ApiResponse({
    status: 200,
    description: 'Queue stats retrieved successfully',
    schema: {
      example: {
        doctor: {
          id: 'uuid',
          name: 'Dr. Adebayo',
          specialization: 'Cardiology',
          status: 'active',
        },
        queue: {
          liveCount: 3,
          waitingCount: 3,
          inProgressCount: 1,
          completedTodayCount: 7,
          estimatedClearTime: '~45 minutes',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  getQueueStats(@Param('doctorId') doctorId: string) {
    return this.queuesService.getQueueStats(doctorId);
  }
}