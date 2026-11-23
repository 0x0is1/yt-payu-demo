export type NotificationEvent =
  | 'ORDER_CREATED'
  | 'PAYMENT_CAPTURED'
  | 'UPI_PAID_CLAIMED'
  | 'UPI_CONFIRMED'
  | 'ORDER_EXPIRED'
  | 'ORDER_RETRIED';

export interface NotificationPayload {
  event: NotificationEvent;
  orderId: string;
  identifierId: string;
  amount: number;
  customerName?: string | null;
  platform?: string;
  timestamp: string;
  data?: Record<string, any>;
}

class NotificationService {
  private subscribers: Set<any> = new Set();

  public subscribe(ws: any): void {
    this.subscribers.add(ws);
  }

  public unsubscribe(ws: any): void {
    this.subscribers.delete(ws);
  }

  public broadcast(payload: NotificationPayload): void {
    const message = JSON.stringify(payload);
    for (const ws of this.subscribers) {
      try {
        ws.send(message);
      } catch {
        this.subscribers.delete(ws);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

export const notificationService = new NotificationService();
