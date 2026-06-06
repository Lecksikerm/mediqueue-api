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
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { FindDoctorsDto } from './dto/find-doctors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DoctorStatus, UserRole } from '../common/enums';
import { PaginationDto } from '../common/pagination/pagination.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // ─── Public Routes ───────────────────────────────────────────

  @Get('/all')
  findAll(@Query() dto: FindDoctorsDto) {
    return this.doctorsService.findAll(dto);
  }

  @Get('/single/:id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  // ─── Doctor Routes ───────────────────────────────────────────

  @Post('/')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  create(@CurrentUser() user: User, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(user.id, dto);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  getMyProfile(@CurrentUser() user: User) {
    return this.doctorsService.getMyProfile(user.id);
  }

  @Patch('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  update(@CurrentUser() user: User, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(user.id, dto);
  }

  @Patch('/me/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentUser() user: User,
    @Body('status') status: DoctorStatus,
  ) {
    return this.doctorsService.updateStatus(user.id, status);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin(@Query() dto: PaginationDto) {
    return this.doctorsService.findAllAdmin(dto);
  }

  @Delete('/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id);
  }
}
