import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { OrdersModule } from './orders/orders.module';
import { SupabaseModule } from './supabase/supabase.module';
import { Web3Module } from './web3/web3.module';
import { ReservesModule } from './reserves/reserves.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiKeyMiddleware } from './shared/middleware/api-key.middleware';
import { AlpacaModule } from './alpaca/alpaca.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (
          !config.RPC_HTTP || 
          !config.RPC_WSS || 
          !config.SUPABASE_KEY || 
          !config.APCA_API_KEY_ID || 
          !config.APCA_API_SECRET_KEY
        ) {
          throw new Error('Missing Env variables');
        }
        return config;
      }
    }),
    ScheduleModule.forRoot(),
    OrdersModule, SupabaseModule, Web3Module, ReservesModule, AlpacaModule],
  controllers: [AppController]
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes('*');
  }
}
