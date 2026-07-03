import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PartnerGuard } from '../../common/guards/auth.guards';
import { PartnerService } from './partner.service';

@ApiTags('partner')
@Controller('partner')
@UseGuards(JwtAuthGuard, PartnerGuard)
export class PartnerController {
  constructor(private readonly service: PartnerService) {}

  @Get('tenants')
  listTenants() {
    return this.service.listTenants();
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('revenue-trend')
  getRevenueTrend() {
    return this.service.getRevenueTrend();
  }

  @Patch('tenants/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.service.suspendTenant(id);
  }

  @Patch('tenants/:id/activate')
  activate(@Param('id') id: string) {
    return this.service.activateTenant(id);
  }
}
