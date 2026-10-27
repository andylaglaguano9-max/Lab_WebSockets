/**
 * Controlador Principal de la Aplicación (App Orchestrator)
 * Enlaza los módulos de Socket y UI, gestiona el estado de sesión y los flujos de usuario.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado de la aplicación
    const state = {
        currentUser: null,
        activeReply: null,
        typingUsers: {}, // { username: boolean }
        typingTimeout: null,
        isCurrentlyTyping: false
    };

    // 1. Inicializar la conexión WebSocket
    ChatSocket.init();

    // 2. Suscribirse a eventos de red y ciclo de vida
    ChatSocket.on('connection:change', ({ status, id, attempt, reason }) => {
        ChatUI.setConnectionStatus(status, { id, attempt, reason });

        if (status === 'disconnected') {
            ChatUI.showToast('Se perdió la conexión con el servidor.', 'error');
        } else if (status === 'reconnecting') {
            ChatUI.showToast(`Reconectando con el servidor (intento ${attempt})...`, 'warning');
        }
    });

    // Recuperación automática de sesión ante reconexión (Reto 9)
    ChatSocket.on('reconnect:success', () => {
        if (state.currentUser && state.currentUser.username) {
            console.log('[App] Re-autenticando tras reconexión exitosa...');
            ChatSocket.joinUser(state.currentUser.username, (res) => {
                if (res && res.success) {
                    ChatUI.showToast('¡Reconexión exitosa! Sesión restaurada.', 'success');
                }
            });
        }
    });

    // 3. Suscribirse a eventos de negocio del Chat
    ChatSocket.on('chat:init', ({ currentUser, messages, pinnedMessage, users, count }) => {
        console.log('[App] chat:init recibido', { currentUser, messagesCount: messages.length });
        state.currentUser = currentUser;

        // Renderizar mensajes existentes
        messages.forEach(msg => {
            ChatUI.appendMessage(msg, handleMessageAction);
        });

        // Actualizar usuarios y mensaje fijado
        ChatUI.renderUserList(users);
        ChatUI.updatePinnedBanner(pinnedMessage, (id) => ChatSocket.togglePin(id));
    });

    ChatSocket.on('users:update', ({ users, count }) => {
        ChatUI.renderUserList(users);
    });

    ChatSocket.on('notification:event', (notification) => {
        ChatUI.appendNotification(notification);
    });

    ChatSocket.on('message:new', (msg) => {
        ChatUI.appendMessage(msg, handleMessageAction);
    });

    ChatSocket.on('message:edited', (data) => {
        ChatUI.updateMessageEdited(data);
    });

    ChatSocket.on('message:deleted', (data) => {
        ChatUI.updateMessageDeleted(data);
    });

    ChatSocket.on('message:reaction_updated', ({ id, reactions }) => {
        ChatUI.updateMessageReactions(id, reactions);
    });

    ChatSocket.on('message:pinned_updated', ({ pinnedMessage, action }) => {
        ChatUI.updatePinnedBanner(pinnedMessage, (id) => ChatSocket.togglePin(id));
        if (action === 'pinned') {
            ChatUI.showToast(`Mensaje fijado por ${pinnedMessage.pinnedBy}`, 'info');
        } else {
            ChatUI.showToast('Mensaje desfijado.', 'info');
        }
    });

    // Reto: Está escribiendo...
    ChatSocket.on('typing:update', ({ username, isTyping }) => {
        if (state.currentUser && username === state.currentUser.username) return;

        if (isTyping) {
            state.typingUsers[username] = true;
        } else {
            delete state.typingUsers[username];
        }
        ChatUI.setTypingUsers(state.typingUsers);
    });

    ChatSocket.on('error:notify', ({ message }) => {
        ChatUI.showToast(message, 'error');
    });

    // 4. Configurar escuchadores del DOM (UI Interactions)

    // Formulario de ingreso / Identificación obligatoria
    ChatUI.elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = ChatUI.elements.usernameInput.value.trim();

        if (!username) {
            ChatUI.showLoginError('Por favor ingrese un nombre para continuar.');
            return;
        }

        ChatSocket.joinUser(username, (response) => {
            if (response && response.success) {
                state.currentUser = response.user;
                ChatUI.showChatView(response.user);
                ChatUI.showToast(`Bienvenido al chat, ${response.user.username}!`, 'success');
            } else {
                ChatUI.showLoginError(response?.error || 'No fue posible unirse al chat.');
            }
        });
    });

    // Formulario de envío de mensajes
    ChatUI.elements.messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = ChatUI.elements.messageInput.value.trim();

        if (!text) return;

        const replyData = state.activeReply ? {
            id: state.activeReply.id,
            author: state.activeReply.author,
            text: state.activeReply.text
        } : null;

        ChatSocket.sendMessage(text, replyData, (response) => {
            if (response && response.success) {
                ChatUI.elements.messageInput.value = '';
                cancelReply();
                stopTypingIndicator();
            } else {
                ChatUI.showToast(response?.error || 'Error al enviar mensaje.', 'error');
            }
        });
    });

    // Detección de escritura (Typing debounce)
    ChatUI.elements.messageInput.addEventListener('input', () => {
        const hasText = ChatUI.elements.messageInput.value.trim().length > 0;

        if (hasText && !state.isCurrentlyTyping) {
            state.isCurrentlyTyping = true;
            ChatSocket.startTyping();
        }

        clearTimeout(state.typingTimeout);

        state.typingTimeout = setTimeout(() => {
            stopTypingIndicator();
        }, 1800);
    });

    function stopTypingIndicator() {
        if (state.isCurrentlyTyping) {
            state.isCurrentlyTyping = false;
            ChatSocket.stopTyping();
        }
    }

    // Cancelar respuesta
    ChatUI.elements.btnCancelReply.addEventListener('click', () => {
        cancelReply();
    });

    function cancelReply() {
        state.activeReply = null;
        ChatUI.hideReplyPreview();
    }

    // Reto: Estados de presencia
    ChatUI.elements.presenceSelect.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        ChatSocket.updateStatus(newStatus);
    });

    // Reto: Búsqueda de mensajes
    ChatUI.elements.messageSearchInput.addEventListener('input', (e) => {
        ChatUI.setSearchTerm(e.target.value);
    });

    ChatUI.elements.btnClearSearch.addEventListener('click', () => {
        ChatUI.elements.messageSearchInput.value = '';
        ChatUI.setSearchTerm('');
    });

    // Búsqueda de usuarios
    ChatUI.elements.userSearchInput.addEventListener('input', () => {
        ChatUI.filterAndRenderUsers();
    });

    // Menú responsive en dispositivos móviles
    ChatUI.elements.btnToggleSidebar.addEventListener('click', () => {
        ChatUI.elements.sidebar.classList.toggle('open');
        ChatUI.elements.sidebarBackdrop.classList.toggle('active');
    });

    ChatUI.elements.sidebarBackdrop.addEventListener('click', () => {
        ChatUI.elements.sidebar.classList.remove('open');
        ChatUI.elements.sidebarBackdrop.classList.remove('active');
    });

    // Manejador centralizado de acciones sobre mensajes (Reply, React, Edit, Delete, Pin)
    function handleMessageAction(action, msgId, extraData) {
        if (action === 'reply') {
            state.activeReply = extraData;
            ChatUI.showReplyPreview(extraData);
        } else if (action === 'react') {
            ChatSocket.toggleReaction(msgId, extraData.emoji);
        } else if (action === 'pin') {
            ChatSocket.togglePin(msgId);
        } else if (action === 'edit') {
            ChatUI.openEditModal(extraData, (newText) => {
                ChatSocket.editMessage(msgId, newText, (res) => {
                    if (res && !res.success) {
                        ChatUI.showToast(res.error, 'error');
                    }
                });
            });
        } else if (action === 'delete') {
            if (confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
                ChatSocket.deleteMessage(msgId, (res) => {
                    if (res && !res.success) {
                        ChatUI.showToast(res.error, 'error');
                    }
                });
            }
        }
    }
});