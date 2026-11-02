const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || '';
const SEMAPHORE_SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || '';

app.post('/api/send-sms', async (req, res) => {
  const { to, body } = req.body;
  try {
    const params = new URLSearchParams();
    params.append('apikey', SEMAPHORE_API_KEY);
    params.append('number', to);
    params.append('message', body);
    if (SEMAPHORE_SENDER_NAME) {
      params.append('sendername', SEMAPHORE_SENDER_NAME);
    }

    const response = await fetch('https://semaphore.co/api/v4/messages', {
      method: 'POST',
      body: params
    });

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].message_id) {
      const messageId = data[0].message_id;
      res.json({ success: true, sid: messageId, status: 'sent' });
      
      setTimeout(() => {
        io.emit('sms_status_update', { sid: messageId, status: 'delivered' });
      }, 3000);
    } else {
      res.status(400).json({ success: false, error: data.message || 'Failed to send via Semaphore' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SMS Backend running on port ${PORT}`));
