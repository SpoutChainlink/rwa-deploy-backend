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

  @Cron('* * * * *')
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
        fromBlock = Math.max(0, currentBlock - 50); // First time running - scan last 500 blocks
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
              const [user, ticker, token, usdcAmount, assetAmount, price] = event.args;
              const usdcAmountDecimal = Number(usdcAmount) / 1e6;
              const priceDecimal = Number(price) / 1e8;
              const assetAmountDecimal = Number(assetAmount) / 1e18;

              
              this.logger.log('Processing Buy Order Event:', { 
                user, ticker, token,
                usdcAmount: `$${usdcAmountDecimal}`, 
                assetAmount: `${assetAmountDecimal}`, 
                price: `$${priceDecimal}` 
              });
              
              const orderRequest: OrderRequest = {
                user,
                token,
                assetSymbol: ticker,
                usdcAmount: usdcAmountDecimal,
                assetAmount: assetAmountDecimal,
                price: priceDecimal
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
              const [user, ticker, token, usdcAmount, assetAmount, price] = event.args;
              const assetAmountDecimal = Number(assetAmount) / 1e18;
              const priceDecimal = Number(price) / 1e8;
              const usdcAmountDecimal = Number(usdcAmount)/ 1e6;
              
              this.logger.log('Processing Sell Order Event:', { 
                user, ticker, token,
                usdcAmount: `$${usdcAmountDecimal}`, 
                assetAmount: `${assetAmountDecimal}`, 
                price: `$${priceDecimal}` 
              });
              
              const orderRequest: OrderRequest = {
                user,
                token,
                assetSymbol: ticker,
                usdcAmount: usdcAmountDecimal,
                assetAmount: assetAmountDecimal,
                price: priceDecimal
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

  /**
   * Initializes the event listener service.
   * Subscribes to WebSocket events from the order contract.
   */
  // async onModuleInit() {
  //   await this.subscribeToEvents();
  // }

  /**
   * Cleans up the event listeners and WebSocket connection when the module is destroyed.
   */
  // async onModuleDestroy() {
  //   try {
  //     this.orderContract.removeAllListeners();
  //     if (this.wssProvider && this.wssProvider.websocket) {
  //       this.wssProvider.destroy();
  //     }
  //   } catch (error) {
  //     this.logger.error('Error during cleanup:', error);
  //   }
  // }

  /**
   * Subscribes to events from the order contract.
   */
  // private async subscribeToEvents() {
  //   this.logger.log('Waiting for WebSocket provider to be ready...');
  //   await this.wssProvider.ready;

  //   // Verify connection is actually working
  //   const network = await this.wssProvider.getNetwork();
  //   this.logger.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

  //   const ORDER_CONTRACT_ADDRESS = this.config.get<string>('ORDER_CONTRACT_ADDRESS');
  //   if (!ORDER_CONTRACT_ADDRESS) {
  //     throw new Error('ORDER_CONTRACT_ADDRESS is not defined in configuration');
  //   }
  //   this.orderContract = new ethers.Contract(
  //     ORDER_CONTRACT_ADDRESS,
  //     ORDER_CONTRACT_EVENTS_ABI,
  //     this.wssProvider,
  //   );
  //   this.logger.log(`Connecting to order contract at: ${ORDER_CONTRACT_ADDRESS}`);

  //   // Test if contract exists
  //   const code = await this.wssProvider.getCode(ORDER_CONTRACT_ADDRESS);
  //   if (code === '0x') {
  //     this.logger.error(`No contract found at address: ${ORDER_CONTRACT_ADDRESS}`);
  //     return;
  //   }
  //   this.logger.log('Contract verified - code exists at address');

  //   // Subscribe to new blocks
  //   this.wssProvider.on('block', (blockNumber) => {
  //     this.logger.log(`New block mined: ${blockNumber}`);
  //   });

  //   // You can also listen for WebSocket connection errors
  //   this.wssProvider.on('error', (error) => {
  //     this.logger.error('WebSocket provider error:', error);
  //     // this.destroyConnectionAndSubscribeAgain();
  //   });

  //   this.orderContract.on('BuyOrderCreated', async (user, ticker, token, usdcAmount, assetAmount, price, event) => {      
  //     try {
  //       const usdcAmountDecimal = Number(usdcAmount);
  //       const assetAmountDecimal = Number(assetAmount) / 1e16;
  //       const priceDecimal = Number(price) / 1e2;
        
  //       this.logger.log('Buy Order Event Received:', { 
  //         user, ticker, token,
  //         usdcAmount: `$${usdcAmountDecimal}`, 
  //         assetAmount: `S${assetAmountDecimal}`, 
  //         price: `$${priceDecimal}` 
  //       });
        
  //       const orderRequest: OrderRequest = {
  //         user,
  //         token,
  //         assetSymbol: ticker,
  //         usdcAmount: usdcAmountDecimal,
  //         assetAmount: usdcAmountDecimal/priceDecimal,
  //         price: priceDecimal
  //       };
  //       await this.ordersService.buyOrder(orderRequest);
  //     } catch (error) {
  //       this.logger.error('Error processing buy order from event:', error);
  //     }
  //   });

  //   this.orderContract.on('SellOrderCreated', async (user, ticker, token, usdcAmount, assetAmount, price, event) => {
  //     try {
  //       const assetAmountDecimal = Number(assetAmount);
  //       const priceDecimal = Number(price) / 1e2;
        
  //       this.logger.log('Sell Order Event Received:', { 
  //         user, ticker, token,
  //         usdcAmount: `$${assetAmountDecimal}`, 
  //         assetAmount: `S${assetAmountDecimal/priceDecimal}`, 
  //         price: `$${priceDecimal}` 
  //       });
        
  //       const orderRequest: OrderRequest = {
  //         user,
  //         token,
  //         assetSymbol: ticker,
  //         usdcAmount: assetAmountDecimal,
  //         assetAmount: assetAmountDecimal/priceDecimal,
  //         price: priceDecimal
  //       };
  //       await this.ordersService.sellOrder(orderRequest);
  //     } catch (error) {
  //       this.logger.error('Error processing sell order from event:', error);
  //     }
  //   });
  // }

  /**
   * Destroys the current WebSocket connection and re-subscribes to events.
   * This is called when the WebSocket connection is detected as unhealthy.
   */
  // private async destroyConnectionAndSubscribeAgain() {
  //   this.logger.error('WebSocket connection unhealthy, attempting to reconnect...');
  //   try {
  //     this.orderContract.removeAllListeners();
  //     if (this.wssProvider && this.wssProvider.websocket) {
  //       this.wssProvider.destroy();
  //     }

  //     // fresh provider
  //     this.wssProvider = new ethers.WebSocketProvider(this.config.get<string>('RPC_WSS') || '');
  //     await this.subscribeToEvents();
      
  //     this.logger.log('WebSocket connection and event listeners re-established');
  //   } catch (error) {
  //     this.logger.error('Failed to reconnect WebSocket:', error);
  //   }
  // }

  // @Cron('* * * * *')
  // async checkLatestBlock() {
    // try {
    //   // Set a 10-second timeout for the block check
    //   const blockNumber = await Promise.race([
    //     this.wssProvider.getBlockNumber(),
    //     this.createTimeout(10000, 'Block check timeout')
    //   ]);

    //   if(!blockNumber) {
    //     this.destroyConnectionAndSubscribeAgain();
    //   }
    //   this.logger.log(`Block detected: ${blockNumber}`);
      
    // } catch (error) {
    //   this.destroyConnectionAndSubscribeAgain();
    // }
  // }

  private createTimeout(ms: number, errorMessage: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  }
}
