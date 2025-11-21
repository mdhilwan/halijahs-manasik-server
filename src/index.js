import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let broadcastStatus = false;

// Health check
app.get('/health-check', (req, res) => {
    res.json({ message: { ok: true } });
});

// Start broadcast
app.post('/broadcast/start', (req, res) => {
    broadcastStatus = true;
    console.log('Broadcast started');
    res.json({ success: true, status: 'Broadcast started' });
});

// Stop broadcast
app.post('/broadcast/stop', (req, res) => {
    broadcastStatus = false;
    console.log('Broadcast stopped');
    res.json({ success: true, status: 'Broadcast stopped' });
});

// Check broadcast status
app.get('/broadcast/status', (req, res) => {
    res.json({ broadcasting: broadcastStatus });
});

app.listen(4321, () => {
    console.log('Server running on http://localhost:4321');
});