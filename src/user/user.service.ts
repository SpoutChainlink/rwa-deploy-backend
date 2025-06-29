import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { KycSignatureResponse } from '../shared/models/kyc-signature-response.model';
import { IDENTITY_REGISTRY_CONTRACT } from '../shared/abi/IDENTITY_REGISTRY.abi';
import { WEB3_HTTP } from '../web3/providers/provider.factory';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly identityRegistryAddress = "0x296D988cd8193D5c67a71A68E9Bdf533f53f943E";

  constructor(
    private config: ConfigService,
    @Inject(WEB3_HTTP) private provider: ethers.JsonRpcProvider
  ) {}

  async issueKycClaimSignature(
    userAddress: string,
    onchainIDAddress: string,
    claimData: string,
    topic: number,
    countryCode: number = 91
  ): Promise<KycSignatureResponse> {
    this.logger.log(`Issuing KYC claim signature for user: ${userAddress}, onchainID: ${onchainIDAddress}, topic: ${topic}`);
    try {
      // Validate addresses
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }
      if (!ethers.isAddress(onchainIDAddress)) {
        throw new Error('Invalid onchain ID address');
      }

      // Get issuer private key from environment
      const issuerPrivateKey = this.config.get<string>('PRIVATE_KEY');
      if (!issuerPrivateKey) {
        throw new Error('Issuer private key not configured');
      }

      // Create issuer wallet
      const issuerWallet = new ethers.Wallet(issuerPrivateKey, this.provider);

      // Use provided claim data and topic from frontend
      const claimDataBytes = ethers.toUtf8Bytes(claimData);
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes"],
        [onchainIDAddress, topic, claimDataBytes]
      );
      const dataHash = ethers.keccak256(encoded);
      const ethHash = ethers.hashMessage(ethers.getBytes(dataHash));
      const signature = issuerWallet.signingKey.sign(ethHash);

      // Register the identity in the registry
      await this.registerIdentity(userAddress, onchainIDAddress, countryCode, issuerWallet);

      return {
        signature: {
          r: signature.r,
          s: signature.s,
          v: signature.v
        },
        issuerAddress: issuerWallet.address,
        dataHash,
        topic
      };
    } catch (error) {
      throw new Error(`Failed to issue KYC claim signature: ${error.message}`);
    }
  }

  private async registerIdentity(
    userAddress: string,
    onchainIDAddress: string,
    countryCode: number,
    agentSigner: ethers.Wallet
  ): Promise<void> {
    this.logger.log(`Registering identity for user: ${userAddress} with onchainID: ${onchainIDAddress}`);
    
    try {
      // Create contract instance
      const identityRegistry = new ethers.Contract(
        this.identityRegistryAddress,
        IDENTITY_REGISTRY_CONTRACT,
        agentSigner
      );

      // Check if the identity is already registered
      const isRegistered = await identityRegistry.contains(userAddress);
      if (isRegistered) {
        this.logger.log(`Identity already registered for user: ${userAddress}`);
        return;
      }

      // Register the identity
      const tx = await identityRegistry.registerIdentity(
        userAddress,        // User's EOA
        onchainIDAddress,   // User's OnchainID contract
        countryCode         // Country code
      );

      this.logger.log(`Identity registration transaction sent: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      this.logger.log(`Identity registered successfully. Transaction confirmed in block: ${receipt.blockNumber}`);
    } catch (error) {
      this.logger.error(`Failed to register identity: ${error.message}`);
      throw new Error(`Identity registration failed: ${error.message}`);
    }
  }
}
