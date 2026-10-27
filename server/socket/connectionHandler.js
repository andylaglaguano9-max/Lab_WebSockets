const userService = require('../services/userService');
const registerUserHandlers = require('./userHandler');
const registerMessageHandlers = require('./messageHandler');

/**
 * Gestor maestro del ciclo de vida de conexiones WebSocket
 * @param {import('socket.io').Server} io
 */
module.exports = function setupConnectionHandler(io) {
    io.on('connection', (socket) => {
        console.log(`[+] Nueva conexión establecida: ${socket.id}`);

        // Registrar manejadores modulares por dominio de responsabilidad
        registerUserHandlers(io, socket);
        registerMessageHandlers(io, socket);

        // Notificar al cliente conectado su id de sesión y conteo general de usuarios
        socket.emit('connection:ack', {
            socketId: socket.id,
            totalUsers: userService.getUserCount()
        });

        // Manejo del evento de desconexión
        socket.on('disconnect', (reason) => {
            console.log(`[-] Cliente desconectado: ${socket.id} (Razón: ${reason})`);

            const removedUser = userService.removeUser(socket.id);

            if (removedUser) {
                // Evento de salida: Notificar a los demás clientes
                const leaveNotification = {
                    id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    type: 'system',
                    text: `${removedUser.username} ha abandonado el chat.`,
                    timestamp: new Date().toISOString()
                };
                io.emit('notification:event', leaveNotification);

                // Actualizar la lista de usuarios en línea en todos los clientes
                io.emit('users:update', {
                    users: userService.getAllUsers(),
                    count: userService.getUserCount()
                });

                // Si estaba escribiendo, limpiar indicador de escritura
                socket.broadcast.emit('typing:update', {
                    username: removedUser.username,
                    isTyping: false
                });
            }
        });

        socket.on('error', (err) => {
            console.error(`[!] Error en socket ${socket.id}:`, err);
        });
    });
};
