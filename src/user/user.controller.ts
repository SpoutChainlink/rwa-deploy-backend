import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { UserService } from './user.service';
import { KycSignatureResponse } from '../shared/models/kyc-signature-response.model';
import { IssueKycSignatureDto } from '../shared/models/issue-kyc-signature.dto';

@Controller('user')
@ApiSecurity('api-key')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('kyc-signature')
  @ApiResponse({
    status: 200,
    description: 'Successfully issued KYC claim signature',
    type: KycSignatureResponse,
    example: {
      signature: {
        r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        s: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        v: 27
      },
      issuerAddress: '0x1234567890abcdef1234567890abcdef12345678',
      dataHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      topic: 1
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required fields',
    example: {
      statusCode: 400,
      message: 'userAddress is required'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    example: {
      statusCode: 500,
      message: 'Failed to issue KYC claim signature'
    }
  })
  async issueKycClaimSignature(
    @Body() issueKycSignatureDto: IssueKycSignatureDto
  ): Promise<KycSignatureResponse> {
    try {
      if (!issueKycSignatureDto.userAddress) {
        throw new HttpException('userAddress is required', HttpStatus.BAD_REQUEST);
      }

      if (!issueKycSignatureDto.onchainIDAddress) {
        throw new HttpException('onchainIDAddress is required', HttpStatus.BAD_REQUEST);
      }

      if (!issueKycSignatureDto.claimData) {
        throw new HttpException('claimData is required', HttpStatus.BAD_REQUEST);
      }

      if (!issueKycSignatureDto.topic) {
        throw new HttpException('topic is required', HttpStatus.BAD_REQUEST);
      }

      return await this.userService.issueKycClaimSignature(
        issueKycSignatureDto.userAddress,
        issueKycSignatureDto.onchainIDAddress,
        issueKycSignatureDto.claimData,
        issueKycSignatureDto.topic,
        issueKycSignatureDto.countryCode
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to issue KYC claim signature',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
