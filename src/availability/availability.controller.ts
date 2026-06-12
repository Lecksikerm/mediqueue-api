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
import { AvailabilityService } from './availability.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SlotStatus, UserRole } from '../common/enums';
import { PaginationDto } from '../common/pagination/pagination.dto';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  // ─── Public Routes ───────────────────────────────────────────

  @Get('/doctor/:doctorId')
  @ApiOperation({ summary: 'Get available slots for a doctor (public)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor UUID' })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15', description: 'Filter by specific date' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Available slots retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            date: '2026-06-15',
            startTime: '09:00:00',
            endTime: '09:30:00',
            startTimeFormatted: '9:00 AM',
            endTimeFormatted: '9:30 AM',
            timeRange: '9:00 AM - 9:30 AM',
            status: 'available',
          },
        ],
        meta: { total: 12, page: 1, limit: 10, totalPages: 2 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query() dto: PaginationDto,
    @Query('date') date?: string,
  ) {
    return this.availabilityService.getAvailableSlots(doctorId, dto, date);
  }

  // ─── Doctor Routes ───────────────────────────────────────────

  @Post('/')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Create a single or recurring availability slot' })
  @ApiResponse({
    status: 201,
    description: 'Slot created successfully',
    schema: {
      example: {
        message: 'Availability slot created successfully',
        slot: {
          id: 'uuid',
          date: '2026-06-15',
          startTime: '09:00',
          endTime: '09:30',
          startTimeFormatted: '9:00 AM',
          endTimeFormatted: '9:30 AM',
          timeRange: '9:00 AM - 9:30 AM',
          status: 'available',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'End time must be after start time' })
  @ApiResponse({ status: 400, description: 'This time slot overlaps with an existing slot' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  createSlot(@CurrentUser() user: User, @Body() dto: CreateSlotDto) {
    return this.availabilityService.createSlot(user.id, dto);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Get my availability slots' })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15' })
  @ApiQuery({ name: 'status', enum: SlotStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'My slots retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            date: '2026-06-15',
            timeRange: '9:00 AM - 9:30 AM',
            status: 'available',
          },
        ],
        meta: { total: 30, page: 1, limit: 20, totalPages: 2 },
      },
    },
  })
  getMySlots(@CurrentUser() user: User, @Query() dto: FindSlotsDto) {
    return this.availabilityService.getMySlots(user.id, dto);
  }

  @Patch('/me/block/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Block an availability slot' })
  @ApiParam({ name: 'slotId', description: 'Slot UUID to block' })
  @ApiResponse({
    status: 200,
    description: 'Slot blocked successfully',
    schema: { example: { message: 'Slot blocked successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Cannot block a slot that is already booked' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  blockSlot(@CurrentUser() user: User, @Param('slotId') slotId: string) {
    return this.availabilityService.blockSlot(user.id, slotId);
  }

  @Delete('/me/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Delete an availability slot' })
  @ApiParam({ name: 'slotId', description: 'Slot UUID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Slot deleted successfully',
    schema: { example: { message: 'Slot deleted successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete a booked slot' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  deleteSlot(@CurrentUser() user: User, @Param('slotId') slotId: string) {
    return this.availabilityService.deleteSlot(user.id, slotId);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/:doctorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Get all slots for a doctor (all statuses)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor UUID' })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-15' })
  @ApiQuery({ name: 'status', enum: SlotStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'All slots for the doctor retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  adminGetDoctorSlots(
    @Param('doctorId') doctorId: string,
    @Query() dto: FindSlotsDto,
  ) {
    return this.availabilityService.adminGetDoctorSlots(doctorId, dto);
  }
}