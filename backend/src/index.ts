import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({ name: 'Restaurant Analytics API', version: '1.0.0' });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/chat', chatRouter);

// Vercel serverless export
export default app;

// Local development server (optional, for testing)
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT || 8788);
  // Safe debug: print masked key info once at startup (helps diagnose API_KEY_INVALID)
  const masked = (() => {
    const k = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '').trim();
    if (!k) return 'absent';
    return `${k.slice(0,4)}... (len:${k.length})`;
  })();
  // eslint-disable-next-line no-console
  console.log(`[startup] Gemini key: ${masked}`);
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}
