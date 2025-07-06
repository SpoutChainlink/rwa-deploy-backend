import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { KycSignatureResponse } from '../shared/models/kyc-signature-response.model';
import { IDENTITY_REGISTRY_CONTRACT } from '../shared/abi/IDENTITY_REGISTRY.abi';
import { WEB3_HTTP } from '../web3/providers/provider.factory';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly identityRegistryAddress: string;

  constructor(
    private config: ConfigService,
    @Inject(WEB3_HTTP) private provider: ethers.JsonRpcProvider
  ) {
    const registryAddress = this.config.get<string>('IDENTITY_REGISTRY_ADDRESS');
    if (!registryAddress) {
      throw new Error('IDENTITY_REGISTRY_ADDRESS not configured');
    }
    this.identityRegistryAddress = registryAddress;
  }

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

      // Step 1: Convert claim data to bytes and hash it
      const claimDataBytes = ethers.toUtf8Bytes(claimData);
      const claimDataHash = ethers.keccak256(claimDataBytes);

      // Step 2: ABI encode using the hashed claim data
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes"],
        [onchainIDAddress, topic, claimDataHash] // Use hash here to match validation
      );
      
      // Step 3: Hash the encoded data
      const messageHash = ethers.keccak256(encoded);

      // Step 4: Sign the message hash
      const signatureString = await issuerWallet.signMessage(ethers.getBytes(messageHash));
      
      // Split signature into r, s, v components
      const signature = ethers.Signature.from(signatureString);

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signatureString
      );
      this.logger.log(`Signature valid: ${recoveredAddress.toLowerCase() === issuerWallet.address.toLowerCase()}`);

      // Register the identity in the registry
      await this.registerIdentity(userAddress, onchainIDAddress, countryCode, issuerWallet);

      return {
        signature: {
          r: signature.r,
          s: signature.s,
          v: signature.v
        },
        issuerAddress: issuerWallet.address,
        dataHash: messageHash,
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
