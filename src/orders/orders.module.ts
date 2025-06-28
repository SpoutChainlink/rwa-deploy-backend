import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AlpacaModule } from '../alpaca/alpaca.module';

@Module({
  imports: [SupabaseModule, AlpacaModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService]
})
export class OrdersModule {}
