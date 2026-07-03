import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePlanPricingDto {
  @IsNumber()
  @Min(0)
  pricePerMonth: number;

  @IsNumber()
  @Min(1)
  transactionQuota: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overagePricePerTransaction?: number;
}
