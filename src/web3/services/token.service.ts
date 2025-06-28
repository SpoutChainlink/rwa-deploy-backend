import { Inject, Injectable } from '@nestjs/common';
import { WEB3_HTTP } from '../providers/provider.factory';
import { ethers } from 'ethers';
import { ERC3643_ABI } from 'src/shared/abi/ERC3643.abi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {

    constructor(
        @Inject(WEB3_HTTP) 
        private httpProvider: ethers.JsonRpcProvider,
        private readonly config: ConfigService,
    ) {}

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

            // Create contract instance
            const contract = new ethers.Contract(tokenAddress, ERC3643_ABI, this.httpProvider);
            const wallet = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
            const contractWithSigner = contract.connect(wallet);

            // Estimate gas for the mint operation
            const mintFunction = contractWithSigner.getFunction('mint');
            const gasEstimate = await mintFunction.estimateGas(userAddress, ethers.parseUnits(amount, 18));
            const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
            
            // Call mint function with gas limit
            const tx = await mintFunction(userAddress, ethers.parseUnits(amount, 18), { gasLimit });
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

            // Create contract instance
            const contract = new ethers.Contract(tokenAddress, ERC3643_ABI, this.httpProvider);
            const wallet = new ethers.Wallet(this.config.get<string>('PRIVATE_KEY') || '', this.httpProvider);
            const contractWithSigner = contract.connect(wallet);

            // Check if user has sufficient balance to burn
            const balance = await contract.balanceOf(userAddress);
            const burnAmount = ethers.parseUnits(amount, 18);
            
            if (balance < burnAmount) {
                throw new Error(`Insufficient balance. User has ${ethers.formatUnits(balance, 18)} tokens, trying to burn ${amount}`);
            }

            // Estimate gas for the burn operation
            const burnFunction = contractWithSigner.getFunction('burn');
            const gasEstimate = await burnFunction.estimateGas(userAddress, burnAmount);
            const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

            // Call burn function with gas limit
            const tx = await burnFunction(userAddress, burnAmount, { gasLimit });
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
