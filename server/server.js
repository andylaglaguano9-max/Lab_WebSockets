const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const setupConnectionHandler = require('./socket/connectionHandler');

// Inicialización de la aplicación Express y servidor HTTP
const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO con opciones de transporte y reconexión
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 10000,
    pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;

// Middleware para servir archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Ruta de estado / salud de la API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Inicializar el orquestador de eventos WebSocket
setupConnectionHandler(io);

// Iniciar el servidor HTTP y WebSocket
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor de Chat WebSocket Activo`);
    console.log(`📡 URL Local:   http://localhost:${PORT}`);
    console.log(`🌐 Listo para túneles externos (ngrok / Cloudflare)`);
    console.log(`====================================================`);
});
