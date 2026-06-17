import {
    Controller,
    Get,
    Post,
    Patch,
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
} from '@nestjs/swagger';
import { VideoService } from './video.service';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';
import { VideoQueryDto } from './dto/video-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole, VideoSessionStatus } from '../common/enums';

@ApiTags('Video Consultations')
@ApiBearerAuth('access-token')
@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    @Get('/ice-servers')
    @ApiOperation({ summary: 'Get ICE/STUN server configuration for WebRTC' })
    @ApiResponse({
        status: 200,
        description: 'ICE server configuration',
        schema: {
            example: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        },
    })
    getIceServers() {
        return this.videoService.getIceServers();
    }


    @Post('/session')
    @UseGuards(RolesGuard)
    @Roles(UserRole.DOCTOR)
    @ApiOperation({ summary: '[Doctor] Create a video session for an appointment' })
    @ApiResponse({
        status: 201,
        description: 'Video session created successfully',
        schema: {
            example: {
                message: 'Video session created successfully',
                session: {
                    id: 'uuid',
                    roomId: 'room_abc123def456',
                    status: 'waiting',
                    appointmentId: 'uuid',
                },
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Video session can only be created for active appointments' })
    @ApiResponse({ status: 404, description: 'Appointment or doctor not found' })
    createSession(
        @CurrentUser() user: User,
        @Body() dto: CreateVideoSessionDto,
    ) {
        return this.videoService.createSession(user.id, dto);
    }


    @Get('/session/join/:appointmentId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiOperation({ summary: '[Patient] Join a video session by appointment ID' })
    @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Joined video session successfully',
        schema: {
            example: {
                message: 'Joined video session successfully',
                session: {
                    id: 'uuid',
                    roomId: 'room_abc123def456',
                    status: 'active',
                },
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Video session not found — wait for the doctor to start the call' })
    @ApiResponse({ status: 400, description: 'This video session has already ended' })
    joinSession(
        @CurrentUser() user: User,
        @Param('appointmentId') appointmentId: string,
    ) {
        return this.videoService.joinSession(user.id, appointmentId);
    }

    // ─── Shared routes (Doctor + Patient) ───────────────────────

    @Get('/session/appointment/:appointmentId')
    @ApiOperation({ summary: '[Doctor/Patient] Get video session by appointment ID' })
    @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Video session retrieved successfully',
    })
    @ApiResponse({ status: 403, description: 'Access denied' })
    @ApiResponse({ status: 404, description: 'No video session found for this appointment' })
    getSessionByAppointment(
        @CurrentUser() user: User,
        @Param('appointmentId') appointmentId: string,
    ) {
        return this.videoService.getSessionByAppointment(user.id, appointmentId);
    }

    @Patch('/session/:id/end')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '[Doctor/Patient] End a video session' })
    @ApiParam({ name: 'id', description: 'Video session UUID' })
    @ApiResponse({
        status: 200,
        description: 'Video session ended successfully',
        schema: {
            example: {
                message: 'Video session ended successfully',
                durationSeconds: 1800,
                durationFormatted: '30m 0s',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Session has already ended' })
    @ApiResponse({ status: 403, description: 'You are not a participant in this session' })
    endSession(
        @CurrentUser() user: User,
        @Param('id') id: string,
    ) {
        return this.videoService.endSession(user.id, id);
    }

    @Get('/sessions/my')
    @ApiOperation({ summary: '[Doctor/Patient] Get my video sessions' })
    @ApiQuery({ name: 'status', enum: VideoSessionStatus, required: false })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'My video sessions retrieved successfully',
    })
    getMySessions(@CurrentUser() user: User, @Query() dto: VideoQueryDto) {
        return this.videoService.getMySessions(user.id, dto);
    }


    @Get('/sessions/admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[Admin] Get all video sessions' })
    @ApiQuery({ name: 'status', enum: VideoSessionStatus, required: false })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'All video sessions retrieved successfully',
    })
    @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
    adminGetAllSessions(@Query() dto: VideoQueryDto) {
        return this.videoService.adminGetAllSessions(dto);
    }
}