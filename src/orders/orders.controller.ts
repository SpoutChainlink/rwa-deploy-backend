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

  /**
   * Buy order endpoint - increases asset reserves
   * @param orderRequest - The buy order details
   * @returns Promise with order result
   */
  @Post('buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Process a buy order',
    description: 'Processes a buy order for a specified asset, increasing the asset reserves in the system.'
  })
  @ApiBody({
    type: OrderRequest,
    description: 'Buy order details including asset symbol and amount'
  })
  @ApiResponse({
    status: 200,
    description: 'Buy order processed successfully',
    type: OrderResponse,
    example: {
      success: true,
      message: 'Successfully bought 10.5 ETH',
      assetSymbol: 'ETH',
      amount: 10.5,
      newReserveAmount: 100.5
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
    example: {
      statusCode: 400,
      message: 'Invalid asset symbol or amount',
      error: 'Bad Request'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async buy(@Body() orderRequest: OrderRequest): Promise<OrderResponse> {
    return this.ordersService.buyOrder(orderRequest);
  }

  /**
   * Sell order endpoint - decreases asset reserves
   * @param orderRequest - The sell order details
   * @returns Promise with order result
   */
  @Post('sell')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Process a sell order',
    description: 'Processes a sell order for a specified asset, decreasing the asset reserves in the system. Validates that sufficient reserves are available before processing.'
  })
  @ApiBody({
    type: OrderRequest,
    description: 'Sell order details including asset symbol and amount'
  })
  @ApiResponse({
    status: 200,
    description: 'Sell order processed successfully',
    type: OrderResponse,
    example: {
      success: true,
      message: 'Successfully sold 5.2 ETH',
      assetSymbol: 'ETH',
      amount: 5.2,
      newReserveAmount: 95.3
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or insufficient reserves',
    examples: {
      'Invalid Input': {
        summary: 'Invalid input parameters',
        value: {
          statusCode: 400,
          message: 'Invalid asset symbol or amount',
          error: 'Bad Request'
        }
      },
      'Insufficient Reserves': {
        summary: 'Not enough reserves available',
        value: {
          statusCode: 400,
          message: 'Insufficient reserves. Available: 10.0, Requested: 15.0',
          error: 'Bad Request'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async sell(@Body() orderRequest: OrderRequest): Promise<OrderResponse> {
    return this.ordersService.sellOrder(orderRequest);
  }
}
