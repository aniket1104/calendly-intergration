import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { CONFIG } from './config';
import { WorkflowEngine } from './agent/workflow';

const app = express();
const workflow = new WorkflowEngine();

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: CONFIG.MOCK_MODE ? 'MOCK' : 'LIVE' });
});

app.post('/chat', async (req, res) => {
  console.log('Received body:', req.body);
  const { sessionId, message } = req.body;
  
  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Missing sessionId or message' });
  }

  try {
    const response = await workflow.processMessage(sessionId, message);
    res.json({ response });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`Server running on port ${CONFIG.PORT}`);
  console.log(`Mode: ${CONFIG.MOCK_MODE ? 'MOCK' : 'LIVE'}`);
});
