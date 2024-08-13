const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const mysql = require('mysql');
const moment = require('moment'); // Ensure moment is installed

// Setup server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Your Angular app URL
    methods: ["GET", "POST"]
  }
});

app.use(cors()); // Allow CORS
app.use(express.json());

// MySQL connection pool
const dbConfig = {
  connectionLimit: 10, // Adjust based on your needs
  host: 'srv675.hstgr.io',
  user: 'u472554301_chatuser',
  password: 'Hajipur@hjp#123',
  database: 'u472554301_chatdb'
};

const db = mysql.createPool(dbConfig);

db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('Connected to MySQL database');
  connection.release();
});

// Handle WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Listen for user joining
  socket.on('join', (user) => {
    console.log(`${user} joined the chat`);
    socket.join(user);
  });

  // Listen for chat messages
  socket.on('chat message', (msg) => {
    const { sender, recipient, message } = msg;
    const timestamp = moment().format('HH:mm:ss'); // Use 24-hour format for the database
    const date = moment().format('YYYY-MM-DD'); // YYYY-MM-DD format

    // Save message to database
    const query = `INSERT INTO chat_tbl (sender, recipient, message, timestamp, date) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [sender, recipient, message, timestamp, date], (err, results) => {
      if (err) throw err;

      // Broadcast message to recipient and sender
      io.to(recipient).emit('chat message', { sender, recipient, message, timestamp, date });
      io.to(sender).emit('chat message', { sender, recipient, message, timestamp, date });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Fetch messages API
app.get('/messages/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;

  const query = `SELECT * FROM chat_tbl WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY date, timestamp`;
  db.query(query, [user1, user2, user2, user1], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
