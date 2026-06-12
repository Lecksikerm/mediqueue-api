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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { FindAppointmentsDto } from './dto/find-appointments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus, UserRole } from '../common/enums';

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) { }

  // ─── Patient Routes ──────────────────────────────────────────

  @Post('/book')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[Patient] Book an appointment with a doctor' })
  @ApiResponse({
    status: 201,
    description: 'Appointment booked successfully',
    schema: {
      example: {
        message: 'Appointment booked successfully',
        appointment: {
          id: 'uuid',
          status: 'booked',
          notes: 'I have chest pain',
          slot: {
            date: '2026-06-15',
            timeRange: '9:00 AM - 9:30 AM',
          },
          doctor: { name: 'Dr. Adebayo', specialization: 'Cardiology' },
          patient: { name: 'Ahmed Musa' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Slot is no longer available' })
  @ApiResponse({ status: 400, description: 'You already have an appointment at this time' })
  @ApiResponse({ status: 404, description: 'Doctor or slot not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Patient only' })
  book(@CurrentUser() user: User, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.book(user.id, dto);
  }

  @Get('/my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[Patient] Get my appointments' })
  @ApiQuery({ name: 'status', enum: AppointmentStatus, required: false })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'My appointments retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            status: 'booked',
            slot: { date: '2026-06-15', timeRange: '9:00 AM - 9:30 AM' },
            doctor: { name: 'Dr. Adebayo' },
          },
        ],
        meta: { total: 5, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
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
  @ApiOperation({ summary: '[Patient] Cancel my appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
    schema: { example: { message: 'Appointment cancelled successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel a completed or already cancelled appointment' })
  @ApiResponse({ status: 403, description: 'You cannot cancel this appointment' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, user.id);
  }

  @Patch('/my/:id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Patient] Reschedule my appointment to a new slot' })
  @ApiParam({ name: 'id', description: 'Appointment UUID to reschedule' })
  @ApiResponse({
    status: 200,
    description: 'Appointment rescheduled successfully',
    schema: { example: { message: 'Appointment rescheduled successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Only booked appointments can be rescheduled' })
  @ApiResponse({ status: 400, description: 'The selected slot is not available' })
  @ApiResponse({ status: 404, description: 'Appointment or new slot not found' })
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
  @ApiOperation({ summary: '[Doctor] Get my patient appointments' })
  @ApiQuery({ name: 'status', enum: AppointmentStatus, required: false })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Doctor appointments retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            status: 'waiting',
            slot: { date: '2026-06-15', timeRange: '9:00 AM - 9:30 AM' },
            patient: { name: 'Ahmed Musa', email: 'ahmed@example.com' },
          },
        ],
        meta: { total: 8, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
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
  @ApiOperation({ summary: '[Doctor] Start a consultation' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Consultation started',
    schema: { example: { message: 'Consultation started' } },
  })
  @ApiResponse({ status: 400, description: 'Only booked or waiting appointments can be started' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  startConsultation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.startConsultation(id, user.id);
  }

  @Patch('/doctor/:id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Doctor] Complete a consultation' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Consultation completed',
    schema: { example: { message: 'Consultation completed' } },
  })
  @ApiResponse({ status: 400, description: 'Only in-progress appointments can be completed' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  completeConsultation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.completeConsultation(id, user.id);
  }

  @Patch('/doctor/:id/no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Doctor] Mark a patient as no-show' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Patient marked as no-show',
    schema: { example: { message: 'Patient marked as no-show' } },
  })
  @ApiResponse({ status: 400, description: 'Cannot mark this appointment as no-show' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  markNoShow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.markNoShow(id, user.id);
  }

  // ─── Shared Routes (Patient + Doctor) ───────────────────────

  @Get('/:id')
  @ApiOperation({ summary: '[Patient/Doctor] Get a single appointment by ID' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({ status: 200, description: 'Appointment retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Patch('/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Patient/Doctor] Cancel an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
    schema: { example: { message: 'Appointment cancelled successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel a completed or already cancelled appointment' })
  @ApiResponse({ status: 403, description: 'You cannot cancel this appointment' })
  cancelShared(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, user.id);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get all appointments system-wide' })
  @ApiQuery({ name: 'status', enum: AppointmentStatus, required: false })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'All appointments retrieved successfully',
    schema: {
      example: {
        data: [{ id: 'uuid', status: 'completed', patient: {}, doctor: {} }],
        meta: { total: 100, page: 1, limit: 10, totalPages: 10 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  adminFindAll(@Query() dto: FindAppointmentsDto) {
    return this.appointmentsService.adminFindAll(dto);
  }
}