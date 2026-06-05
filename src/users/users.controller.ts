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

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Patient/Doctor Routes ───────────────────────────────────

  @Get('/me')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('/me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('/me/change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  // ─── Admin Routes ────────────────────────────────────────────

  @Get('/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() dto: FindUsersDto) {
    return this.usersService.findAll(dto);
  }

  @Get('/inactive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findInactive(@Query() dto: PaginationDto) {
    return this.usersService.findInactive(dto);
  }

  @Get('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.deactivate(id, user);
  }

  @Patch('/:id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }
}
