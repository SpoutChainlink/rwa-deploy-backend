import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEthereumAddress, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class IssueKycSignatureDto {
  @ApiProperty({
    description: 'The user EOA address that will be registered with the onchain identity',
    example: '0xabcdef1234567890abcdef1234567890abcdef12',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'The onchain identity address for which to issue the KYC claim signature',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress()
  onchainIDAddress: string;

  @ApiProperty({
    description: 'The claim data to be signed',
    example: 'KYC',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  claimData: string;

  @ApiProperty({
    description: 'The topic number for the claim (e.g., 1 for KYC)',
    example: 1,
    type: Number
  })
  @IsNumber()
  @IsPositive()
  topic: number;

  @ApiProperty({
    description: 'The country code for the user (defaults to 91 for India)',
    example: 91,
    type: Number,
    required: false
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  countryCode?: number;
}
