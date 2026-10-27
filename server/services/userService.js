/**
 * Servicio de Gestión de Usuarios y Presencia
 * Mantiene el estado en memoria de los usuarios activos conectados.
 */

class UserService {
    constructor() {
        // Map de socketId => { id, username, color, status, joinedAt }
        this.users = new Map();
    }

    /**
     * Paleta de colores predefinida para avatares de usuarios
     */
    static AVATAR_COLORS = [
        '#4f46e5', '#7c3aed', '#2563eb', '#0891b2',
        '#059669', '#16a34a', '#d97706', '#dc2626',
        '#db2777', '#9333ea', '#ea580c', '#0284c7'
    ];

    /**
     * Asigna un color determinista basado en el nombre de usuario
     */
    generateColor(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % UserService.AVATAR_COLORS.length;
        return UserService.AVATAR_COLORS[index];
    }

    /**
     * Registra un usuario conectado
     */
    addUser(socketId, username, status = 'online') {
        const user = {
            id: socketId,
            username: username.trim(),
            color: this.generateColor(username),
            status: status, // 'online' | 'away' | 'busy'
            joinedAt: new Date().toISOString()
        };
        this.users.set(socketId, user);
        return user;
    }

    /**
     * Elimina un usuario por su socketId
     */
    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            this.users.delete(socketId);
        }
        return user;
    }

    /**
     * Obtiene un usuario por su socketId
     */
    getUser(socketId) {
        return this.users.get(socketId);
    }

    /**
     * Obtiene la lista completa de usuarios conectados
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }

    /**
     * Actualiza el estado de presencia de un usuario ('online', 'away', 'busy')
     */
    updateUserStatus(socketId, newStatus) {
        const user = this.users.get(socketId);
        if (user && ['online', 'away', 'busy'].includes(newStatus)) {
            user.status = newStatus;
            return user;
        }
        return null;
    }

    /**
     * Retorna la cantidad de usuarios activos
     */
    getUserCount() {
        return this.users.size;
    }
}

module.exports = new UserService();
