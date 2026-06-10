import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('/doctor')
    @UseGuards(RolesGuard)
    @Roles(UserRole.DOCTOR)
    getDoctorAnalytics(
        @CurrentUser() user: User,
        @Query() dto: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getDoctorAnalytics(user.id, dto);
    }

    @Get('/patient')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PATIENT)
    getPatientAnalytics(
        @CurrentUser() user: User,
        @Query() dto: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getPatientAnalytics(user.id, dto);
    }
}