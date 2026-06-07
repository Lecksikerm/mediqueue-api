import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { FindAppointmentsDto } from './dto/find-appointments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ─── Patient Routes ──────────────────────────────────────────

  @Post('/book')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  book(@CurrentUser() user: User, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.book(user.id, dto);
  }

  @Get('/my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  getMyAppointments(
    @CurrentUser() user: User,
    @Query() dto: FindAppointmentsDto,
  ) {
    return this.appointmentsService.getMyAppointments(user.id, dto);
  }

  @Patch('/my/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, user.id);
  }

  @Patch('/my/:id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  reschedule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(id, user.id, dto);
  }

  // ─── Doctor Routes ───────────────────────────────────────────

  @Get('/doctor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  getDoctorAppointments(
    @CurrentUser() user: User,
    @Query() dto: FindAppointmentsDto,
  ) {
    return this.appointmentsService.getDoctorAppointments(user.id, dto);
  }

  @Patch('/doctor/:id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  startConsultation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.startConsultation(id, user.id);
  }

  @Patch('/doctor/:id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  completeConsultation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.completeConsultation(id, user.id);
  }

  @Patch('/doctor/:id/no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  markNoShow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.markNoShow(id, user.id);
  }

  // ─── Shared Routes (Patient + Doctor) ───────────────────────

  @Get('/:id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Patch('/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelShared(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, user.id);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminFindAll(@Query() dto: FindAppointmentsDto) {
    return this.appointmentsService.adminFindAll(dto);
  }
}
