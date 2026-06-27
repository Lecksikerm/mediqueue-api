import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Headers,
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
  import { PaymentsService } from './payments.service';
  import { InitiatePaymentDto } from './dto/initiate-payment.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  import { User } from '../users/entities/user.entity';
  import { UserRole } from '../common/enums';
  import { PaginationDto } from '../common/pagination/pagination.dto';
  
  @ApiTags('Payments')
  @Controller('payments')
  export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}
  

    @Post('/webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Paystack webhook endpoint — do not call manually' })
    handleWebhook(
      @Body() payload: any,
      @Headers('x-paystack-signature') signature: string,
    ) {
      return this.paymentsService.handleWebhook(payload, signature);
    }
  
  
    @Post('/initiate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Patient] Initiate payment for an appointment' })
    @ApiResponse({
      status: 201,
      description: 'Payment initiated successfully',
      schema: {
        example: {
          message: 'Payment initiated successfully',
          payment: {
            id: 'uuid',
            reference: 'mq_abc123def456',
            amount: '₦5,000',
            status: 'pending',
          },
          paystack: {
            authorizationUrl: 'https://checkout.paystack.com/xxx',
            accessCode: 'xxx',
            reference: 'mq_abc123def456',
          },
          instruction: 'Redirect the user to authorizationUrl to complete payment',
        },
      },
    })
    @ApiResponse({ status: 400, description: 'Already paid or invalid appointment' })
    @ApiResponse({ status: 404, description: 'Appointment not found' })
    initiatePayment(
      @CurrentUser() user: User,
      @Body() dto: InitiatePaymentDto,
    ) {
      return this.paymentsService.initiatePayment(user.id, dto);
    }
  
    @Get('/verify/:reference')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Patient] Verify payment after redirect from Paystack' })
    @ApiParam({ name: 'reference', description: 'Payment reference from Paystack' })
    @ApiResponse({
      status: 200,
      description: 'Payment verified successfully',
      schema: {
        example: {
          message: 'Payment verified successfully',
          payment: {
            reference: 'mq_abc123def456',
            amount: '₦5,000',
            status: 'success',
            paidAt: '2026-06-20T10:00:00.000Z',
            channel: 'card',
          },
        },
      },
    })
    @ApiResponse({ status: 400, description: 'Payment was not successful' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    verifyPayment(@Param('reference') reference: string) {
      return this.paymentsService.verifyPayment(reference);
    }
  
    @Get('/my')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Patient] Get my payment history' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
    getMyPayments(@CurrentUser() user: User, @Query() dto: PaginationDto) {
      return this.paymentsService.getMyPayments(user.id, dto);
    }
  
    @Get('/appointment/:appointmentId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Patient] Get payment for a specific appointment' })
    @ApiParam({ name: 'appointmentId', description: 'Appointment UUID' })
    @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
    @ApiResponse({ status: 404, description: 'No payment found for this appointment' })
    getAppointmentPayment(
      @CurrentUser() user: User,
      @Param('appointmentId') appointmentId: string,
    ) {
      return this.paymentsService.getAppointmentPayment(appointmentId, user.id);
    }
  
    @Get('/reference/:reference')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PATIENT)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Patient] Get payment by reference' })
    @ApiParam({ name: 'reference', description: 'Payment reference' })
    @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
    getPaymentByReference(
      @CurrentUser() user: User,
      @Param('reference') reference: string,
    ) {
      return this.paymentsService.getPaymentByReference(reference, user.id);
    }
  
  
    @Get('/admin/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Admin] Get all payments' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({ status: 200, description: 'All payments retrieved successfully' })
    adminGetAllPayments(@Query() dto: PaginationDto) {
      return this.paymentsService.adminGetAllPayments(dto);
    }
  
    @Get('/admin/stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '[Admin] Get payment statistics and revenue report' })
    @ApiResponse({
      status: 200,
      description: 'Payment stats retrieved successfully',
      schema: {
        example: {
          summary: {
            totalPayments: 150,
            successfulPayments: 130,
            failedPayments: 10,
            pendingPayments: 10,
            totalRevenue: '₦650,000',
            successRate: '86.7%',
          },
          monthlyRevenue: [
            { month: '2026-06-01T00:00:00.000Z', revenue: '₦150,000', count: 30 },
          ],
        },
      },
    })
    adminGetPaymentStats() {
      return this.paymentsService.adminGetPaymentStats();
    }
  }