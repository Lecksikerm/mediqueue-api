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
import { QueuesService } from './queues.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { FindQueueDto } from './dto/find-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';

@Controller('queues')
@UseGuards(JwtAuthGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  // ─── Patient Routes ──────────────────────────────────────────

  @Post('/join')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  joinQueue(@CurrentUser() user: User, @Body() dto: JoinQueueDto) {
    return this.queuesService.joinQueue(user.id, dto);
  }

  @Get('/my-position/:appointmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
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
  getDoctorQueue(@CurrentUser() user: User, @Query() dto: FindQueueDto) {
    return this.queuesService.getDoctorQueue(user.id, dto);
  }

  @Patch('/doctor/advance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  advanceQueue(@CurrentUser() user: User) {
    return this.queuesService.advanceQueue(user.id);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/stats/:doctorId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getQueueStats(@Param('doctorId') doctorId: string) {
    return this.queuesService.getQueueStats(doctorId);
  }
}
