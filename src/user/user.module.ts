import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ProviderFactory } from '../web3/providers/provider.factory';

@Module({
  imports: [ConfigModule, ProviderFactory],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
