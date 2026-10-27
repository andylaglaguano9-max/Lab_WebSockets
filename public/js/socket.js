/**
 * Módulo de Comunicación del Cliente con WebSockets (Socket.IO)
 * Encapsula la conexión, el ciclo de vida de la red y la emisión/recepción de eventos.
 */

const ChatSocket = (function () {
    let socket = null;
    let handlers = {};

    /**
     * Inicializa la conexión WebSocket con configuración de reconexión automática
     */
    function init() {
        socket = io({
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            autoConnect: true
        });

        // Eventos de Ciclo de Vida de la Conexión
        socket.on('connect', () => {
            console.log('[Socket] Conectado al servidor:', socket.id);
            trigger('connection:change', { status: 'connected', id: socket.id });
        });

        socket.on('disconnect', (reason) => {
            console.warn('[Socket] Desconectado del servidor. Razón:', reason);
            trigger('connection:change', { status: 'disconnected', reason });
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Error de conexión:', error.message);
            trigger('connection:change', { status: 'error', error });
        });

        // Eventos de Reconexión Automática (Reto 9)
        socket.io.on('reconnect_attempt', (attempt) => {
            console.log(`[Socket] Intento de reconexión #${attempt}...`);
            trigger('connection:change', { status: 'reconnecting', attempt });
        });

        socket.io.on('reconnect', (attempt) => {
            console.log(`[Socket] ¡Reconectado exitosamente en el intento #${attempt}!`);
            trigger('connection:change', { status: 'connected', id: socket.id, reconnected: true });
            trigger('reconnect:success');
        });

        socket.io.on('reconnect_failed', () => {
            console.error('[Socket] Fallaron todos los intentos de reconexión.');
            trigger('connection:change', { status: 'failed' });
        });

        // Eventos de Negocio / Chat
        socket.on('chat:init', (data) => trigger('chat:init', data));
        socket.on('users:update', (data) => trigger('users:update', data));
        socket.on('notification:event', (data) => trigger('notification:event', data));
        socket.on('message:new', (data) => trigger('message:new', data));
        socket.on('message:edited', (data) => trigger('message:edited', data));
        socket.on('message:deleted', (data) => trigger('message:deleted', data));
        socket.on('message:reaction_updated', (data) => trigger('message:reaction_updated', data));
        socket.on('message:pinned_updated', (data) => trigger('message:pinned_updated', data));
        socket.on('typing:update', (data) => trigger('typing:update', data));
        socket.on('error:notify', (data) => trigger('error:notify', data));
    }

    /**
     * Sistema de suscripción a eventos
     */
    function on(eventName, callback) {
        if (!handlers[eventName]) {
            handlers[eventName] = [];
        }
        handlers[eventName].push(callback);
    }

    function trigger(eventName, data) {
        if (handlers[eventName]) {
            handlers[eventName].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Error en handler de ${eventName}:`, e);
                }
            });
        }
    }

    // Métodos de emisión hacia el servidor

    function joinUser(username, callback) {
        if (!socket) return;
        socket.emit('user:join', { username }, callback);
    }

    function sendMessage(text, replyTo, callback) {
        if (!socket) return;
        socket.emit('message:send', { text, replyTo }, callback);
    }

    function editMessage(id, newText, callback) {
        if (!socket) return;
        socket.emit('message:edit', { id, newText }, callback);
    }

    function deleteMessage(id, callback) {
        if (!socket) return;
        socket.emit('message:delete', { id }, callback);
    }

    function toggleReaction(id, emoji) {
        if (!socket) return;
        socket.emit('message:react', { id, emoji });
    }

    function togglePin(id) {
        if (!socket) return;
        socket.emit('message:pin', { id });
    }

    function updateStatus(status) {
        if (!socket) return;
        socket.emit('user:status', { status });
    }

    function startTyping() {
        if (!socket) return;
        socket.emit('typing:start');
    }

    function stopTyping() {
        if (!socket) return;
        socket.emit('typing:stop');
    }

    function getSocketId() {
        return socket ? socket.id : null;
    }

    function isConnected() {
        return socket ? socket.connected : false;
    }

    return {
        init,
        on,
        joinUser,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePin,
        updateStatus,
        startTyping,
        stopTyping,
        getSocketId,
        isConnected
    };
})();
