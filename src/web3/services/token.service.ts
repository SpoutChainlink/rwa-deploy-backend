import { Inject, Injectable } from '@nestjs/common';
import { WEB3_HTTP } from '../providers/provider.factory';
import { ethers } from 'ethers';
import { ERC3643_ABI } from 'src/shared/abi/ERC3643.abi';
import { IDENTITY_REGISTRY_CONTRACT } from 'src/shared/abi/IDENTITY_REGISTRY.abi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    private readonly identityRegistryAddress: string;

    constructor(
        @Inject(WEB3_HTTP) 
        private httpProvider: ethers.JsonRpcProvider,
        private readonly config: ConfigService,
    ) {
        const registryAddress = this.config.get<string>('IDENTITY_REGISTRY_ADDRESS');
        if (!registryAddress) {
            throw new Error('IDENTITY_REGISTRY_ADDRESS not configured');
        }
        this.identityRegistryAddress = registryAddress;
    }

    /**
     * Verify if a user is verified in the identity registry
     * @param userAddress - The user address to verify
     * @returns boolean indicating if user is verified
     */
    private async verifyUserIdentity(userAddress: string): Promise<boolean> {
        try {
            const identityRegistry = new ethers.Contract(
                this.identityRegistryAddress,
                IDENTITY_REGISTRY_CONTRACT,
                this.httpProvider
            );
            
            const isVerified = await identityRegistry.isVerified(userAddress);
            return isVerified;
        } catch (error) {
            console.error(`Error verifying user identity for ${userAddress}:`, error);
            return false;
        }
    }

    /**
     * Mint ERC3643 RWA tokens to a user address
     * @param userAddress - The address to mint tokens to
     * @param tokenAddress - The ERC3643 token contract address
     * @param amount - The amount of tokens to mint (in wei/smallest unit)
     * @returns Transaction hash
     */
    async mintTokens(userAddress: string, tokenAddress: string, amount: string): Promise<string> {
        try {
            // Validate addresses
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }
            if (!ethers.isAddress(tokenAddress)) {
                throw new Error('Invalid token address');
            }

            // Verify user identity in identity registry
            const isVerified = await this.verifyUserIdentity(userAddress);
            if (!isVerified) {
                throw new Error(`User ${userAddress} is not verified in identity registry`);
            }
            console.log(`User ${userAddress} is verified in identity registry`);

            // Create agent signer from private key
            const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
            
            // Create contract instance with agent signer
            const token = new ethers.Contract(tokenAddress, ERC3643_ABI, agentSigner);

            // Get the actual decimals from the token contract
            const decimals = await token.decimals();
            
            const isAgent = await token.isAgent(agentSigner.address);
            
            if (!isAgent) {
                throw new Error(`Signer ${agentSigner.address} is not an agent on the token contract. Please add this address as an agent.`);
            }
            console.log(`Signer ${agentSigner.address} is an agent on the token contract ${tokenAddress}`);

            // Use the actual token decimals instead of hardcoded 18
            const mintAmount = ethers.parseUnits(amount, decimals);
            const gasEstimate = await token.mint.estimateGas(userAddress, mintAmount);
            const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
            
            // Call mint function with gas limit
            const tx = await token.mint(userAddress, mintAmount, { gasLimit });
            console.log(`Minting ${amount} tokens to ${userAddress} on contract ${tokenAddress}`);
            console.log(`Transaction hash: ${tx.hash}`);
            
            // Wait for transaction confirmation
            await tx.wait();
            console.log(`Transaction confirmed: ${tx.hash}`);
            
            return tx.hash;
        } catch (error) {
            console.error('Error minting tokens:', error);
            throw new Error(`Failed to mint tokens: ${error.message}`);
        }
    }

    /**
     * Burn ERC3643 RWA tokens from a user address
     * @param userAddress - The address to burn tokens from
     * @param tokenAddress - The ERC3643 token contract address
     * @param amount - The amount of tokens to burn (in wei/smallest unit)
     * @returns Transaction hash
     */
    async burnTokens(userAddress: string, tokenAddress: string, amount: string): Promise<string> {
    try {
        // Validate addresses
        if (!ethers.isAddress(userAddress)) {
            throw new Error('Invalid user address');
        }
        if (!ethers.isAddress(tokenAddress)) {
            throw new Error('Invalid token address');
        }

        // Verify user identity in identity registry
        const isVerified = await this.verifyUserIdentity(userAddress);
        if (!isVerified) {
            throw new Error(`User ${userAddress} is not verified in identity registry`);
        }
        console.log(`User ${userAddress} is verified in identity registry`);

        // Create agent signer from private key
        const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
        
        // Create contract instance with agent signer
        const token = new ethers.Contract(tokenAddress, ERC3643_ABI, agentSigner);

        // Get the actual decimals from the token contract
        const decimals = await token.decimals();
        
        const isAgent = await token.isAgent(agentSigner.address);
        
        if (!isAgent) {
            throw new Error(`Signer ${agentSigner.address} is not an agent on the token contract. Please add this address as an agent.`);
        }
        console.log(`Signer ${agentSigner.address} is an agent on the token contract ${tokenAddress}`);

        // Check if user has sufficient balance to burn
        const balance = await token.balanceOf(userAddress);
        const burnAmount = ethers.parseUnits(amount, decimals);
        
        if (balance < burnAmount) {
            throw new Error(`Insufficient balance. User has ${ethers.formatUnits(balance, decimals)} tokens, trying to burn ${amount}`);
        }

        // Estimate gas for the burn operation
        const gasEstimate = await token.burn.estimateGas(userAddress, burnAmount);
        const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
        
        // Call burn function with gas limit
        const tx = await token.burn(userAddress, burnAmount, { gasLimit });
        console.log(`Burning ${amount} tokens from ${userAddress} on contract ${tokenAddress}`);
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for transaction confirmation
        await tx.wait();
        console.log(`Transaction confirmed: ${tx.hash}`);
        
        return tx.hash;
    } catch (error) {
        console.error('Error burning tokens:', error);
        throw new Error(`Failed to burn tokens: ${error.message}`);
    }
}
}
