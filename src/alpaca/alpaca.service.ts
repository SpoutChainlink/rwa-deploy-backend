import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AlpacaOrderRequest } from '../shared/models/alpaca-order.dto';

@Injectable()
export class AlpacaService {
    private apiKeyId: string;
    private apiSecretKey: string;
    private accountId: string;

    constructor(private configService: ConfigService) {
        this.apiKeyId = this.configService.get<string>('APCA_API_KEY_ID') || '';
        this.apiSecretKey = this.configService.get<string>('APCA_API_SECRET_KEY') || '';
        this.accountId = this.configService.get<string>('APCA_ACCOUNT_ID') || '';
    }

    async getLatestQuotes(symbols: string): Promise<any> {
        try {
            const response = await axios.get(
                `https://data.alpaca.markets/v2/stocks/quotes/latest`,
                {
                    params: { symbols },
                    headers: {
                        accept: 'application/json',
                        'APCA-API-KEY-ID': this.apiKeyId,
                        'APCA-API-SECRET-KEY': this.apiSecretKey,
                    },
                },
            );
            return response.data;
        } catch (error) {
            console.error('Alpaca error:', error.response?.data || error.message);
            throw new Error(`Failed to fetch quotes: ${error.message}`);
        }
    }

    async placeOrder(symbol: string, qty: string, side: 'buy' | 'sell'): Promise<any> {
        try {
            const credentials = Buffer.from(`${this.apiKeyId}:${this.apiSecretKey}`).toString('base64');
            
            const orderRequest = {
                type: 'market',
                time_in_force: 'day',
                commission_type: 'notional',
                symbol,
                qty,
                side
            };

            const response = await axios.post(
                `https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/${this.accountId}/orders`,
                orderRequest,
                {
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        authorization: `Basic ${credentials}`
                    },
                },
            );
            return response.data;
        } catch (error) {
            console.error('Alpaca order error:', error.response?.data || error.message);
            throw new Error(`Failed to place order: ${error.response?.data?.message || error.message}`);
        }
    }

    async isOrderFilled(orderId: string): Promise<boolean> {
        try {
            const credentials = Buffer.from(`${this.apiKeyId}:${this.apiSecretKey}`).toString('base64');
            const response = await axios.get(
                `https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/${this.accountId}/orders/${orderId}`,
                {
                    headers: {
                        accept: 'application/json',
                        authorization: `Basic ${credentials}`
                    },
                },
            );
            
            // Check if the order status is 'filled'
            const orderData = response.data as any;
            return orderData.status === 'filled';
        } catch (error) {
            console.error('Alpaca order status error:', error.response?.data || error.message);
            throw new Error(`Failed to check order status: ${error.response?.data?.message || error.message}`);
        }
    }

    async checkUntilOrderFilled(orderId: string): Promise<boolean> {
        const maxAttempts = 10;
        const delaySeconds = 15;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`Checking order ${orderId} status - attempt ${attempt}/${maxAttempts}`);
                
                const isFilled = await this.isOrderFilled(orderId);
                
                if (isFilled) {
                    console.log(`Order ${orderId} is filled!`);
                    return true;
                }
                
                if (attempt < maxAttempts) {
                    console.log(`Order not filled yet, waiting ${delaySeconds} seconds before next check...`);
                    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                }
            } catch (error) {
                console.error(`Error checking order status on attempt ${attempt}:`, error.message);
                if (attempt === maxAttempts) {
                    throw error;
                }
                // Continue to next attempt if not the last one
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            }
        }
        
        console.log(`Order ${orderId} was not filled after ${maxAttempts} attempts`);
        return false;
    }
}