const chatService = require('../services/chatService');
const userService = require('../services/userService');

/**
 * Manejador de eventos asociados a mensajería, edición, borrado, reacciones y fijado
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
module.exports = function registerMessageHandlers(io, socket) {
    /**
     * Evento: message:send
     * Recibe y retransmite un mensaje grupal a todos los clientes conectados.
     */
    socket.on('message:send', (data, callback) => {
        try {
            const user = userService.getUser(socket.id);
            if (!user) {
                if (typeof callback === 'function') {
                    return callback({ success: false, error: 'Debes identificarte antes de enviar mensajes.' });
                }
                return;
            }

            const text = typeof data === 'string' ? data : data?.text;
            if (!text || !text.trim()) {
                if (typeof callback === 'function') {
                    return callback({ success: false, error: 'El mensaje no puede estar vacío.' });
                }
                return;
            }

            const message = chatService.createMessage({
                senderId: socket.id,
                author: user.username,
                text,
                color: user.color,
                replyTo: data?.replyTo || null
            });

            console.log(`[MSG] [${user.username}]: ${message.text.substring(0, 30)}...`);

            // Notificar a todos los usuarios conectados en tiempo real
            io.emit('message:new', message);

            if (typeof callback === 'function') {
                callback({ success: true, messageId: message.id });
            }
        } catch (err) {
            console.error('[!] Error en message:send:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Error al procesar el mensaje.' });
            }
        }
    });

    /**
     * Requisito obligatorio: Edición de mensajes
     * Evento: message:edit
     */
    socket.on('message:edit', ({ id, newText }, callback) => {
        try {
            const result = chatService.editMessage(id, newText, socket.id);

            if (result.error) {
                if (typeof callback === 'function') {
                    return callback({ success: false, error: result.error });
                }
                return socket.emit('error:notify', { message: result.error });
            }

            console.log(`[EDIT] Mensaje ${id} editado por socket ${socket.id}`);

            // Transmitir la actualización a todos los clientes conectados
            io.emit('message:edited', {
                id: result.message.id,
                text: result.message.text,
                isEdited: result.message.isEdited,
                editedAt: result.message.editedAt
            });

            if (typeof callback === 'function') {
                callback({ success: true, message: result.message });
            }
        } catch (err) {
            console.error('[!] Error en message:edit:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Error al editar el mensaje.' });
            }
        }
    });

    /**
     * Reto: Eliminar mensajes
     * Evento: message:delete
     */
    socket.on('message:delete', ({ id }, callback) => {
        try {
            const result = chatService.deleteMessage(id, socket.id);

            if (result.error) {
                if (typeof callback === 'function') {
                    return callback({ success: false, error: result.error });
                }
                return socket.emit('error:notify', { message: result.error });
            }

            console.log(`[DEL] Mensaje ${id} eliminado por socket ${socket.id}`);

            // Transmitir borrado a todos los clientes
            io.emit('message:deleted', {
                id: result.message.id,
                text: result.message.text,
                isDeleted: result.message.isDeleted
            });

            if (typeof callback === 'function') {
                callback({ success: true, id });
            }
        } catch (err) {
            console.error('[!] Error en message:delete:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Error al eliminar el mensaje.' });
            }
        }
    });

    /**
     * Reto: Reacciones a mensajes (👍 ❤️ 😂 🎉 🔥)
     * Evento: message:react
     */
    socket.on('message:react', ({ id, emoji }) => {
        const user = userService.getUser(socket.id);
        if (!user) return;

        const result = chatService.toggleReaction(id, emoji, user.username);
        if (!result.error) {
            io.emit('message:reaction_updated', {
                id: result.message.id,
                reactions: result.message.reactions
            });
        }
    });

    /**
     * Reto: Fijar mensajes
     * Evento: message:pin
     */
    socket.on('message:pin', ({ id }) => {
        const user = userService.getUser(socket.id);
        if (!user) return;

        const result = chatService.togglePinMessage(id, user.username);
        if (!result.error) {
            io.emit('message:pinned_updated', {
                pinnedMessage: result.pinnedMessage,
                action: result.action
            });
        }
    });
};
