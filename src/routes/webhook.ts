import express from 'express';
import { middleware } from '@line/bot-sdk';
import webhookHandler from '../handlers/webhookHandler';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Track processed webhook event IDs to prevent duplicate processing
const processedEventIds = new Set<string>();
const MAX_TRACKED_EVENTS = 1000;

router.post('/webhook', middleware(lineConfig), async (req, res) => {
  console.log('Received webhook event:', req.body.events);

  try {
    const events = req.body.events || [];

    // Filter out redelivery events that we've already processed
    const newEvents = events.filter((event: any) => {
      const eventId = event.webhookEventId;
      const isRedelivery = event.deliveryContext?.isRedelivery;

      if (isRedelivery && processedEventIds.has(eventId)) {
        console.log(`Skipping redelivered event: ${eventId}`);
        return false;
      }

      return true;
    });

    // Mark events as processed before handling them
    newEvents.forEach((event: any) => {
      if (event.webhookEventId) {
        processedEventIds.add(event.webhookEventId);

        // Limit the size of the set to prevent memory issues
        if (processedEventIds.size > MAX_TRACKED_EVENTS) {
          const firstItem = processedEventIds.values().next().value;
          if (firstItem) {
            processedEventIds.delete(firstItem);
          }
        }
      }
    });

    // Always respond 200 OK immediately to prevent redelivery
    res.status(200).send('OK');

    // Process events asynchronously after responding
    if (newEvents.length > 0) {
      webhookHandler.handleEvents(newEvents).catch(error => {
        console.error('Error processing webhook events:', error);
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent redelivery loop
    res.status(200).send('OK');
  }
});

export default router;
