import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AlpacaService } from '../alpaca/alpaca.service';
import { OrderRequest } from 'src/shared/models/order-request.model';
import { OrderResponse } from 'src/shared/models/order-response.model';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly alpacaService: AlpacaService
  ) {}

  /**
   * Process a buy order - increases the asset reserve
   * @param orderRequest - The buy order details
   * @returns Promise with order result
   */
  async buyOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const { user, token, assetSymbol, usdcAmount, assetAmount, price } = orderRequest;

      // Validate input
      if (!assetSymbol || usdcAmount <= 0) {
        throw new BadRequestException('Invalid asset symbol or amount');
      }

      this.logger.log(`Processing buy order for ${usdcAmount}$ ${assetSymbol}`);

      // Get Latest asset quote from Alpaca
      // const quoteResponse = await this.alpacaService.getLatestQuotes(assetSymbol);
      
      // if (!quoteResponse?.quotes?.[assetSymbol]) {
      //   throw new BadRequestException(`Unable to get quote for asset ${assetSymbol}`);
      // }

      // const askPrice = quoteResponse.quotes[assetSymbol].ap;
      
      // if (!askPrice || askPrice <= 0) {
      //   throw new BadRequestException(`Invalid ask price for asset ${assetSymbol}`);
      // }

      // Calculate tokens to mint based on cash deposited and ask price
      // const tokensToMint = amount / askPrice;

      // this.logger.log(`Ask price for ${assetSymbol}: ${askPrice}$, Tokens to mint: ${tokensToMint}`);

      // Update asset reserve (using tokensToMint for buy)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, assetAmount);

      return {
        success: true,
        message: `Successfully bought ${usdcAmount} USD worth of ${assetSymbol} (${assetAmount} tokens minted)`,
        assetSymbol,
        amount: usdcAmount,
        tokenMinted: assetAmount,
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

      // Validate input
      if (!assetSymbol || usdcAmount <= 0) {
        throw new BadRequestException('Invalid asset symbol or amount');
      }

      this.logger.log(`Processing sell order for ${usdcAmount}$ ${assetSymbol}`);

      // Get Latest asset quote from Alpaca
      // const quoteResponse = await this.alpacaService.getLatestQuotes(assetSymbol);

      // if (!quoteResponse?.quotes?.[assetSymbol]) {
      //   throw new BadRequestException(`Unable to get quote for asset ${assetSymbol}`);
      // }

      // const bidPrice = quoteResponse.quotes[assetSymbol].bp;
      
      // if (!bidPrice || bidPrice <= 0) {
      //   throw new BadRequestException(`Invalid bid price for asset ${assetSymbol}`);
      // }

      // this.logger.log(`Bid price for ${assetSymbol}: ${bidPrice}$`);

      // // Calculate tokens to burn based on cash withdrawal and bid price
      // const tokensToBurn = amount / bidPrice;

      // Check if we have enough reserves before selling
      const currentReserve = await this.supabaseService.getAssetReserve(assetSymbol);
      if (!currentReserve) {
        throw new BadRequestException(`Asset reserve not found for ${assetSymbol}`);
      }

      if (currentReserve.reserve_amount < assetAmount) {
        throw new BadRequestException(
          `Insufficient reserves. Available: ${currentReserve.reserve_amount}, Requested: ${usdcAmount}`
        );
      }

      // Update asset reserve (negative delta for sell)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, -assetAmount);

      return {
        success: true,
        message: `Successfully sold ${usdcAmount} USD worth of ${assetSymbol} (${assetAmount} tokens burned)`,
        assetSymbol,
        amount: usdcAmount,
        tokenBurned: assetAmount,
        newTokenReserve: updatedReserve.reserve_amount
      };
    } catch (error) {
      this.logger.error(`Failed to process sell order:`, error);
      throw error;
    }
  }
}
