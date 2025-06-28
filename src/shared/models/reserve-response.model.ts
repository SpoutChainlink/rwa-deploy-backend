import { ApiProperty } from '@nestjs/swagger';

export class AssetReserveResponse {
  @ApiProperty({
    description: 'The symbol of the asset',
    example: 'ETH',
    type: String
  })
  assetSymbol: string;

  @ApiProperty({
    description: 'The current reserve amount for the asset',
    example: 100.5,
    type: Number
  })
  reserveAmount: number;

  @ApiProperty({
    description: 'Timestamp when the reserve was last updated',
    example: '2025-06-27T10:30:00.000Z',
    type: String
  })
  updatedAt: string;
}

export class TotalReservesResponse {
  @ApiProperty({
    description: 'The total value of all reserves combined',
    example: 1250.75,
    type: Number
  })
  totalReserveValue: number;

  @ApiProperty({
    description: 'The number of assets with reserves',
    example: 5,
    type: Number
  })
  assetCount: number;

  @ApiProperty({
    description: 'Detailed breakdown of reserves by asset',
    type: [AssetReserveResponse]
  })
  assets: AssetReserveResponse[];
}
