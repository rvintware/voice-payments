import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
import voiceRouter from './routes/voiceToText.js';
import paymentRouter from './routes/createPayment.js';
import ttsRouter from './routes/ttsConfirm.js';
import voiceConfirmRouter from './routes/voiceConfirm.js';
import balanceRouter from './routes/balance.js';
import interpretRouter from './routes/interpret.js';
app.use('/api', voiceRouter);
app.use('/api', paymentRouter);
app.use('/api', ttsRouter);
app.use('/api', voiceConfirmRouter);
app.use('/api', balanceRouter);
app.use('/api', interpretRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Voice Payments backend running' });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    /* eslint-disable no-console */
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}
