import { notificationService } from '../services/notificationService';

export const adminWebSocketHandler = {
  open(ws: any) {
    notificationService.subscribe(ws);
    ws.send(
      JSON.stringify({
        event: 'CONNECTED',
        message: 'Connected to admin real-time stream',
        timestamp: new Date().toISOString(),
      })
    );
  },
  message(ws: any, message: any) {
    if (message === 'ping') {
      ws.send('pong');
    }
  },
  close(ws: any) {
    notificationService.unsubscribe(ws);
  },
};
