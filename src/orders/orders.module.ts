import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AlpacaModule } from '../alpaca/alpaca.module';
import { Web3Module } from 'src/web3/web3.module';

@Module({
  imports: [SupabaseModule, AlpacaModule, forwardRef(() => Web3Module)],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService]
})
export class OrdersModule {}
