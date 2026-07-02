import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guards';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ListTransactionsQueryDto } from './dto/list-transactions.dto';
import { TransactionService } from './transaction.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách giao dịch (filter + pagination)' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTransactionsQueryDto) {
    return this.transactionService.findAll(user.tenantId as string, query);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Top 3 hóa đơn AI gợi ý + confidence' })
  getMatches(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionService.getMatches(user.tenantId as string, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giao dịch' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionService.findOne(user.tenantId as string, id);
  }
}
