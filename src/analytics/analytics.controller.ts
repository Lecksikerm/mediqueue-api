import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('/doctor')
    @UseGuards(RolesGuard)
    @Roles(UserRole.DOCTOR)
    @ApiOperation({ summary: "[Doctor] Get my own performance analytics" })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiResponse({
        status: 200,
        description: 'Doctor analytics retrieved successfully',
        schema: {
            example: {
                summary: {
                    totalAppointments: 80,
                    completed: 70,
                    cancelled: 5,
                    noShow: 5,
                    booked: 0,
                    inProgress: 0,
                    completionRate: '87.5%',
                    noShowRate: '6.3%',
                },
                queue: {
                    totalQueued: 90,
                    completedToday: 8,
                },
                monthlyBreakdown: [
                    { month: '2026-06-01T00:00:00.000Z', total: 30, completed: 26 },
                    { month: '2026-05-01T00:00:00.000Z', total: 28, completed: 24 },
                ],
                generatedAt: '2026-06-12T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Doctor only' })
    getDoctorAnalytics(
        @CurrentUser() user: User,
        @Query() dto: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getDoctorAnalytics(user.id, dto);
    }

    @Get('/patient')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiOperation({ summary: '[Patient] Get my own appointment analytics' })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiResponse({
        status: 200,
        description: 'Patient analytics retrieved successfully',
        schema: {
            example: {
                summary: {
                    totalAppointments: 10,
                    completed: 8,
                    cancelled: 1,
                    noShow: 1,
                    upcoming: 2,
                    attendanceRate: '80.0%',
                },
                generatedAt: '2026-06-12T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Patient only' })
    getPatientAnalytics(
        @CurrentUser() user: User,
        @Query() dto: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getPatientAnalytics(user.id, dto);
    }
}