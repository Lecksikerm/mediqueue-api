import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
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
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums';
import { FindUsersDto } from './dto/find-users.dto';
import { PaginationDto } from '../common/pagination/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ─── Patient/Doctor Routes ───────────────────────────────────

  @Get('/me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Ahmed Musa',
        email: 'ahmed@example.com',
        role: 'patient',
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('/me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        message: 'Profile updated successfully',
        user: { id: 'uuid', name: 'Ahmed Updated', email: 'ahmed@example.com' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('/me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: { message: 'Password changed successfully' },
    },
  })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 400, description: 'New password must differ from current' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get all users with optional role filter' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      example: {
        data: [{ id: 'uuid', name: 'Ahmed Musa', role: 'patient' }],
        meta: { total: 50, page: 1, limit: 10, totalPages: 5 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  findAll(@Query() dto: FindUsersDto) {
    return this.usersService.findAll(dto);
  }

  @Get('/inactive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get all inactive/suspended users' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of inactive users',
    schema: {
      example: {
        data: [{ id: 'uuid', name: 'John Doe', isActive: false }],
        meta: { total: 5, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  findInactive(@Query() dto: PaginationDto) {
    return this.usersService.findInactive(dto);
  }

  @Get('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get a single user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Deactivate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID to deactivate' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    schema: { example: { message: 'User Ahmed Musa has been deactivated' } },
  })
  @ApiResponse({ status: 400, description: 'User is already deactivated' })
  @ApiResponse({ status: 403, description: 'Cannot deactivate your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.deactivate(id, user);
  }

  @Patch('/:id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Reactivate a deactivated user account' })
  @ApiParam({ name: 'id', description: 'User UUID to reactivate' })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    schema: { example: { message: 'User Ahmed Musa has been reactivated' } },
  })
  @ApiResponse({ status: 400, description: 'User is already active' })
  @ApiResponse({ status: 404, description: 'User not found' })
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }
}