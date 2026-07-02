import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@paypilot/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCustomersQueryDto) {
    return this.customerService.findAll(user.tenantId as string, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customerService.findOne(user.tenantId as string, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Tạo khách hàng mới (tự động embedding)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(user.tenantId as string, dto);
  }
}
