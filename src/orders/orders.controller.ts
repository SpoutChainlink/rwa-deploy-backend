import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { OrderBookService, Order } from './order-book.service';

@ApiTags('orders')
@ApiSecurity('api-key')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderBookService: OrderBookService
  ) {}

  @Get('user/:userAddress')
  @ApiOperation({ summary: 'Get all orders for a specific user' })
  @ApiParam({ name: 'userAddress', description: 'The user wallet address' })
  @ApiResponse({ status: 200, description: 'Returns all orders for the user' })
  async getOrdersByUser(@Param('userAddress') userAddress: string): Promise<Order[]> {
    return this.orderBookService.getAllOrdersByUser(userAddress);
  }

}
