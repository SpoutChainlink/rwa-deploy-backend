import { Module } from '@nestjs/common';
import { AlpacaService } from './alpaca.service';
import { AlpacaController } from './alpaca.controller';

@Module({
  providers: [AlpacaService],
  exports: [AlpacaService],
  controllers: [AlpacaController]
})
export class AlpacaModule {}
