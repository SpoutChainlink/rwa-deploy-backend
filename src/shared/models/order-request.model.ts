import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class OrderRequest {
  
  @ApiProperty({
    description: 'The user who is placing the order',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({
    description: 'The token address for the asset to trade',
    example: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'The symbol of the asset to trade',
    example: 'LQD',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  assetSymbol: string;

  @ApiProperty({
    description: 'The amount of the asset to buy or sell',
    example: 10.5,
    type: Number,
    minimum: 0.000001
  })
  @IsNumber()
  @IsPositive()
  usdcAmount: number;

  @ApiProperty({
    description: 'The amount of the asset to buy or sell in the asset\'s smallest unit',
    example: 1000000,
    type: Number,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  assetAmount: number;

  @ApiProperty({
    description: 'The price at which the asset is being bought or sold',
    example: 2000.5,
    type: Number,
    minimum: 0.01
  })
  @IsNumber()
  @IsPositive()
  price: number;
}
