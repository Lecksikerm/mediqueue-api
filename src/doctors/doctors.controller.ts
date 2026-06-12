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
  ApiBody,
} from '@nestjs/swagger';
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

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) { }

  // ─── Public Routes ───────────────────────────────────────────

  @Get('/all')
  @ApiOperation({ summary: 'Get all active doctors (public, paginated, filterable)' })
  @ApiQuery({ name: 'specialization', required: false, example: 'Cardiology' })
  @ApiQuery({ name: 'maxFee', required: false, example: 5000 })
  @ApiQuery({ name: 'status', enum: DoctorStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active doctors',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            specialization: 'Cardiology',
            yearsOfExperience: 8,
            consultationFee: '5000.00',
            status: 'active',
            user: { id: 'uuid', name: 'Dr. Adebayo', email: 'doctor@example.com' },
          },
        ],
        meta: { total: 20, page: 1, limit: 10, totalPages: 2 },
      },
    },
  })
  findAll(@Query() dto: FindDoctorsDto) {
    return this.doctorsService.findAll(dto);
  }

  @Get('/single/:id')
  @ApiOperation({ summary: 'Get a single doctor by ID (public)' })
  @ApiParam({ name: 'id', description: 'Doctor UUID' })
  @ApiResponse({ status: 200, description: 'Doctor retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  // ─── Doctor Routes ───────────────────────────────────────────

  @Post('/')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Create a doctor profile' })
  @ApiResponse({
    status: 201,
    description: 'Doctor profile created successfully',
    schema: {
      example: {
        message: 'Doctor profile created successfully',
        doctor: {
          id: 'uuid',
          specialization: 'Cardiology',
          yearsOfExperience: 8,
          consultationFee: '5000.00',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Doctor profile already exists' })
  @ApiResponse({ status: 403, description: 'Only users with doctor role can create a profile' })
  create(@CurrentUser() user: User, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(user.id, dto);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Get my doctor profile' })
  @ApiResponse({ status: 200, description: 'Doctor profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  getMyProfile(@CurrentUser() user: User) {
    return this.doctorsService.getMyProfile(user.id);
  }

  @Patch('/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Update my doctor profile' })
  @ApiResponse({
    status: 200,
    description: 'Doctor profile updated successfully',
    schema: {
      example: {
        message: 'Doctor profile updated successfully',
        doctor: { id: 'uuid', specialization: 'Neurology' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  update(@CurrentUser() user: User, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(user.id, dto);
  }

  @Patch('/me/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Doctor] Update my availability status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'on_leave'],
          example: 'on_leave',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    schema: {
      example: { message: 'Status updated to on_leave', status: 'on_leave' },
    },
  })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Get all doctors including inactive' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all doctors',
    schema: {
      example: {
        data: [{ id: 'uuid', specialization: 'Cardiology', status: 'on_leave' }],
        meta: { total: 10, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  findAllAdmin(@Query() dto: PaginationDto) {
    return this.doctorsService.findAllAdmin(dto);
  }

  @Delete('/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Delete a doctor profile' })
  @ApiParam({ name: 'id', description: 'Doctor UUID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Doctor profile deleted successfully',
    schema: { example: { message: 'Doctor profile deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id);
  }
}