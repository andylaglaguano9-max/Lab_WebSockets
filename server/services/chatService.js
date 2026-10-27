const crypto = require('crypto');

/**
 * Servicio de Gestión de Mensajes del Chat
 * Centraliza las operaciones sobre mensajes: envío, edición, eliminación, reacciones y fijado.
 */
class ChatService {
    constructor() {
        // Almacenamiento en memoria de mensajes
        this.messages = [];
        this.pinnedMessage = null;
        this.maxStoredMessages = 200;
    }

    /**
     * Crea y almacena un nuevo mensaje grupal
     */
    createMessage({ senderId, author, text, replyTo = null, color = '#4f46e5' }) {
        const message = {
            id: crypto.randomUUID(),
            senderId,
            author,
            text: text.trim(),
            color,
            timestamp: new Date().toISOString(),
            isEdited: false,
            editedAt: null,
            isDeleted: false,
            reactions: {}, // { "👍": ["Carlos", "Andrea"], "❤️": ["Mateo"] }
            replyTo: replyTo ? {
                id: replyTo.id,
                author: replyTo.author,
                text: replyTo.text.length > 60 ? replyTo.text.substring(0, 60) + '...' : replyTo.text
            } : null
        };

        this.messages.push(message);

        // Limitar la memoria para evitar desbordamiento en chats muy activos
        if (this.messages.length > this.maxStoredMessages) {
            this.messages.shift();
        }

        return message;
    }

    /**
     * Edita un mensaje si el solicitante es el autor original
     */
    editMessage(id, newText, requesterSocketId) {
        const message = this.messages.find(m => m.id === id);

        if (!message) {
            return { error: 'Mensaje no encontrado' };
        }

        if (message.senderId !== requesterSocketId) {
            return { error: 'No tienes autorización para editar este mensaje' };
        }

        if (message.isDeleted) {
            return { error: 'No se puede editar un mensaje eliminado' };
        }

        const trimmed = newText.trim();
        if (!trimmed) {
            return { error: 'El contenido del mensaje no puede estar vacío' };
        }

        message.text = trimmed;
        message.isEdited = true;
        message.editedAt = new Date().toISOString();

        // Si el mensaje editado estaba fijado, actualizar el pin también
        if (this.pinnedMessage && this.pinnedMessage.id === id) {
            this.pinnedMessage.text = message.text;
            this.pinnedMessage.isEdited = true;
        }

        return { message };
    }

    /**
     * Elimina un mensaje (Soft Delete para mantener el hilo y contexto visual)
     */
    deleteMessage(id, requesterSocketId) {
        const message = this.messages.find(m => m.id === id);

        if (!message) {
            return { error: 'Mensaje no encontrado' };
        }

        if (message.senderId !== requesterSocketId) {
            return { error: 'No tienes autorización para eliminar este mensaje' };
        }

        message.isDeleted = true;
        message.text = 'Este mensaje ha sido eliminado.';
        message.reactions = {};

        // Si estaba fijado, desfijarlo
        if (this.pinnedMessage && this.pinnedMessage.id === id) {
            this.pinnedMessage = null;
        }

        return { message };
    }

    /**
     * Alterna una reacción (agrega o remueve el emoji por el usuario)
     */
    toggleReaction(id, emoji, username) {
        const message = this.messages.find(m => m.id === id);

        if (!message) {
            return { error: 'Mensaje no encontrado' };
        }

        if (message.isDeleted) {
            return { error: 'No se puede reaccionar a un mensaje eliminado' };
        }

        if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
        }

        const userIndex = message.reactions[emoji].indexOf(username);
        if (userIndex > -1) {
            // Ya había reaccionado con este emoji -> Remover
            message.reactions[emoji].splice(userIndex, 1);
            if (message.reactions[emoji].length === 0) {
                delete message.reactions[emoji];
            }
        } else {
            // No había reaccionado -> Agregar
            message.reactions[emoji].push(username);
        }

        return { message };
    }

    /**
     * Fija o desfija un mensaje destacado en el chat
     */
    togglePinMessage(id, username) {
        const message = this.messages.find(m => m.id === id);

        if (!message) {
            return { error: 'Mensaje no encontrado' };
        }

        if (this.pinnedMessage && this.pinnedMessage.id === id) {
            // Ya está fijado -> Desfijar
            this.pinnedMessage = null;
            return { pinnedMessage: null, action: 'unpinned' };
        }

        this.pinnedMessage = {
            id: message.id,
            author: message.author,
            text: message.text,
            pinnedBy: username,
            pinnedAt: new Date().toISOString()
        };

        return { pinnedMessage: this.pinnedMessage, action: 'pinned' };
    }

    /**
     * Obtiene el mensaje actualmente fijado
     */
    getPinnedMessage() {
        return this.pinnedMessage;
    }

    /**
     * Retorna el historial de mensajes
     */
    getMessageHistory() {
        return this.messages;
    }
}

module.exports = new ChatService();
