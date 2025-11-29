import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AlpacaService } from '../alpaca/alpaca.service';
import { OrderRequest } from 'src/shared/models/order-request.model';
import { OrderResponse } from 'src/shared/models/order-response.model';
import { TokenService } from 'src/web3/services/token.service';
import { OrderBookService, OrderStatus } from './order-book.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly alpacaService: AlpacaService,
    private readonly tokenService: TokenService,
    private readonly orderBookService: OrderBookService
  ) {}

  /**
   * Process a buy order - increases the asset reserve
   * @param orderRequest - The buy order details
   * @returns Promise with order result
   */
  async buyOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const { user, token, assetSymbol, usdcAmount, assetAmount, price, limitPrice } = orderRequest;

      // Validate input
      if (!assetSymbol || usdcAmount <= 0) {
        throw new BadRequestException('Invalid asset symbol or amount');
      }

      this.logger.log(`Processing buy order for ${usdcAmount}$ ${assetSymbol}`);

      // Place order with Alpaca
      let alpacaOrderResponse;
      if (!limitPrice || limitPrice === 0) { //market day order and queue orders
        alpacaOrderResponse = await this.alpacaService.placeOrder(assetSymbol, assetAmount.toString(), 'buy');
      } else { // overnight 24/5 orders
        alpacaOrderResponse = await this.alpacaService.placeOvernightOrder(assetSymbol, assetAmount.toString(), 'buy', limitPrice);
      }

      // Add order to order book
      this.orderBookService.addOrder({
        orderId: alpacaOrderResponse.id,
        user,
        assetSymbol,
        orderAmount: assetAmount,
        limitPrice: limitPrice || 0,
        price,
        orderStatus: OrderStatus.PENDING
      });
      this.logger.log(`Added buy order ${alpacaOrderResponse.id} to order book`);


      // Update asset reserve (using tokensToMint for buy)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, assetAmount);

      // Mint tokens for the user
      await this.tokenService.mintTokens(user, token, assetAmount);

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
      const { user, token, assetSymbol, usdcAmount, assetAmount, price, limitPrice } = orderRequest;

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

      if (currentReserve.reserve_amount < assetAmount) {
        throw new BadRequestException(
          `Insufficient reserves. Available: ${currentReserve.reserve_amount}, Requested: ${usdcAmount}`
        );
      }

      // Place Aplaca order
      let alpacaOrderResponse;
      if (!limitPrice || limitPrice === 0) { //market day order and queue orders
        alpacaOrderResponse = await this.alpacaService.placeOrder(assetSymbol, assetAmount.toString(), 'sell');
      } else { // overnight 24/5 orders
        alpacaOrderResponse = await this.alpacaService.placeOvernightOrder(assetSymbol, assetAmount.toString(), 'sell', limitPrice);
      }

      // Add order to order book
      this.orderBookService.addOrder({
        orderId: alpacaOrderResponse.id,
        user,
        assetSymbol,
        orderAmount: assetAmount,
        limitPrice: limitPrice || 0,
        price,
        orderStatus: OrderStatus.PENDING
      });
      this.logger.log(`Added sell order ${alpacaOrderResponse.id} to order book`);


      // Update asset reserve (negative delta for sell)
      const updatedReserve = await this.supabaseService.updateAssetReserve(assetSymbol, -assetAmount);

       // Burn tokens for the user
      await this.tokenService.burnTokens(user, token, assetAmount);

      // Transfer USDC back to user via order contract
      await this.tokenService.withdrawUSDC(usdcAmount, user);

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
