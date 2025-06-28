import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define interface for asset reserve
interface AssetReserve {
    id: string;
    asset_symbol: string;
    reserve_amount: number;
    updated_at: string;
}

@Injectable()
export class SupabaseService {
    logger = new Logger(SupabaseService.name);
    private supabase: SupabaseClient;

    constructor(private readonly config: ConfigService) {
        const supabaseUrl = 'https://ecvfbnfcfsusaqpcobvm.supabase.co';
        const supabaseKey = this.config.get<string>('SUPABASE_KEY');

        if (!supabaseKey) {
            throw new Error('Supabase key is not defined in environment variables');
        }
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    getClient(): SupabaseClient {
        return this.supabase;
    }

    /**
     * Get reserve amount for a specific asset
     * @param assetSymbol - The symbol of the asset (e.g., 'ETH', 'BTC')
     * @returns Promise with the asset reserve data or null if not found
     */
    async getAssetReserve(assetSymbol: string): Promise<AssetReserve | null> {
        try {
            const { data, error } = await this.supabase
                .from('asset_reserves')
                .select('*')
                .eq('asset_symbol', assetSymbol)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found
                    this.logger.warn(`No reserve found for asset: ${assetSymbol}`);
                    return null;
                }
                this.logger.error(`Error getting asset reserve for ${assetSymbol}:`, error);
                throw error;
            }

            return data;
        } catch (error) {
            this.logger.error(`Failed to get asset reserve for ${assetSymbol}:`, error);
            throw error;
        }
    }

    /**
     * Update reserve amount for a specific asset
     * @param assetSymbol - The symbol of the asset
     * @param delta - The amount to add/subtract from current reserve
     * @returns Promise with the updated asset reserve data
     */
    async updateAssetReserve(assetSymbol: string, delta: number): Promise<AssetReserve> {
        try {
            // First get the current asset reserve
            const currentReserve = await this.getAssetReserve(assetSymbol);
            
            if (!currentReserve) {
                this.logger.error(`Asset reserve not found for ${assetSymbol}`);
                throw new Error(`Asset reserve not found for ${assetSymbol}`);
            }

            // Calculate new reserve amount
            const newReserveAmount = currentReserve.reserve_amount + delta;

            // Update the reserve with the new amount
            const { data, error } = await this.supabase
                .from('asset_reserves')
                .update({ 
                    reserve_amount: newReserveAmount,
                    updated_at: new Date().toISOString() 
                })
                .eq('asset_symbol', assetSymbol)
                .select()
                .single();

            if (error) {
                this.logger.error(`Error updating asset reserve for ${assetSymbol}:`, error);
                throw error;
            }

            this.logger.log(`Updated reserve for ${assetSymbol} from ${currentReserve.reserve_amount} to ${data.reserve_amount} (delta: ${delta})`);
            return data;
        } catch (error) {
            this.logger.error(`Failed to update asset reserve for ${assetSymbol}:`, error);
            throw error;
        }
    }

    /**
     * Get all asset reserves
     * @returns Promise with array of all asset reserves
     */
    async getAllAssetReserves(): Promise<AssetReserve[]> {
        try {
            const { data, error } = await this.supabase
                .from('asset_reserves')
                .select('*')
                .order('asset_symbol', { ascending: true });

            if (error) {
                this.logger.error('Error getting all asset reserves:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            this.logger.error('Failed to get all asset reserves:', error);
            throw error;
        }
    }
}
