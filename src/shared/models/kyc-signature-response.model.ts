import { ApiProperty } from '@nestjs/swagger';

export class KycSignatureResponse {
  @ApiProperty({
    description: 'The signature components for the KYC claim',
    example: {
      r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      s: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      v: 27
    },
    type: 'object',
    properties: {
      r: { type: 'string', description: 'Signature component r' },
      s: { type: 'string', description: 'Signature component s' },
      v: { type: 'number', description: 'Recovery parameter v' }
    }
  })
  signature: {
    r: string;
    s: string;
    v: number;
  };

  @ApiProperty({
    description: 'The address of the issuer who signed the KYC claim',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    type: String
  })
  issuerAddress: string;

  @ApiProperty({
    description: 'The hash of the encoded claim data',
    example: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    type: String
  })
  dataHash: string;

  @ApiProperty({
    description: 'The topic ID for the KYC claim (1 for KYC)',
    example: 1,
    type: Number
  })
  topic: number;
}
