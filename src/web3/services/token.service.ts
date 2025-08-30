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
    private nonceManager: Map<string, number> = new Map();
    private noncePromises: Map<string, Promise<number>> = new Map();

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
     * Get the next available nonce for an address, managing it locally to prevent conflicts
     * @param address - The wallet address to get nonce for
     * @returns Promise<number> - The next available nonce
     */
    private async getNextNonce(address: string): Promise<number> {
        // If there's already a pending nonce request for this address, wait for it
        if (this.noncePromises.has(address)) {
            await this.noncePromises.get(address);
        }

        // Create a new promise for this nonce request
        const noncePromise = this.fetchAndIncrementNonce(address);
        this.noncePromises.set(address, noncePromise);

        try {
            const nonce = await noncePromise;
            return nonce;
        } finally {
            // Clean up the promise after it's resolved
            this.noncePromises.delete(address);
        }
    }

    /**
     * Fetch current nonce from blockchain and increment local counter
     * @param address - The wallet address
     * @returns Promise<number> - The next nonce to use
     */
    private async fetchAndIncrementNonce(address: string): Promise<number> {
        let currentNonce: number;
        let blockchainNonce: number;

        // Always check the blockchain nonce for comparison
        blockchainNonce = await this.httpProvider.getTransactionCount(address, 'latest');

        if (this.nonceManager.has(address)) {
            // Use local nonce counter
            currentNonce = this.nonceManager.get(address)!;
            
            // Safety check: if our local nonce is too far ahead or behind, resync
            if (currentNonce < blockchainNonce || currentNonce > blockchainNonce + 10) {
                console.log(`Nonce out of sync for ${address}. Local: ${currentNonce}, Blockchain: ${blockchainNonce}. Resyncing...`);
                currentNonce = blockchainNonce;
            }
        } else {
            // First time, fetch from blockchain
            currentNonce = blockchainNonce;
        }

        const nextNonce = currentNonce;
        // Increment for next transaction
        this.nonceManager.set(address, currentNonce + 1);
        
        console.log(`Address ${address}: blockchain nonce ${blockchainNonce}, using nonce ${nextNonce}, next will be ${currentNonce + 1}`);
        return nextNonce;
    }

    /**
     * Reset nonce counter for an address (useful if transactions fail or for testing)
     * @param address - The wallet address to reset nonce for
     */
    private async resetNonce(address: string): Promise<void> {
        const currentNonce = await this.httpProvider.getTransactionCount(address, 'latest');
        this.nonceManager.set(address, currentNonce);
        console.log(`Reset nonce for ${address} to ${currentNonce}`);
    }

    /**
     * Clear all nonce counters (useful for debugging or restart scenarios)
     */
    private clearAllNonces(): void {
        this.nonceManager.clear();
        this.noncePromises.clear();
        console.log('Cleared all nonce counters');
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
        // Create agent signer from private key (moved outside try block for error handling)
        const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
        
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

            // Get the next nonce using nonce manager
            const nextNonce = await this.getNextNonce(agentSigner.address);

            const gasEstimate = await token.mint.estimateGas(userAddress, mintAmount);
            const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

            console.log(`Minting ${roundedAssetAmount} tokens (${mintAmount} wei) to ${userAddress}`);
            
            // Call mint function with gas limit and nonce
            const tx = await token.mint(userAddress, mintAmount, { gasLimit, nonce: nextNonce });
            console.log(`Transaction hash: ${tx.hash}, Minting ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

            // Wait for transaction confirmation
            // await tx.wait();
            console.log(`Transaction confirmed: ${tx.hash}, Minting ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);
            
            return tx.hash;
        } catch (error) {
            // If it's a nonce-related error, reset the nonce counter
            if (error.message && (error.message.includes('nonce') || error.message.includes('replacement transaction underpriced'))) {
                console.log(`Nonce error detected, resetting nonce for ${agentSigner.address}`);
                await this.resetNonce(agentSigner.address);
            }
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
    // Create agent signer from private key (moved outside try block for error handling)
    const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
    
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

        // Get the next nonce using nonce manager
        const nextNonce = await this.getNextNonce(agentSigner.address);

        // Estimate gas for the burn operation
        const gasEstimate = await token.burn.estimateGas(userAddress, burnAmount);
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        console.log(`Burning ${burnAmount} round off tokens`);

        
        // Call burn function with gas limit and nonce
        const tx = await token.burn(userAddress, burnAmount, { gasLimit, nonce: nextNonce });
        console.log(`Transaction hash: ${tx.hash}, Burning ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

        // Wait for transaction confirmation
        // await tx.wait();
        console.log(`Transaction confirmed: ${tx.hash}, Burning ${roundedAssetAmount}, user: ${userAddress}; token contract ${tokenAddress}`);

        return tx.hash;
    } catch (error) {
        // If it's a nonce-related error, reset the nonce counter
        if (error.message && (error.message.includes('nonce') || error.message.includes('replacement transaction underpriced'))) {
            console.log(`Nonce error detected, resetting nonce for ${agentSigner.address}`);
            await this.resetNonce(agentSigner.address);
        }
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
        // Create agent signer from private key (moved outside try block for error handling)
        const agentSigner = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
        
        try {
            // Validate user address
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }
            
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

            // Get the next nonce using nonce manager
            const nextNonce = await this.getNextNonce(agentSigner.address);

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
            // If it's a nonce-related error, reset the nonce counter
            if (error.message && (error.message.includes('nonce') || error.message.includes('replacement transaction underpriced'))) {
                console.log(`Nonce error detected, resetting nonce for ${agentSigner.address}`);
                await this.resetNonce(agentSigner.address);
            }
            console.error(`Error withdrawing USDC for user: ${userAddress}}`, error);
            throw new Error(`Failed to withdraw USDC: ${error.message}`);
        }
    }
}
