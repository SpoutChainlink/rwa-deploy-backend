import { Inject, Injectable } from '@nestjs/common';
import { WEB3_HTTP } from '../providers/provider.factory';
import { ethers } from 'ethers';
import { ERC3643_ABI } from 'src/shared/abi/ERC3643.abi';
import { IDENTITY_REGISTRY_CONTRACT } from 'src/shared/abi/IDENTITY_REGISTRY.abi';
import { ORDER_CONTRACT_EVENTS_ABI } from 'src/shared/abi/ORDER_EVENTS.abi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    private readonly identityRegistryAddress: string;
    private readonly orderContractAddress: string;

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

        const orderAddress = this.config.get<string>('ORDER_CONTRACT_ADDRESS');
        if (!orderAddress) {
            throw new Error('ORDER_CONTRACT_ADDRESS is not defined in configuration');
        }
        this.orderContractAddress = orderAddress;
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
    async mintTokens(userAddress: string, tokenAddress: string, amount: number): Promise<string> {
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
            const decimals = Number(await token.decimals());
            
            const isAgent = await token.isAgent(agentSigner.address);
            
            if (!isAgent) {
                throw new Error(`Signer ${agentSigner.address} is not an agent on the token contract. Please add this address as an agent.`);
            }
            console.log(`Signer ${agentSigner.address} is an agent on the token contract ${tokenAddress}`);

            const factor = 10 ** decimals; // e.g., 6 decimals → 1_000_000
            const roundedAssetAmount = (Math.floor(amount * factor) / factor).toString();
            const mintAmount = ethers.parseUnits(roundedAssetAmount, decimals);
            const gasEstimate = await token.mint.estimateGas(userAddress, mintAmount);
            const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

            console.log(`Minting ${roundedAssetAmount} tokens (${mintAmount} wei) to ${userAddress}`);
            
            // Call mint function with gas limit
            const tx = await token.mint(userAddress, mintAmount, { gasLimit });
            console.log(`Transaction hash: ${tx.hash}, Minting ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

            // Wait for transaction confirmation
            // await tx.wait();
            console.log(`Transaction confirmed: ${tx.hash}, Minting ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);
            
            return tx.hash;
        } catch (error) {
            console.error(`Error minting tokens for user: ${userAddress}, token: ${tokenAddress}`, error);
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
    async burnTokens(userAddress: string, tokenAddress: string, amount: number): Promise<string> {
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
        const decimals = Number(await token.decimals());
        
        const isAgent = await token.isAgent(agentSigner.address);
        
        if (!isAgent) {
            throw new Error(`Signer ${agentSigner.address} is not an agent on the token contract. Please add this address as an agent.`);
        }
        console.log(`Signer ${agentSigner.address} is an agent on the token contract ${tokenAddress}`);

        // Check if user has sufficient balance to burn
        const balance = await token.balanceOf(userAddress);
        const factor = 10 ** decimals; // e.g., 6 decimals → 1_000_000
        const roundedAssetAmount = (Math.floor(amount * factor) / factor).toString();
        const burnAmount = ethers.parseUnits(roundedAssetAmount, decimals);

        if (balance < burnAmount) {
            throw new Error(`Insufficient balance. User has ${ethers.formatUnits(balance, decimals)} tokens, trying to burn ${amount}`);
        }

        // Estimate gas for the burn operation
        const gasEstimate = await token.burn.estimateGas(userAddress, burnAmount);
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        console.log(`Burning ${burnAmount} round off tokens`);

        
        // Call burn function with gas limit
        const tx = await token.burn(userAddress, burnAmount, { gasLimit });
        console.log(`Transaction hash: ${tx.hash}, Burning ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

        // Wait for transaction confirmation
        // await tx.wait();
        console.log(`Transaction confirmed: ${tx.hash}, Burning ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

        return tx.hash;
    } catch (error) {
        console.error(`Error burning tokens for user: ${userAddress}, token: ${tokenAddress}`, error);
        throw new Error(`Failed to burn tokens: ${error.message}`);
    }
}

    /**
     * Withdraw USDC tokens to a user address via the order contract
     * @param amount - The amount of USDC to withdraw (in USDC units)
     * @param userAddress - The address to withdraw USDC to
     * @returns Transaction hash
     */
    async withdrawUSDC(amount: number, userAddress: string): Promise<string> {
        try {
            // Validate user address
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }

            // Create agent signer from private key
            const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
            
            // Create order contract instance with agent signer
            const orderContract = new ethers.Contract(
                this.orderContractAddress,
                ORDER_CONTRACT_EVENTS_ABI,
                agentSigner
            );

            // Convert amount to USDC wei (USDC has 6 decimal places)
            const factor = 10 ** 6; // e.g., 6 decimals → 1_000_000
            const roundedAssetAmount = (Math.floor(amount * factor) / factor).toString();
            const usdcAmount = ethers.parseUnits(roundedAssetAmount.toString(), 6);

            // Get the latest nonce for the agent signer and increment it
            const currentNonce = await this.httpProvider.getTransactionCount(agentSigner.address, 'latest');
            const nextNonce = currentNonce + 1;
            console.log(`Current nonce for ${agentSigner.address}: ${currentNonce}, using nonce: ${nextNonce}`);

            // Estimate gas for the withdraw operation
            const gasEstimate = await orderContract['withdrawUSDC'].estimateGas(usdcAmount, userAddress);
            const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
            
            // Call withdrawUSDC function with gas limit and nonce
            const tx = await orderContract['withdrawUSDC'](usdcAmount, userAddress, { 
                gasLimit, 
                nonce: nextNonce 
            });
            console.log(`Withdrawing ${amount} USDC to ${userAddress} and tx is ${tx.hash}`);
            
            // Wait for transaction confirmation
            await tx.wait();
            console.log(`USDC withdrawal transaction confirmed: ${tx.hash}`);
            
            return tx.hash;
        } catch (error) {
            console.error(`Error withdrawing USDC for user: ${userAddress}}`, error);
            throw new Error(`Failed to withdraw USDC: ${error.message}`);
        }
    }
}
