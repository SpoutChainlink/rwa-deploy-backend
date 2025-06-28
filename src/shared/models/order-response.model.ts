import { ApiProperty } from '@nestjs/swagger';

export class OrderResponse {
  @ApiProperty({
    description: 'Whether the order was processed successfully',
    example: true,
    type: Boolean
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Successfully bought 10.5 ETH',
    type: String
  })
  message: string;

  @ApiProperty({
    description: 'The symbol of the asset that was traded',
    example: 'ETH',
    type: String
  })
  assetSymbol: string;

  @ApiProperty({
    description: 'The amount of the asset that was traded',
    example: 10.5,
    type: Number
  })
  amount: number;

  @ApiProperty({
    description: 'The new reserve amount after the trade',
    example: 100.5,
    type: Number
  })
  newTokenReserve: number;

  @ApiProperty({
    description: 'The number of tokens burned for sell orders, or minted for buy orders',
    example: 5,
    type: Number,
    required: false
  })
  tokenBurned?: number;

  @ApiProperty({
    description: 'The number of tokens minted for buy orders',
    example: 5,
    type: Number,
    required: false
  })
  tokenMinted?: number;
}