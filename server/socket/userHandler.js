const userService = require('../services/userService');
const chatService = require('../services/chatService');

/**
 * Manejador de eventos relacionados con usuarios y presencia
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
module.exports = function registerUserHandlers(io, socket) {
    /**
     * Evento: user:join
     * Invocado cuando un usuario ingresa su nombre y se une a la sala grupal.
     */
    socket.on('user:join', (data, callback) => {
        try {
            const username = typeof data === 'string' ? data : data?.username;

            if (!username || !username.trim()) {
                if (typeof callback === 'function') {
                    return callback({ success: false, error: 'El nombre de usuario es obligatorio.' });
                }
                return;
            }

            const cleanName = username.trim();
            const user = userService.addUser(socket.id, cleanName);

            console.log(`[+] Usuario unido: "${user.username}" (Socket: ${socket.id})`);

            // Notificar a todos sobre la nueva conexión (Evento de entrada)
            const joinNotification = {
                id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: 'system',
                text: `${user.username} se ha conectado.`,
                timestamp: new Date().toISOString()
            };
            io.emit('notification:event', joinNotification);

            // Actualizar lista global de usuarios y cantidad a todos los clientes
            io.emit('users:update', {
                users: userService.getAllUsers(),
                count: userService.getUserCount()
            });

            // Enviar estado inicial completo al usuario recién conectado
            socket.emit('chat:init', {
                currentUser: user,
                messages: chatService.getMessageHistory(),
                pinnedMessage: chatService.getPinnedMessage(),
                users: userService.getAllUsers(),
                count: userService.getUserCount()
            });

            if (typeof callback === 'function') {
                callback({ success: true, user });
            }
        } catch (err) {
            console.error('[!] Error en user:join:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Error interno en el servidor.' });
            }
        }
    });

    /**
     * Reto: Estados de presencia (online, away, busy)
     * Evento: user:status
     */
    socket.on('user:status', ({ status }) => {
        const updated = userService.updateUserStatus(socket.id, status);
        if (updated) {
            io.emit('users:update', {
                users: userService.getAllUsers(),
                count: userService.getUserCount()
            });
        }
    });

    /**
     * Reto: Está escribiendo...
     * Evento: typing:start
     */
    socket.on('typing:start', () => {
        const user = userService.getUser(socket.id);
        if (user) {
            socket.broadcast.emit('typing:update', {
                username: user.username,
                isTyping: true
            });
        }
    });

    /**
     * Reto: Dejó de escribir...
     * Evento: typing:stop
     */
    socket.on('typing:stop', () => {
        const user = userService.getUser(socket.id);
        if (user) {
            socket.broadcast.emit('typing:update', {
                username: user.username,
                isTyping: false
            });
        }
    });
};
