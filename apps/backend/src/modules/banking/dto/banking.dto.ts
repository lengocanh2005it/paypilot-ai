import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CasWebhookTransactionDto {
  @IsString()
  id!: string;

  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  transactionDateTime!: string;

  @IsOptional()
  @IsString()
  counterAccountName?: string;

  @IsOptional()
  @IsString()
  fiName?: string;
}

export class CasWebhookDto {
  @IsString()
  webhookType!: string;

  @IsString()
  grantId!: string;

  @Type(() => CasWebhookTransactionDto)
  transaction!: CasWebhookTransactionDto;
}
