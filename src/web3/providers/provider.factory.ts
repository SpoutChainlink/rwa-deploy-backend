import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

export const WEB3_HTTP = Symbol('WEB3_HTTP');
export const WEB3_WSS  = Symbol('WEB3_WSS');

@Module({
  providers: [
    {
      provide: WEB3_HTTP,
      useFactory: (configService: ConfigService) => {
        const rpcHttp = configService.get<string>('RPC_HTTP');
        if (!rpcHttp) {
          throw new Error('RPC_HTTP configuration is required');
        }
        console.log(`Creating HTTP provider with RPC: ${rpcHttp}`);
        return new ethers.JsonRpcProvider(rpcHttp);
      },
      inject: [ConfigService],
    },
    {
      provide: WEB3_WSS,
      useFactory: (configService: ConfigService) => {
        const rpcWss = configService.get<string>('RPC_WSS');
        if (!rpcWss) {
          throw new Error('RPC_WSS configuration is required');
        }
        console.log(`Creating WebSocket provider with RPC: ${rpcWss}`);
        return new ethers.WebSocketProvider(rpcWss);
      },
      inject: [ConfigService],
    },
  ],
  exports: [WEB3_HTTP, WEB3_WSS],
})

export class ProviderFactory {}
