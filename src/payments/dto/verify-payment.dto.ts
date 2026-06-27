import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
    @ApiProperty({
        example: 'mq_ref_abc123xyz',
        description: 'Payment reference returned from Paystack',
    })
    @IsNotEmpty()
    @IsString()
    reference: string;
}