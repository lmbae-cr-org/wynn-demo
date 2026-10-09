import express from 'express';

import { config } from './config.js';
import { adminRouter } from './routes/admin.js';
import { gameRouter } from './routes/game.js';
import { playersRouter } from './routes/players.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', controlProgramVersion: config.controlProgramVersion });
});

app.use('/api/players', playersRouter);
app.use('/api/game', gameRouter);
app.use('/api/admin', adminRouter);

// NGCB-5-8 (Reg. 5.260): never return stack traces, SQL text or configuration to a client.
// The detail stays server-side where it remains available for incident investigation.
app.use((err, _req, res, _next) => {
  console.error('unhandled_error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'internal_error' });
});

if (process.argv[1]?.endsWith('server.js')) {
  app.listen(config.port, () => {
    console.log(`listening on ${config.port} (control program ${config.controlProgramVersion})`);
  });
}
