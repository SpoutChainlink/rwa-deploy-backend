import { Injectable } from '@nestjs/common';

export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
}

export interface Order {
  orderId: string;
  user: string;
  assetSymbol: string;
  orderAmount: number;
  limitPrice: number;
  price: number;
  orderStatus: OrderStatus;
}

@Injectable()
export class OrderBookService {
  private orderBook: Map<string, Order> = new Map();

  /**
   * Add a new order to the order book
   */
  addOrder(order: Order): Order {
    if (this.orderBook.has(order.orderId)) {
      throw new Error(`Order with ID ${order.orderId} already exists`);
    }
    
    this.orderBook.set(order.orderId, order);
    return order;
  }

  /**
   * Update the status of an order by order ID
   */
  updateOrderStatus(orderId: string, newStatus: OrderStatus): Order {
    const order = this.orderBook.get(orderId);
    
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    
    order.orderStatus = newStatus;
    this.orderBook.set(orderId, order);
    
    return order;
  }

  /**
   * Get an order by ID (helper method)
   */
  getOrder(orderId: string): Order | undefined {
    return this.orderBook.get(orderId);
  }

  /**
   * Get all orders for a specific user
   */
  getAllOrdersByUser(user: string): Order[] {
    return Array.from(this.orderBook.values()).filter(order => order.user === user);
  }
}
