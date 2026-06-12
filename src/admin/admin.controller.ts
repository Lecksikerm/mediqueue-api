import {
    Controller,
    Get,
    Patch,
    Query,
    Param,
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
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('/overview')
    @ApiOperation({ summary: '[Admin] Get system-wide overview stats' })
    @ApiResponse({
        status: 200,
        description: 'System overview retrieved successfully',
        schema: {
            example: {
                users: { total: 120, patients: 100, doctors: 18, admins: 2 },
                doctors: { total: 18, active: 14, inactive: 2, onLeave: 2 },
                appointments: {
                    total: 500,
                    completed: 420,
                    cancelled: 40,
                    noShow: 15,
                    completionRate: '84.0%',
                },
                queues: { currentlyWaiting: 5 },
                slots: { total: 800, available: 500, booked: 300 },
                generatedAt: '2026-06-12T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getSystemOverview() {
        return this.adminService.getSystemOverview();
    }

    @Get('/users/growth')
    @ApiOperation({ summary: '[Admin] Get user registration growth over time' })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'User growth data retrieved successfully',
        schema: {
            example: {
                data: [
                    { date: '2026-06-01T00:00:00.000Z', role: 'patient', count: 5 },
                    { date: '2026-06-01T00:00:00.000Z', role: 'doctor', count: 2 },
                ],
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getUserGrowth(@Query() dto: AdminQueryDto) {
        return this.adminService.getUserGrowth(dto);
    }

    @Get('/appointments/stats')
    @ApiOperation({ summary: '[Admin] Get appointment statistics over time' })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'Appointment stats retrieved successfully',
        schema: {
            example: {
                data: [
                    { date: '2026-06-01T00:00:00.000Z', status: 'completed', count: 20 },
                    { date: '2026-06-01T00:00:00.000Z', status: 'cancelled', count: 3 },
                ],
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getAppointmentStats(@Query() dto: AdminQueryDto) {
        return this.adminService.getAppointmentStats(dto);
    }

    @Get('/doctors/performance')
    @ApiOperation({ summary: '[Admin] Get doctor performance report' })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'Doctor performance data retrieved successfully',
        schema: {
            example: {
                data: [
                    {
                        doctorId: 'uuid',
                        doctorName: 'Dr. Adebayo',
                        specialization: 'Cardiology',
                        totalAppointments: 80,
                        completed: 70,
                        cancelled: 5,
                        noShow: 5,
                        completionRate: '87.5%',
                    },
                ],
                meta: { page: 1, limit: 10 },
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getDoctorPerformance(@Query() dto: AdminQueryDto) {
        return this.adminService.getDoctorPerformance(dto);
    }

    @Get('/revenue')
    @ApiOperation({ summary: '[Admin] Get revenue report by doctor and month' })
    @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
    @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
    @ApiResponse({
        status: 200,
        description: 'Revenue report retrieved successfully',
        schema: {
            example: {
                summary: {
                    totalRevenue: '₦350,000',
                    totalCompletedAppointments: 70,
                },
                data: [
                    {
                        month: '2026-06-01T00:00:00.000Z',
                        doctorName: 'Dr. Adebayo',
                        specialization: 'Cardiology',
                        consultationFee: '₦5,000',
                        completedAppointments: 30,
                        revenue: '₦150,000',
                    },
                ],
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getRevenueReport(@Query() dto: AdminQueryDto) {
        return this.adminService.getRevenueReport(dto);
    }

    @Get('/queues/live')
    @ApiOperation({ summary: '[Admin] Get live queue overview across all active doctors' })
    @ApiResponse({
        status: 200,
        description: 'Live queue overview retrieved successfully',
        schema: {
            example: {
                totalDoctorsActive: 14,
                totalPatientsWaiting: 22,
                doctors: [
                    {
                        doctorId: 'uuid',
                        doctorName: 'Dr. Adebayo',
                        specialization: 'Cardiology',
                        liveQueueCount: 5,
                        waitingCount: 5,
                        estimatedClearTime: '~75 minutes',
                    },
                ],
                generatedAt: '2026-06-12T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    getLiveQueueOverview() {
        return this.adminService.getLiveQueueOverview();
    }

    @Patch('/doctors/:id/suspend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '[Admin] Suspend a doctor (sets inactive + deactivates account)' })
    @ApiParam({ name: 'id', description: 'Doctor UUID to suspend' })
    @ApiResponse({
        status: 200,
        description: 'Doctor suspended successfully',
        schema: { example: { message: 'Dr. Adebayo has been suspended' } },
    })
    @ApiResponse({ status: 404, description: 'Doctor not found' })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    suspendDoctor(@Param('id') id: string) {
        return this.adminService.suspendDoctor(id);
    }

    @Patch('/doctors/:id/unsuspend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '[Admin] Unsuspend a doctor (restores active status)' })
    @ApiParam({ name: 'id', description: 'Doctor UUID to unsuspend' })
    @ApiResponse({
        status: 200,
        description: 'Doctor unsuspended successfully',
        schema: { example: { message: 'Dr. Adebayo has been unsuspended' } },
    })
    @ApiResponse({ status: 404, description: 'Doctor not found' })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    unsuspendDoctor(@Param('id') id: string) {
        return this.adminService.unsuspendDoctor(id);
    }
}