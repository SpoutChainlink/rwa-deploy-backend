import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { WEB3_HTTP, WEB3_WSS } from '../providers/provider.factory';
import { ORDER_CONTRACT_EVENTS_ABI } from 'src/shared/abi/ORDER_EVENTS.abi';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../../orders/orders.service';
import { OrderRequest } from '../../shared/models/order-request.model';

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);
  private orderContract!: ethers.Contract;
  private lastScannedBlock: number = 0;

  constructor(
    // @Inject(WEB3_WSS) 
    // private wssProvider: ethers.WebSocketProvider,
    @Inject(WEB3_HTTP)
    private httpProvider: ethers.JsonRpcProvider,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService
  ) {}

  @Cron('*/15 * * * * *')
  async checkLatestBlock() {
    await this.getBuySellEvents();
  }

  /**
   * Method to fetch historical events and verify contract interaction
   */
  private async getBuySellEvents() {
    try {
      // Fetching blocks to scan
      const currentBlock = await this.httpProvider.getBlockNumber();
      let fromBlock: number;
      if (this.lastScannedBlock === 0) {
        fromBlock = Math.max(0, currentBlock - 9); // First time running - scan last 500 blocks
      } else {
        fromBlock = this.lastScannedBlock + 1; // Subsequent runs - scan from last scanned block + 1
      }
      this.lastScannedBlock = currentBlock;
      this.logger.log(`CronJob running for events from block ${fromBlock} to ${currentBlock} | Total Blocks Scanned: ${currentBlock - fromBlock + 1}`);

      // Setting up the contract instance
      const ORDER_CONTRACT_ADDRESS = this.config.get<string>('ORDER_CONTRACT_ADDRESS');
      if (!ORDER_CONTRACT_ADDRESS) {
        throw new Error('ORDER_CONTRACT_ADDRESS is not defined in configuration');
      }
      const httpContract = new ethers.Contract(
        ORDER_CONTRACT_ADDRESS,
        ORDER_CONTRACT_EVENTS_ABI,
        this.httpProvider
      );
      
      // Fetching buy and sell events
      const buyEvents = await Promise.race([
        httpContract.queryFilter(
          httpContract.filters.BuyOrderCreated(),
          fromBlock,
          currentBlock
        ),
        this.createTimeout(10000, 'Buy events query timeout')
      ]);

      const sellEvents = await Promise.race([
        httpContract.queryFilter(
          httpContract.filters.SellOrderCreated(),
          fromBlock,
          currentBlock
        ),
        this.createTimeout(10000, 'Sell events query timeout')
      ]);

      this.logger.log(`Found ${buyEvents.length} buy and ${sellEvents.length} sell events from block ${fromBlock} to ${currentBlock}`);

      // Processing buy and sell events
      if (buyEvents.length > 0) {
        for (const event of buyEvents) {
          try {
            if ('args' in event) {
              const [user, ticker, token, usdcAmount, assetAmount, price, limitPrice] = event.args;
              const usdcAmountDecimal = Number(usdcAmount);
              const priceDecimal = Number(price);
              const assetAmountDecimal = Number(assetAmount);
              const limitPriceDecimal = Number(limitPrice);

              
              this.logger.log('Processing Buy Order Event:', { 
                user, ticker, token,
                usdcAmount: `$${usdcAmountDecimal}`, 
                assetAmount: `${assetAmountDecimal}`, 
                price: `$${priceDecimal}`,
                limitPrice: `$${limitPriceDecimal}` 
              });

              this.logger.log('Processing Buy Order Event After decimal adjustment at backend', { 
                user, ticker, token,
                usdcAmount: `$${Number(usdcAmount) / 1e6}`, 
                assetAmount: `${Number(assetAmount) / 1e18}`, 
                price: `$${Number(price) / 1e8}`,
                limitPrice: `$${Number(limitPrice) / 1e8}` 
              });
              
              const orderRequest: OrderRequest = {
                user,
                token,
                assetSymbol: ticker,
                usdcAmount: usdcAmountDecimal,
                assetAmount: assetAmountDecimal,
                price: priceDecimal,
                limitPrice: limitPriceDecimal
              };
              
              await this.ordersService.buyOrder(orderRequest);
            }
          } catch (error) {
            this.logger.error('Error processing buy order from historical event:', error);
          }
        }
      }
      if (sellEvents.length > 0) {
        for (const event of sellEvents) {
          try {
            if ('args' in event) {
              const [user, ticker, token, usdcAmount, assetAmount, price, limitPrice] = event.args;
              const assetAmountDecimal = Number(assetAmount);
              const priceDecimal = Number(price);
              const usdcAmountDecimal = Number(usdcAmount);
              const limitPriceDecimal = Number(limitPrice);
              
              this.logger.log('Processing Sell Order Event:', { 
                user, ticker, token,
                usdcAmount: `$${usdcAmountDecimal}`, 
                assetAmount: `${assetAmountDecimal}`, 
                price: `$${priceDecimal}`,
                limitPrice: `$${limitPriceDecimal}` 
              });
              
              const orderRequest: OrderRequest = {
                user,
                token,
                assetSymbol: ticker,
                usdcAmount: usdcAmountDecimal,
                assetAmount: assetAmountDecimal,
                price: priceDecimal,
                limitPrice: limitPriceDecimal
              };
              
              await this.ordersService.sellOrder(orderRequest);
            }
          } catch (error) {
            this.logger.error('Error processing sell order from historical event:', error);
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Error testing historical events:', error);
    }
  }

  private createTimeout(ms: number, errorMessage: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  }
}
