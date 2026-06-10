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
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('/overview')
    getSystemOverview() {
        return this.adminService.getSystemOverview();
    }

    @Get('/users/growth')
    getUserGrowth(@Query() dto: AdminQueryDto) {
        return this.adminService.getUserGrowth(dto);
    }

    @Get('/appointments/stats')
    getAppointmentStats(@Query() dto: AdminQueryDto) {
        return this.adminService.getAppointmentStats(dto);
    }

    @Get('/doctors/performance')
    getDoctorPerformance(@Query() dto: AdminQueryDto) {
        return this.adminService.getDoctorPerformance(dto);
    }

    @Get('/revenue')
    getRevenueReport(@Query() dto: AdminQueryDto) {
        return this.adminService.getRevenueReport(dto);
    }

    @Get('/queues/live')
    getLiveQueueOverview() {
        return this.adminService.getLiveQueueOverview();
    }

    @Patch('/doctors/:id/suspend')
    @HttpCode(HttpStatus.OK)
    suspendDoctor(@Param('id') id: string) {
        return this.adminService.suspendDoctor(id);
    }

    @Patch('/doctors/:id/unsuspend')
    @HttpCode(HttpStatus.OK)
    unsuspendDoctor(@Param('id') id: string) {
        return this.adminService.unsuspendDoctor(id);
    }
}