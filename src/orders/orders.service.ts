import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AlpacaService } from '../alpaca/alpaca.service';
import { OrderRequest } from 'src/shared/models/order-request.model';
import { OrderResponse } from 'src/shared/models/order-response.model';
import { TokenService } from 'src/web3/services/token.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly alpacaService: AlpacaService,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Process a buy order - increases the asset reserve
   * @param orderRequest - The buy order details
   * @returns Promise with order result
   */
  async buyOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const { user, token, assetSymbol, usdcAmount, assetAmount, price } = orderRequest;

      // Round assetAmount to 2 decimal places
      const roundedAssetAmount = Math.round(assetAmount * 100) / 100;

      // Validate input
      if (!assetSymbol || usdcAmount <= 0) {
        throw new BadRequestException('Invalid asset symbol or amount');
      }

      this.logger.log(`Processing buy order for ${usdcAmount}$ ${assetSymbol}`);

      // Update asset reserve (using tokensToMint for buy)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, roundedAssetAmount);

      // Mint tokens for the user
      await this.tokenService.mintTokens(user, token, roundedAssetAmount.toString() || '');

      return {
        success: true,
        message: `Successfully bought ${usdcAmount} USD worth of ${assetSymbol} (${roundedAssetAmount} tokens minted)`,
        assetSymbol,
        amount: usdcAmount,
        tokenMinted: roundedAssetAmount,
        newTokenReserve: updatedReserve.reserve_amount
      };
    } catch (error) {
      this.logger.error(`Failed to process buy order:`, error);
      throw error;
    }
  }

  /**
   * Process a sell order - decreases the asset reserve
   * @param orderRequest - The sell order details
   * @returns Promise with order result
   */
  async sellOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const { user, token, assetSymbol, usdcAmount, assetAmount, price } = orderRequest;

      // Round assetAmount to 2 decimal places
      const roundedAssetAmount = Math.round(assetAmount * 100) / 100;

      // Validate input
      if (!assetSymbol || usdcAmount <= 0) {
        throw new BadRequestException('Invalid asset symbol or amount');
      }

      this.logger.log(`Processing sell order for ${usdcAmount}$ ${assetSymbol}`);

      // Check if we have enough reserves before selling
      const currentReserve = await this.supabaseService.getAssetReserve(assetSymbol);
      if (!currentReserve) {
        throw new BadRequestException(`Asset reserve not found for ${assetSymbol}`);
      }

      if (currentReserve.reserve_amount < roundedAssetAmount) {
        throw new BadRequestException(
          `Insufficient reserves. Available: ${currentReserve.reserve_amount}, Requested: ${usdcAmount}`
        );
      }

      // Update asset reserve (negative delta for sell)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, -roundedAssetAmount);

       // Mint tokens for the user
      await this.tokenService.burnTokens(user, token, roundedAssetAmount.toString() || '');

      return {
        success: true,
        message: `Successfully sold ${usdcAmount} USD worth of ${assetSymbol} (${roundedAssetAmount} tokens burned)`,
        assetSymbol,
        amount: usdcAmount,
        tokenBurned: roundedAssetAmount,
        newTokenReserve: updatedReserve.reserve_amount
      };
    } catch (error) {
      this.logger.error(`Failed to process sell order:`, error);
      throw error;
    }
  }
}
