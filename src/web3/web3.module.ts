import { Module, forwardRef } from '@nestjs/common';
import { EventListenerService } from './services/event-listener.service';
import { TokenService } from './services/token.service';
import { ProviderFactory } from './providers/provider.factory';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ProviderFactory, forwardRef(() => OrdersModule)],
  providers: [
    EventListenerService,
    TokenService
  ],
  exports: [EventListenerService, TokenService]
})
export class Web3Module {}
