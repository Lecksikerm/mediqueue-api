import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { paginate } from '../common/pagination/pagination.util';
import { FindUsersDto } from './dto/find-users.dto';
import { PaginationDto } from '../common/pagination/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ─── Get My Profile ──────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { doctor: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.sanitizeUser(user);
  }

  // ─── Update My Profile ───────────────────────────────────────
  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, dto);
    await this.userRepository.save(user);

    return {
      message: 'Profile updated successfully',
      user: this.sanitizeUser(user),
    };
  }

  // ─── Change Password ─────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  // ─── Get All Users (Admin) ───────────────────────────────────
  async findAll(dto: FindUsersDto) {
    const where: Partial<User> = {};

    if (dto.role) where.role = dto.role;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;

    const result = await paginate(this.userRepository, dto, {
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      ...result,
      data: result.data.map((user) => this.sanitizeUser(user)),
    };
  }

  // ─── Get Single User (Admin) ─────────────────────────────────
  async findOne(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { doctor: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.sanitizeUser(user);
  }

  // ─── Deactivate User (Admin) ─────────────────────────────────
  async deactivate(targetUserId: string, requestingUser: User) {
    if (targetUserId === requestingUser.id) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.isActive) {
      throw new BadRequestException('User is already deactivated');
    }

    await this.userRepository.update(targetUserId, {
      isActive: false,
      refreshToken: null,
    });

    return { message: `User ${user.name} has been deactivated` };
  }

  // ─── Get Inactive Users (Admin) ──────────────────────────────
  async findInactive(dto: PaginationDto) {
    const result = await paginate(this.userRepository, dto, {
      where: { isActive: false },
      order: { updatedAt: 'DESC' },
    });

    return {
      ...result,
      data: result.data.map((user) => this.sanitizeUser(user)),
    };
  }

  // ─── Reactivate User (Admin) ─────────────────────────────────
  async reactivate(targetUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.isActive) {
      throw new BadRequestException('User is already active');
    }

    await this.userRepository.update(targetUserId, { isActive: true });

    return { message: `User ${user.name} has been reactivated` };
  }

  // ─── Helper ──────────────────────────────────────────────────
  private sanitizeUser(user: User) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
