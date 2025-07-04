import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stripeWebhookRouter from './routes/stripeWebhook.js';
import { syncStripePayments } from './utils/stripeSync.js';
import http from 'http';

// Load env variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Middleware
app.use('/webhooks/stripe', stripeWebhookRouter);

// Apply JSON parser after webhooks to preserve raw body for Stripe
app.use(express.json());

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));

// Routes
import voiceRouter from './routes/voiceToText.js';
import paymentRouter from './routes/createPayment.js';
import ttsRouter from './routes/ttsConfirm.js';
import voiceConfirmRouter from './routes/voiceConfirm.js';
import balanceRouter from './routes/balance.js';
import interpretRouter from './routes/interpret.js';
import ttsSayRouter from './routes/ttsSay.js';
import transactionsRouter from './routes/transactions.js';
import searchRouter from './routes/transactionsSearch.js';
import aggregateRouter from './routes/transactionsAggregate.js';
import splitBillRouter from './routes/splitBill.js';
import vadInterruptRouter from './routes/vadInterrupt.js';
import agentRouter from './routes/agent.js';
import confirmRouter from './routes/confirm.js';
app.use('/api', voiceRouter);
app.use('/api', paymentRouter);
app.use('/api', ttsRouter);
app.use('/api', voiceConfirmRouter);
app.use('/api', balanceRouter);
app.use('/api', interpretRouter);
app.use('/api', ttsSayRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api', searchRouter);
app.use('/api', aggregateRouter);
app.use('/api', splitBillRouter);
app.use('/api', vadInterruptRouter);
app.use('/api', agentRouter);
app.use('/api', confirmRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Voice Payments backend running' });
});

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await syncStripePayments();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Stripe back-fill failed', err);
    }
    // Enable WS by default during development; keep it opt-in in production.
    const enableWS =
      process.env.NODE_ENV !== 'production'
        ? process.env.INTERRUPTIONS_MVP !== 'false'
        : process.env.INTERRUPTIONS_MVP === 'true';

    if (enableWS) {
      const { attachWS } = await import('./conversation/ws.js');
      attachWS(httpServer);
    }

    httpServer.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening at http://localhost:${PORT}`);
    });
  })();
}

if (process.env.NODE_ENV !== 'production') {
  import('./utils/metrics.js').then(({ metricsText }) => {
    app.get('/metrics', (_req, res) => {
      res.type('text/plain').send(metricsText());
    });
  });
}

export default app;
