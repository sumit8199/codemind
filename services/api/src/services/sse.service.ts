import { Response } from 'express';
import { getDatabase } from '../db/index.js';

interface SSEClient {
  id: string;
  res: Response;
  reviewId: string;
}

export class SSEService {
  private static clients: SSEClient[] = [];

  static async registerClient(reviewId: string, clientId: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const client: SSEClient = { id: clientId, res, reviewId };
    this.clients.push(client);

    // Replay historical events on reconnect so clients can immediately recover state
    const db = await getDatabase();
    const pastEvents = await db.getEvents(reviewId);
    for (const evt of pastEvents) {
      res.write(`data: ${JSON.stringify({
        reviewId: evt.review_id,
        agentName: evt.agent_name,
        status: evt.status,
        message: evt.message_safe,
        timestamp: evt.created_at.toISOString(),
        payload: evt.payload,
      })}\n\n`);
    }

    // Keepalive ping every 15 seconds
    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    res.on('close', () => {
      clearInterval(interval);
      this.clients = this.clients.filter((c) => c.id !== clientId);
    });
  }

  static async broadcastEvent(
    reviewId: string,
    agentName: string | null,
    status: string,
    message: string,
    payload: Record<string, any> = {}
  ) {
    const db = await getDatabase();
    const eventRecord = await db.recordEvent({
      review_id: reviewId,
      event_type: 'agent_progress',
      agent_name: agentName,
      status,
      message_safe: message,
      payload,
    });

    const eventPayload = {
      reviewId,
      agentName,
      status,
      message,
      timestamp: eventRecord.created_at.toISOString(),
      payload,
    };

    const serialized = `data: ${JSON.stringify(eventPayload)}\n\n`;

    // Send to all connected clients for this reviewId
    for (const client of this.clients) {
      if (client.reviewId === reviewId) {
        client.res.write(serialized);
      }
    }
  }
}
