import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';

@ApiTags('health')
@ApiSecurity('api-key')
@Controller()
export class AppController {

  /**
   * Health check endpoint
   * @returns A simple message indicating the app is running
   */
  @Get('/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns a simple message to verify that the application is running and accessible.'
  })
  @ApiResponse({
    status: 200,
    description: 'Application is running successfully',
    schema: {
      type: 'string',
      example: 'App is running!'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  getHello(): string {
    return "App is running!";
  }

}
