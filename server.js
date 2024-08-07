const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql');
const moment = require('moment');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: '', // Your MySQL password
    database: 'chat_app'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Route to fetch previous messages between two users
app.get('/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;

    // Query to get messages between two users
    const query = `
        SELECT * FROM chat_tbl
        WHERE (sender = ? AND recipient = ?)
        OR (sender = ? AND recipient = ?)
        ORDER BY timestamp ASC
    `;
    db.query(query, [user1, user2, user2, user1], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('chat message', (msg) => {
        const { sender, recipient, message } = msg;
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

        // Save the message to the database
        const query = 'INSERT INTO chat_tbl (sender, recipient, message, timestamp) VALUES (?, ?, ?, ?)';
        db.query(query, [sender, recipient, message, timestamp], (err, result) => {
            if (err) throw err;
            io.emit('chat message', { sender, recipient, message, timestamp });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
