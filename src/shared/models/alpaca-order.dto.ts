export interface AlpacaOrderRequest {
  type: 'market';
  time_in_force: 'day';
  commission_type: 'notional';
  symbol: string;
  qty: string;
  side: 'buy' | 'sell';
}