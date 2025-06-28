import { Controller, Get, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { AlpacaService } from './alpaca.service';

@ApiTags('alpaca')
@ApiSecurity('api-key')
@Controller('alpaca')
export class AlpacaController {
  constructor(private readonly alpacaService: AlpacaService) {}

  /**
   * Get latest stock quotes from Alpaca
   * @param symbols - Comma-separated stock symbols (e.g., AAPL,MSFT,GOOGL)
   * @returns Promise with latest quote data
   */
  @Get('quotes/latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get latest stock quotes',
    description: 'Fetches the latest stock quotes for the specified symbols from Alpaca Markets API.'
  })
  @ApiQuery({
    name: 'symbols',
    description: 'Comma-separated stock symbols (e.g., AAPL,MSFT,GOOGL)',
    example: 'AAPL',
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Latest quotes retrieved successfully',
    example: {
      quotes: {
        AAPL: {
          timeframe: 'latest',
          timestamp: '2023-12-07T20:59:59.999Z',
          bid: 193.18,
          ask: 193.25,
          bid_size: 1,
          ask_size: 1
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid symbols parameter',
    example: {
      statusCode: 400,
      message: 'Invalid symbols parameter',
      error: 'Bad Request'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch quotes',
    example: {
      statusCode: 500,
      message: 'Failed to fetch quotes for AAPL: Request failed',
      error: 'Internal Server Error'
    }
  })
  async getLatestQuotes(@Query('symbols') symbols: string): Promise<any> {
    if (!symbols) {
      throw new Error('Symbols parameter is required');
    }
    
    return await this.alpacaService.getLatestQuotes(symbols);
  }
}
