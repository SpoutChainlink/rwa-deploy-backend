import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderResponse } from 'src/shared/models/order-response.model';
import { OrderRequest } from 'src/shared/models/order-request.model';

@ApiTags('orders')
@ApiSecurity('api-key')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

}
