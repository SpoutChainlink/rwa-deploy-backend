import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { WEB3_WSS } from '../providers/provider.factory';
import { ORDER_CONTRACT_ADDRESS } from 'src/shared/network/network';
import { ORDER_CONTRACT_EVENTS_ABI } from 'src/shared/abi/ORDER_EVENTS.abi';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../../orders/orders.service';
import { OrderRequest } from '../../shared/models/order-request.model';

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private orderContract!: ethers.Contract;

  constructor(
    @Inject(WEB3_WSS) 
    private wssProvider: ethers.WebSocketProvider,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService
  ) {}

  /**
   * Initializes the event listener service.
   * Subscribes to WebSocket events from the order contract.
   */
  async onModuleInit() {
    // await this.subscribeToEvents();
  }

  /**
   * Cleans up the event listeners and WebSocket connection when the module is destroyed.
   */
  async onModuleDestroy() {
    try {
      this.orderContract.removeAllListeners();
      if (this.wssProvider && this.wssProvider.websocket) {
        this.wssProvider.destroy();
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Subscribes to events from the order contract.
   */
  private async subscribeToEvents() {
    await this.wssProvider.ready;
    this.orderContract = new ethers.Contract(
      ORDER_CONTRACT_ADDRESS,
      ORDER_CONTRACT_EVENTS_ABI,
      this.wssProvider,
    );

    this.orderContract.on('BuyOrderCreated', async (user, token, usdcAmount, assetAmount, price, event) => {      
      try {
        this.logger.log('Buy Order Event Received:', { user, token, usdcAmount, assetAmount, price });
        const assetSymbol = 'LQD';
        const orderRequest: OrderRequest = {
          user,
          token,
          assetSymbol,
          usdcAmount,
          assetAmount,
          price
        };
        await this.ordersService.buyOrder(orderRequest);
      } catch (error) {
        this.logger.error('Error processing buy order from event:', error);
      }
    });

    this.orderContract.on('SellOrderCreated', async (user, token, usdcAmount, assetAmount, price, event) => {
      try {
        this.logger.log('Sell Order Event Received:', { user, token, usdcAmount, assetAmount, price });
        const assetSymbol = 'LQD';
        const orderRequest: OrderRequest = {
          user,
          token,
          assetSymbol,
          usdcAmount,
          assetAmount,
          price
        };
        await this.ordersService.sellOrder(orderRequest);
      } catch (error) {
        this.logger.error('Error processing sell order from event:', error);
      }
    });
  }

  /**
   * Destroys the current WebSocket connection and re-subscribes to events.
   * This is called when the WebSocket connection is detected as unhealthy.
   */
  private async destroyConnectionAndSubscribeAgain() {
    this.logger.error('WebSocket connection unhealthy, attempting to reconnect...');
    try {
      this.orderContract.removeAllListeners();
      if (this.wssProvider && this.wssProvider.websocket) {
        this.wssProvider.destroy();
      }

      // fresh provider
      this.wssProvider = new ethers.WebSocketProvider(this.config.get<string>('RPC_WSS') || '');
      await this.subscribeToEvents();
      
      this.logger.log('WebSocket connection and event listeners re-established');
    } catch (error) {
      this.logger.error('Failed to reconnect WebSocket:', error);
    }
  }

  @Cron('*/2 * * * *')
  async checkLatestBlock() {
    try {
      // Set a 10-second timeout for the block check
      const blockNumber = await Promise.race([
        this.wssProvider.getBlockNumber(),
        this.createTimeout(10000, 'Block check timeout')
      ]);

      if(!blockNumber) {
        this.destroyConnectionAndSubscribeAgain();
      }
      this.logger.log(`Block detected: ${blockNumber}`);
    } catch (error) {
      this.destroyConnectionAndSubscribeAgain();
    }
  }

  private createTimeout(ms: number, errorMessage: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  }
}
