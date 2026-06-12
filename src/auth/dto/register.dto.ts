import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmed Musa' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PATIENT })
  @IsEnum(UserRole)
  role: UserRole;
}