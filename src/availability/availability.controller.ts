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
import { AvailabilityService } from './availability.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/pagination/pagination.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // ─── Public Routes ───────────────────────────────────────────

  @Get('/doctor/:doctorId')
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
  createSlot(@CurrentUser() user: User, @Body() dto: CreateSlotDto) {
    return this.availabilityService.createSlot(user.id, dto);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  getMySlots(@CurrentUser() user: User, @Query() dto: FindSlotsDto) {
    return this.availabilityService.getMySlots(user.id, dto);
  }

  @Patch('/me/block/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  blockSlot(@CurrentUser() user: User, @Param('slotId') slotId: string) {
    return this.availabilityService.blockSlot(user.id, slotId);
  }

  @Delete('/me/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  deleteSlot(@CurrentUser() user: User, @Param('slotId') slotId: string) {
    return this.availabilityService.deleteSlot(user.id, slotId);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/:doctorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminGetDoctorSlots(
    @Param('doctorId') doctorId: string,
    @Query() dto: FindSlotsDto,
  ) {
    return this.availabilityService.adminGetDoctorSlots(doctorId, dto);
  }
}
