import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { ReservesService } from './reserves.service';
import { AssetReserveResponse, TotalReservesResponse } from '../shared/models/reserve-response.model';

@ApiTags('reserves')
@ApiSecurity('api-key')
@Controller('reserves')
export class ReservesController {
  constructor(private readonly reservesService: ReservesService) {}

  /**
   * Get reserve information for a specific asset
   * @param assetSymbol - The symbol of the asset to get reserves for
   * @returns Promise with asset reserve information
   */
  @Get(':assetSymbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get asset reserve',
    description: 'Retrieves the current reserve amount for a specific asset by its symbol.'
  })
  @ApiParam({
    name: 'assetSymbol',
    description: 'The symbol of the asset (e.g., ETH, BTC)',
    example: 'ETH',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Asset reserve information retrieved successfully',
    type: AssetReserveResponse,
    example: {
      assetSymbol: 'ETH',
      reserveAmount: 100.5,
      updatedAt: '2025-06-27T10:30:00.000Z'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Asset reserve not found',
    example: {
      statusCode: 404,
      message: 'Asset reserve not found for ETH',
      error: 'Not Found'
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
  async getAssetReserve(@Param('assetSymbol') assetSymbol: string): Promise<AssetReserveResponse> {
    return this.reservesService.getAssetReserve(assetSymbol);
  }

  /**
   * Get total reserves across all assets
   * @returns Promise with total reserves information
   */
  @Get('total')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get total reserves',
    description: 'Retrieves the total reserves across all assets, including a breakdown by asset and the combined total value.'
  })
  @ApiResponse({
    status: 200,
    description: 'Total reserves information retrieved successfully',
    type: TotalReservesResponse,
    example: {
      totalReserveValue: 1250.75,
      assetCount: 3,
      assets: [
        {
          assetSymbol: 'ETH',
          reserveAmount: 100.5,
          updatedAt: '2025-06-27T10:30:00.000Z'
        },
        {
          assetSymbol: 'BTC',
          reserveAmount: 50.25,
          updatedAt: '2025-06-27T09:15:00.000Z'
        },
        {
          assetSymbol: 'USDC',
          reserveAmount: 1100.0,
          updatedAt: '2025-06-27T11:00:00.000Z'
        }
      ]
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
  async getTotalReserves(): Promise<TotalReservesResponse> {
    return this.reservesService.getTotalReserves();
  }
}
