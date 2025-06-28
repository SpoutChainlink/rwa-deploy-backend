import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AssetReserveResponse, TotalReservesResponse } from '../shared/models/reserve-response.model';

@Injectable()
export class ReservesService {
  private readonly logger = new Logger(ReservesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get reserve information for a specific asset
   * @param assetSymbol - The symbol of the asset to get reserves for
   * @returns Promise with asset reserve information
   */
  async getAssetReserve(assetSymbol: string): Promise<AssetReserveResponse> {
    try {
      this.logger.log(`Getting reserve for asset: ${assetSymbol}`);

      const reserve = await this.supabaseService.getAssetReserve(assetSymbol);
      
      if (!reserve) {
        throw new NotFoundException(`Asset reserve not found for ${assetSymbol}`);
      }

      return {
        assetSymbol: reserve.asset_symbol,
        reserveAmount: reserve.reserve_amount,
        updatedAt: reserve.updated_at
      };
    } catch (error) {
      this.logger.error(`Failed to get asset reserve for ${assetSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get total reserves across all assets
   * @returns Promise with total reserves information
   */
  async getTotalReserves(): Promise<TotalReservesResponse> {
    try {
      this.logger.log('Getting total reserves for all assets');

      const allReserves = await this.supabaseService.getAllAssetReserves();
      
      const assets: AssetReserveResponse[] = allReserves.map(reserve => ({
        assetSymbol: reserve.asset_symbol,
        reserveAmount: reserve.reserve_amount,
        updatedAt: reserve.updated_at
      }));

      const totalReserveValue = allReserves.reduce((total, reserve) => total + reserve.reserve_amount, 0);
      
      return {
        totalReserveValue,
        assetCount: allReserves.length,
        assets
      };
    } catch (error) {
      this.logger.error('Failed to get total reserves:', error);
      throw error;
    }
  }
}
