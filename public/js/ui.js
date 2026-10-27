/**
 * Módulo de Gestión de Interfaz de Usuario (UI)
 * Encapsula la manipulación del DOM, renderizado de componentes y microinteracciones.
 */

const ChatUI = (function () {
    // Referencias al DOM
    const elements = {
        // Pantallas
        loginModal: document.getElementById('loginModal'),
        loginForm: document.getElementById('loginForm'),
        usernameInput: document.getElementById('usernameInput'),
        loginError: document.getElementById('loginError'),
        appContainer: document.getElementById('appContainer'),

        // Barra superior y conexión
        connectionBadge: document.getElementById('connectionBadge'),
        connectionStatusText: document.getElementById('connectionStatusText'),
        socketIdDisplay: document.getElementById('socketIdDisplay'),
        btnToggleSidebar: document.getElementById('btnToggleSidebar'),
        sidebar: document.getElementById('sidebar'),
        sidebarBackdrop: document.getElementById('sidebarBackdrop'),

        // Perfil y Presencia
        currentUserName: document.getElementById('currentUserName'),
        currentUserAvatar: document.getElementById('currentUserAvatar'),
        presenceSelect: document.getElementById('presenceSelect'),

        // Lista de Usuarios
        userCountBadge: document.getElementById('userCountBadge'),
        userList: document.getElementById('userList'),
        userSearchInput: document.getElementById('userSearchInput'),

        // Banner de Mensaje Fijado
        pinnedBanner: document.getElementById('pinnedBanner'),
        pinnedAuthor: document.getElementById('pinnedAuthor'),
        pinnedText: document.getElementById('pinnedText'),
        btnUnpin: document.getElementById('btnUnpin'),

        // Búsqueda de mensajes
        messageSearchInput: document.getElementById('messageSearchInput'),
        btnClearSearch: document.getElementById('btnClearSearch'),

        // Feed de mensajes
        messagesContainer: document.getElementById('messagesContainer'),
        typingIndicator: document.getElementById('typingIndicator'),
        typingText: document.getElementById('typingText'),

        // Formulario de envío y respuestas
        messageForm: document.getElementById('messageForm'),
        messageInput: document.getElementById('messageInput'),
        replyPreview: document.getElementById('replyPreview'),
        replyAuthor: document.getElementById('replyAuthor'),
        replyText: document.getElementById('replyText'),
        btnCancelReply: document.getElementById('btnCancelReply'),

        // Modal de edición
        editModal: document.getElementById('editModal'),
        editForm: document.getElementById('editForm'),
        editMessageInput: document.getElementById('editMessageInput'),
        btnCancelEdit: document.getElementById('btnCancelEdit'),

        // Toast container
        toastContainer: document.getElementById('toastContainer')
    };

    // Estado local de la UI
    let currentSocketId = null;
    let cachedUsers = [];
    let currentSearchTerm = '';

    /**
     * Formatea una fecha ISO a hora local legible (ej: 16:04)
     */
    function formatTime(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Actualiza el indicador de conexión visual
     */
    function setConnectionStatus(status, details = {}) {
        elements.connectionBadge.className = 'status-badge';

        if (status === 'connected') {
            elements.connectionBadge.classList.add('online');
            elements.connectionStatusText.innerHTML = `🟢 Conectado`;
            if (details.id) {
                currentSocketId = details.id;
                elements.socketIdDisplay.textContent = `ID: ${details.id.substring(0, 8)}...`;
            }
        } else if (status === 'reconnecting') {
            elements.connectionBadge.classList.add('reconnecting');
            elements.connectionStatusText.innerHTML = `🟡 Reconectando (${details.attempt || 1})...`;
        } else if (status === 'disconnected') {
            elements.connectionBadge.classList.add('offline');
            elements.connectionStatusText.innerHTML = `🔴 Desconectado`;
        } else if (status === 'error') {
            elements.connectionBadge.classList.add('error');
            elements.connectionStatusText.innerHTML = `⚠️ Error de red`;
        }
    }

    /**
     * Oculta el modal de inicio y muestra la vista de chat
     */
    function showChatView(user) {
        elements.loginModal.classList.add('hidden');
        elements.appContainer.classList.remove('hidden');

        elements.currentUserName.textContent = user.username;
        elements.currentUserAvatar.textContent = user.username.charAt(0).toUpperCase();
        elements.currentUserAvatar.style.backgroundColor = user.color || '#4f46e5';

        elements.messageInput.focus();
    }

    /**
     * Muestra error en el modal de inicio
     */
    function showLoginError(msg) {
        elements.loginError.textContent = msg;
        elements.loginError.classList.remove('hidden');
    }

    /**
     * Renderiza la lista de usuarios conectados con sus estados
     */
    function renderUserList(users) {
        cachedUsers = users;
        filterAndRenderUsers();
    }

    function filterAndRenderUsers() {
        const query = (elements.userSearchInput.value || '').toLowerCase().trim();
        elements.userList.innerHTML = '';

        const filtered = cachedUsers.filter(u => u.username.toLowerCase().includes(query));
        elements.userCountBadge.textContent = cachedUsers.length;

        if (filtered.length === 0) {
            elements.userList.innerHTML = `<li class="user-empty">No se encontraron usuarios</li>`;
            return;
        }

        filtered.forEach(u => {
            const li = document.createElement('li');
            li.className = 'user-item';
            const isMe = u.id === currentSocketId;

            // Estados de presencia: online, away, busy
            const statusClass = u.status === 'away' ? 'status-away' : (u.status === 'busy' ? 'status-busy' : 'status-online');
            const statusLabel = u.status === 'away' ? 'Ausente' : (u.status === 'busy' ? 'Ocupado' : 'En línea');

            li.innerHTML = `
                <div class="avatar-wrapper">
                    <div class="user-avatar" style="background-color: ${u.color || '#6366f1'}">
                        ${u.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="presence-dot ${statusClass}" title="${statusLabel}"></span>
                </div>
                <div class="user-info">
                    <span class="user-name">${escapeHTML(u.username)} ${isMe ? '<span class="badge-me">Tú</span>' : ''}</span>
                    <span class="user-status-text">${statusLabel}</span>
                </div>
            `;
            elements.userList.appendChild(li);
        });
    }

    /**
     * Renderiza una notificación del sistema (Andrea se ha conectado, Mateo ha abandonado)
     */
    function appendNotification(notification) {
        const div = document.createElement('div');
        div.className = 'system-notification';
        div.dataset.id = notification.id;
        div.innerHTML = `
            <span class="notification-icon">🔔</span>
            <span class="notification-text">${escapeHTML(notification.text)}</span>
            <span class="notification-time">${formatTime(notification.timestamp)}</span>
        `;
        elements.messagesContainer.appendChild(div);
        scrollToBottom();
    }

    /**
     * Renderiza un mensaje normal en el feed
     */
    function appendMessage(msg, onActionClick) {
        // Verificar si ya existe en el DOM para evitar duplicados
        let existing = document.getElementById(`msg-${msg.id}`);
        if (existing) return;

        const isMe = msg.senderId === currentSocketId;
        const msgDiv = document.createElement('div');
        msgDiv.id = `msg-${msg.id}`;
        msgDiv.className = `message-row ${isMe ? 'outgoing' : 'incoming'} ${msg.isDeleted ? 'deleted' : ''}`;
        msgDiv.dataset.id = msg.id;
        msgDiv.dataset.author = msg.author;
        msgDiv.dataset.text = msg.text;

        const reactionsHtml = buildReactionsHtml(msg.reactions);

        let replyHtml = '';
        if (msg.replyTo) {
            replyHtml = `
                <div class="message-reply-quote" onclick="ChatUI.jumpToMessage('${msg.replyTo.id}')">
                    <span class="reply-bar"></span>
                    <div class="reply-content">
                        <strong>${escapeHTML(msg.replyTo.author)}</strong>
                        <p>${escapeHTML(msg.replyTo.text)}</p>
                    </div>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            ${!isMe ? `<div class="message-avatar" style="background-color: ${msg.color || '#4f46e5'}">${msg.author.charAt(0).toUpperCase()}</div>` : ''}
            <div class="message-bubble-wrapper">
                <div class="message-bubble">
                    ${replyHtml}
                    ${!isMe ? `<div class="message-author" style="color: ${msg.color || '#4f46e5'}">${escapeHTML(msg.author)}</div>` : ''}
                    <div class="message-text" id="msg-text-${msg.id}">
                        ${escapeHTML(msg.text)}
                    </div>
                    <div class="message-meta">
                        <span class="message-edited ${msg.isEdited ? '' : 'hidden'}" id="msg-edited-${msg.id}">(editado)</span>
                        <span class="message-time">${formatTime(msg.timestamp)}</span>
                        ${isMe ? '<span class="message-status-check">✓✓</span>' : ''}
                    </div>
                </div>

                <!-- Reacciones acumuladas -->
                <div class="message-reactions-container" id="reactions-${msg.id}">
                    ${reactionsHtml}
                </div>

                <!-- Barra de acciones rápidas al hacer hover -->
                ${!msg.isDeleted ? `
                <div class="message-actions-toolbar">
                    <button class="btn-action" title="Responder" data-action="reply" data-id="${msg.id}">💬</button>
                    <button class="btn-action" title="Reaccionar" data-action="react-menu" data-id="${msg.id}">😊</button>
                    <button class="btn-action" title="Fijar mensaje" data-action="pin" data-id="${msg.id}">📌</button>
                    ${isMe ? `
                        <button class="btn-action" title="Editar mensaje" data-action="edit" data-id="${msg.id}">✏️</button>
                        <button class="btn-action delete" title="Eliminar mensaje" data-action="delete" data-id="${msg.id}">🗑️</button>
                    ` : ''}
                    <div class="quick-reactions-popover hidden" id="popover-${msg.id}">
                        <button type="button" data-emoji="👍">👍</button>
                        <button type="button" data-emoji="❤️">❤️</button>
                        <button type="button" data-emoji="😂">😂</button>
                        <button type="button" data-emoji="🎉">🎉</button>
                        <button type="button" data-emoji="🔥">🔥</button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Delegar eventos de acción del mensaje
        msgDiv.addEventListener('click', (e) => {
            const btnAction = e.target.closest('.btn-action');
            const emojiBtn = e.target.closest('.quick-reactions-popover button');
            const reactionBadge = e.target.closest('.reaction-badge');

            if (emojiBtn) {
                const emoji = emojiBtn.dataset.emoji;
                if (onActionClick) onActionClick('react', msg.id, { emoji });
                const popover = document.getElementById(`popover-${msg.id}`);
                if (popover) popover.classList.add('hidden');
                return;
            }

            if (reactionBadge) {
                const emoji = reactionBadge.dataset.emoji;
                if (onActionClick) onActionClick('react', msg.id, { emoji });
                return;
            }

            if (btnAction) {
                const action = btnAction.dataset.action;
                if (action === 'react-menu') {
                    const popover = document.getElementById(`popover-${msg.id}`);
                    if (popover) popover.classList.toggle('hidden');
                } else if (onActionClick) {
                    onActionClick(action, msg.id, msg);
                }
            }
        });

        elements.messagesContainer.appendChild(msgDiv);
        applySearchFilter();
        scrollToBottom();
    }

    /**
     * Construye las etiquetas visuales de reacciones
     */
    function buildReactionsHtml(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return '';

        return Object.entries(reactions).map(([emoji, users]) => {
            if (!users || users.length === 0) return '';
            const tooltip = users.join(', ');
            return `
                <button type="button" class="reaction-badge" data-emoji="${emoji}" title="Reaccionaron: ${tooltip}">
                    <span>${emoji}</span>
                    <span class="reaction-count">${users.length}</span>
                </button>
            `;
        }).join('');
    }

    /**
     * Actualiza el contenido de un mensaje editado en el DOM
     */
    function updateMessageEdited(data) {
        const msgDiv = document.getElementById(`msg-${data.id}`);
        if (!msgDiv) return;

        const textEl = document.getElementById(`msg-text-${data.id}`);
        const editedEl = document.getElementById(`msg-edited-${data.id}`);

        if (textEl) {
            textEl.textContent = data.text;
            msgDiv.dataset.text = data.text;
        }

        if (editedEl) {
            editedEl.classList.remove('hidden');
        }

        // Efecto sutil de resaltado
        msgDiv.classList.add('flash-highlight');
        setTimeout(() => msgDiv.classList.remove('flash-highlight'), 1200);
    }

    /**
     * Actualiza el estado de un mensaje eliminado en el DOM
     */
    function updateMessageDeleted(data) {
        const msgDiv = document.getElementById(`msg-${data.id}`);
        if (!msgDiv) return;

        msgDiv.classList.add('deleted');
        const textEl = document.getElementById(`msg-text-${data.id}`);
        if (textEl) {
            textEl.textContent = data.text;
        }

        // Remover barra de acciones y reacciones
        const toolbar = msgDiv.querySelector('.message-actions-toolbar');
        if (toolbar) toolbar.remove();
        const reactions = msgDiv.querySelector('.message-reactions-container');
        if (reactions) reactions.innerHTML = '';
    }

    /**
     * Actualiza las reacciones de un mensaje en el DOM
     */
    function updateMessageReactions(id, reactions) {
        const container = document.getElementById(`reactions-${id}`);
        if (container) {
            container.innerHTML = buildReactionsHtml(reactions);
        }
    }

    /**
     * Actualiza el banner de mensaje fijado (Pinned)
     */
    function updatePinnedBanner(pinnedMessage, onUnpinClick) {
        if (!pinnedMessage) {
            elements.pinnedBanner.classList.add('hidden');
            return;
        }

        elements.pinnedBanner.classList.remove('hidden');
        elements.pinnedAuthor.textContent = pinnedMessage.author;
        elements.pinnedText.textContent = pinnedMessage.text;

        elements.btnUnpin.onclick = (e) => {
            e.stopPropagation();
            if (onUnpinClick) onUnpinClick(pinnedMessage.id);
        };

        elements.pinnedBanner.onclick = () => {
            jumpToMessage(pinnedMessage.id);
        };
    }

    /**
     * Muestra / Oculta el indicador de usuario escribiendo
     */
    function setTypingUsers(typingUsersMap) {
        const users = Object.keys(typingUsersMap).filter(u => typingUsersMap[u]);

        if (users.length === 0) {
            elements.typingIndicator.classList.add('hidden');
            elements.typingText.textContent = '';
        } else if (users.length === 1) {
            elements.typingIndicator.classList.remove('hidden');
            elements.typingText.textContent = `${users[0]} está escribiendo...`;
        } else if (users.length === 2) {
            elements.typingIndicator.classList.remove('hidden');
            elements.typingText.textContent = `${users[0]} y ${users[1]} están escribiendo...`;
        } else {
            elements.typingIndicator.classList.remove('hidden');
            elements.typingText.textContent = `Varios usuarios están escribiendo...`;
        }
    }

    /**
     * Muestra la barra de vista previa de respuesta (Reply to)
     */
    function showReplyPreview(msg) {
        elements.replyPreview.classList.remove('hidden');
        elements.replyAuthor.textContent = msg.author;
        elements.replyText.textContent = msg.text.length > 80 ? msg.text.substring(0, 80) + '...' : msg.text;
        elements.messageInput.focus();
    }

    function hideReplyPreview() {
        elements.replyPreview.classList.add('hidden');
        elements.replyAuthor.textContent = '';
        elements.replyText.textContent = '';
    }

    /**
     * Modal de edición de mensaje
     */
    function openEditModal(msg, onSave) {
        elements.editModal.classList.remove('hidden');
        elements.editMessageInput.value = msg.text;
        elements.editMessageInput.focus();

        elements.editForm.onsubmit = (e) => {
            e.preventDefault();
            const val = elements.editMessageInput.value.trim();
            if (val) {
                onSave(val);
                closeEditModal();
            }
        };

        elements.btnCancelEdit.onclick = () => {
            closeEditModal();
        };
    }

    function closeEditModal() {
        elements.editModal.classList.add('hidden');
        elements.editMessageInput.value = '';
    }

    /**
     * Salta visualmente a un mensaje en el feed y lo resalta
     */
    function jumpToMessage(msgId) {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('flash-highlight');
            setTimeout(() => el.classList.remove('flash-highlight'), 1800);
        }
    }

    /**
     * Filtro de búsqueda en tiempo real de mensajes
     */
    function applySearchFilter() {
        const query = currentSearchTerm.toLowerCase().trim();
        const rows = elements.messagesContainer.querySelectorAll('.message-row');

        rows.forEach(row => {
            if (!query) {
                row.classList.remove('filtered-out');
                return;
            }
            const text = (row.dataset.text || '').toLowerCase();
            const author = (row.dataset.author || '').toLowerCase();

            if (text.includes(query) || author.includes(query)) {
                row.classList.remove('filtered-out');
            } else {
                row.classList.add('filtered-out');
            }
        });
    }

    function setSearchTerm(term) {
        currentSearchTerm = term;
        applySearchFilter();
        elements.btnClearSearch.classList.toggle('hidden', !term);
    }

    /**
     * Desplaza el feed de chat hacia abajo
     */
    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    /**
     * Notificación flotante (Toast)
     */
    function showToast(text, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = text;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    /**
     * Seguridad: Escape de caracteres HTML para prevenir XSS
     */
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    return {
        elements,
        formatTime,
        setConnectionStatus,
        showChatView,
        showLoginError,
        renderUserList,
        filterAndRenderUsers,
        appendNotification,
        appendMessage,
        updateMessageEdited,
        updateMessageDeleted,
        updateMessageReactions,
        updatePinnedBanner,
        setTypingUsers,
        showReplyPreview,
        hideReplyPreview,
        openEditModal,
        closeEditModal,
        jumpToMessage,
        setSearchTerm,
        scrollToBottom,
        showToast
    };
})();
