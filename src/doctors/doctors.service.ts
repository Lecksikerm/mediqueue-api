import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { User } from '../users/entities/user.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { FindDoctorsDto } from './dto/find-doctors.dto';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { paginate } from '../common/pagination/pagination.util';
import { DoctorStatus, UserRole } from '../common/enums';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ─── Create Doctor Profile ───────────────────────────────────
  async create(userId: string, dto: CreateDoctorDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException(
        'Only users with doctor role can create a doctor profile',
      );
    }

    const existing = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException(
        'Doctor profile already exists for this user',
      );
    }

    const doctor = this.doctorRepository.create({
      userId,
      ...dto,
    });

    await this.doctorRepository.save(doctor);

    return {
      message: 'Doctor profile created successfully',
      doctor,
    };
  }

  // ─── Get All Doctors (Public + Paginated) ────────────────────
  async findAll(dto: FindDoctorsDto) {
    const queryBuilder = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .select([
        'doctor.id',
        'doctor.specialization',
        'doctor.yearsOfExperience',
        'doctor.consultationFee',
        'doctor.languagesSpoken',
        'doctor.bio',
        'doctor.status',
        'doctor.createdAt',
        'user.id',
        'user.name',
        'user.email',
      ]);

    if (dto.specialization) {
      queryBuilder.andWhere(
        'LOWER(doctor.specialization) LIKE LOWER(:specialization)',
        { specialization: `%${dto.specialization}%` },
      );
    }

    if (dto.status) {
      queryBuilder.andWhere('doctor.status = :status', { status: dto.status });
    } else {
      queryBuilder.andWhere('doctor.status = :status', {
        status: DoctorStatus.ACTIVE,
      });
    }

    if (dto.maxFee) {
      queryBuilder.andWhere('doctor.consultationFee <= :maxFee', {
        maxFee: dto.maxFee,
      });
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit).orderBy('doctor.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─── Get My Doctor Profile ───────────────────────────────────
  async getMyProfile(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    return {
      ...doctor,
      user: {
        id: doctor.user.id,
        name: doctor.user.name,
        email: doctor.user.email,
        role: doctor.user.role,
        isActive: doctor.user.isActive,
        createdAt: doctor.user.createdAt,
      },
    };
  }

  // ─── Get Single Doctor by ID (Public) ───────────────────────
  async findOne(doctorId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
      relations: { user: true },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const { user } = doctor;
    return {
      ...doctor,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  // ─── Update Doctor Profile ───────────────────────────────────
  async update(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    Object.assign(doctor, dto);
    await this.doctorRepository.save(doctor);

    return {
      message: 'Doctor profile updated successfully',
      doctor,
    };
  }

  // ─── Update Doctor Status ────────────────────────────────────
  async updateStatus(userId: string, status: DoctorStatus) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    await this.doctorRepository.update(doctor.id, { status });

    return {
      message: `Status updated to ${status}`,
      status,
    };
  }

  // ─── Admin: Get All Doctors including inactive ───────────────
  async findAllAdmin(dto: PaginationDto) {
    const result = await paginate(this.doctorRepository, dto, {
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return {
      ...result,
      data: result.data.map((doctor) => ({
        ...doctor,
        user: {
          id: doctor.user.id,
          name: doctor.user.name,
          email: doctor.user.email,
          role: doctor.user.role,
          isActive: doctor.user.isActive,
          createdAt: doctor.user.createdAt,
        },
      })),
    };
  }

  // ─── Admin: Delete Doctor Profile ───────────────────────────
  async remove(doctorId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    await this.doctorRepository.remove(doctor);

    return { message: 'Doctor profile deleted successfully' };
  }
}
