import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AlpacaService {
    private apiKeyId: string;
    private apiSecretKey: string;

    constructor(private configService: ConfigService) {
        this.apiKeyId = this.configService.get<string>('APCA_API_KEY_ID') || '';
        this.apiSecretKey = this.configService.get<string>('APCA_API_SECRET_KEY') || '';
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
}