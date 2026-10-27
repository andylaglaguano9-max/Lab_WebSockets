# 💬 Chat Grupal en Tiempo Real con WebSockets
### Laboratorio: Aplicación de Comunicación Persistente con WebSockets
**Materia:** Aplicaciones Distribuidas  
**Tecnología Principal:** Node.js, Express, Socket.IO, HTML5, CSS3 Moderno, JavaScript Modular (Vanilla ES6)

---

## 📋 Descripción del Proyecto
Este proyecto implementa una aplicación web distribuida de mensajería grupal en tiempo real utilizando conexiones **WebSockets bidireccionales y persistentes**. A diferencia de las tradicionales arquitecturas web basadas en consultas periódicas HTTP (polling), este sistema mantiene canales abiertos y permanentes con el servidor, permitiendo el intercambio instantáneo de eventos de presencia, mensajería, edición sincronizada, reacciones y recuperación automática de fallos de red.

---

## 🚀 Tecnologías Utilizadas
- **Entorno de Ejecución:** Node.js (v18+)
- **Servidor Web y API:** Express.js (v5)
- **Motor de WebSockets:** Socket.IO (v4.8) con soporte de fallback HTTP Long-Polling y reconexión automática con backoff exponencial.
- **Frontend:** HTML5 Semántico, CSS3 Moderno (Glassmorphism, CSS Custom Properties, Diseño Responsivo Mobile-First), JavaScript nativo modular (Separación estricta de responsabilidades sin librerías pesadas).

---

## 📁 Estructura Modular del Proyecto
Siguiendo las pautas de arquitectura de software para sistemas distribuidos, el código se encuentra desacoplado y categorizado por responsabilidad:

```text
websocket-counter-class/
│
├── server/                               # LÓGICA DEL SERVIDOR DISTRIBUIDO
│   ├── server.js                         # Inicialización HTTP, Express y Socket.IO
│   │
│   ├── socket/                           # MANEJADORES DE EVENTOS WEBSOCKET
│   │   ├── connectionHandler.js          # Ciclo de vida de conexiones y desconexiones
│   │   ├── messageHandler.js             # Eventos: envío, edición, eliminación, reacciones, fijado
│   │   └── userHandler.js                # Eventos: unión de usuarios, presencia y estado "escribiendo"
│   │
│   └── services/                         # SERVICIOS Y DOMINIO DE DATOS
│       ├── chatService.js                # Gestión de mensajes, historial, mutaciones y reacciones
│       └── userService.js                # Gestión en memoria de usuarios activos y presencia
│
├── public/                               # CLIENTE WEB (FRONTEND MODULAR)
│   ├── index.html                        # Interfaz semántica con modal de ingreso y layout de chat
│   │
│   ├── css/
│   │   └── style.css                     # Sistema de diseño contemporáneo, animaciones y modo oscuro
│   │
│   └── js/
│       ├── socket.js                     # Capa de abstracción de red y cliente WebSocket
│       ├── ui.js                         # Renderizado del DOM, componentes reactivos y efectos visuales
│       └── app.js                        # Controlador / Orquestador principal de la aplicación
│
├── package.json                          # Metadatos y scripts del proyecto
├── README.md                             # Documentación técnica de despliegue y uso
└── INFORME_LABORATORIO.md                # Respuestas a las 6 preguntas de análisis y guía de evidencias
```

---

## ⚡ Requisitos Previos e Instalación

### Requisitos
- **Node.js:** Versión 18.0.0 o superior instalada. Verifique con:
  ```bash
  node -v
  ```
- **Navegadores:** Cualquier navegador moderno (Chrome, Edge, Firefox, Safari).

### Instalación de dependencias
Abra un terminal en la raíz del proyecto y ejecute:
```bash
npm install
```

---

## 🏃‍♂️ Ejecución del Proyecto

### Modo Estándar
```bash
npm start
```

### Modo Desarrollo (Auto-recarga en cambios)
```bash
npm run dev
```

El servidor iniciará en el puerto **3000** por defecto:
- **URL Local:** `http://localhost:3000`
- **Endpoint de Salud (Health Check):** `http://localhost:3000/api/health`

---

## 🔌 Especificación de Eventos WebSocket

| Evento | Dirección | Payload | Propósito |
| :--- | :---: | :--- | :--- |
| `user:join` | Cliente → Servidor | `{ username }` | Solicitud de ingreso con nombre. |
| `chat:init` | Servidor → Cliente | `{ currentUser, messages, pinnedMessage, users }` | Estado inicial enviado al cliente al unirse. |
| `users:update` | Servidor → Todos | `{ users, count }` | Lista reactiva de usuarios conectados y total. |
| `notification:event` | Servidor → Todos | `{ id, type, text, timestamp }` | Notificación de entrada/salida de usuarios. |
| `message:send` | Cliente → Servidor | `{ text, replyTo }` | Envío de un nuevo mensaje grupal. |
| `message:new` | Servidor → Todos | `{ id, senderId, author, text, timestamp, replyTo, ... }` | Difusión del nuevo mensaje en tiempo real. |
| `message:edit` | Cliente → Servidor | `{ id, newText }` | Solicitud de edición por el autor del mensaje. |
| `message:edited` | Servidor → Todos | `{ id, text, isEdited, editedAt }` | Notificación a todos del mensaje modificado con `(editado)`. |
| `message:delete` | Cliente → Servidor | `{ id }` | Solicitud de eliminación (soft-delete). |
| `message:deleted` | Servidor → Todos | `{ id, text, isDeleted }` | Notificación de mensaje eliminado. |
| `message:react` | Cliente → Servidor | `{ id, emoji }` | Alterna una reacción (👍, ❤️, 😂, 🎉, 🔥). |
| `message:reaction_updated` | Servidor → Todos | `{ id, reactions }` | Sincronización de reacciones para todos. |
| `message:pin` | Cliente → Servidor | `{ id }` | Fijar o desfijar mensaje en el banner superior. |
| `message:pinned_updated` | Servidor → Todos | `{ pinnedMessage, action }` | Actualización del mensaje fijado para todos. |
| `typing:start` / `typing:stop` | Cliente → Servidor | *Vacío* | Indica inicio/fin de escritura. |
| `typing:update` | Servidor → Otros | `{ username, isTyping }` | Muestra "Andrea está escribiendo..." a los demás. |
| `user:status` | Cliente → Servidor | `{ status }` | Actualiza estado de presencia (`online`, `away`, `busy`). |

---

## 🏆 Retos Adicionales Implementados
Para enriquecer la aplicación y acceder a la bonificación completa (+1 punto), se implementaron **8 retos funcionales** debidamente identificados en el código:

1. **Reto 1: Está escribiendo... (`typing:start` / `typing:stop` / `typing:update`)**
   - Detecta la entrada de texto en el input con un debounce de 1.8s.
   - Informa en tiempo real con animación de tres puntos si uno o varios usuarios están redactando.
2. **Reto 2: Confirmación de entrega visual (`✓✓`)**
   - Los mensajes salientes muestran el distintivo de entrega exitosa en el feed.
3. **Reto 3: Reacciones a mensajes (`message:react` / `message:reaction_updated`)**
   - Barra flotante de reacciones rápidas (👍, ❤️, 😂, 🎉, 🔥).
   - Acumulación reactiva con contador y tooltip que muestra quiénes reaccionaron.
4. **Reto 4: Eliminar mensajes (`message:delete` / `message:deleted`)**
   - El autor del mensaje puede eliminarlo. El servidor valida la autoría por `socket.id`.
   - Se propaga el estado eliminado con mensaje estilizado: *"Este mensaje ha sido eliminado."*
5. **Reto 9: Reconexión automática con recuperación de sesión**
   - El cliente Socket.IO gestiona intentos continuos de reconexión con retraso incremental.
   - La interfaz muestra los estados: `🟢 Conectado` → `🔴 Desconectado` → `🟡 Reconectando (intento X)...` → `🟢 Conectado`.
   - Al reconectar, re-autentica automáticamente al usuario sin requerir recargar la página.
6. **Reto 11: Responder / Citar mensajes (`replyTo`)**
   - Al pulsar "Responder" en cualquier mensaje, se despliega una barra de cita.
   - El mensaje saliente incluye la referencia del autor y texto citado con salto interactivo.
7. **Reto 12: Búsqueda de mensajes y filtrado de usuarios en tiempo real**
   - Barra de búsqueda superior en el feed que filtra mensajes por texto o autor.
   - Campo de búsqueda instantánea de participantes conectados en la barra lateral.
8. **Reto 13: Fijar mensajes destacados (`message:pin` / `message:pinned_updated`)**
   - Cualquier usuario puede fijar un mensaje clave en un banner superior persistente para todos.
9. **Reto 14: Estados de presencia (`user:status`)**
   - Selector en el perfil con estados: **En línea 🟢**, **Ausente 🟡** y **Ocupado 🔴**, sincronizados inmediatamente con todos los clientes.

---

## 🧪 Guía de Pruebas Multi-Usuario y Desconexión

### Prueba 1: Multiusuario Local
1. Abra cuatro ventanas de navegador distintas:
   - Ventana 1: Google Chrome (Usuario: **Andrea**)
   - Ventana 2: Microsoft Edge (Usuario: **Carlos**)
   - Ventana 3: Firefox / Navegador secundario (Usuario: **Mateo**)
   - Ventana 4: Ventana de Incógnito (Usuario: **Sofía**)
2. Compruebe:
   - Al entrar cada usuario, los demás reciben la notificación: `"... se ha conectado"` y la lista de "Usuarios en línea" incrementa su contador inmediatamente.
   - Andrea envía un mensaje ➡️ Todos los clientes lo reciben al instante con hora formateada.
   - Andrea edita su mensaje (icono de lápiz ✏️) ➡️ En los otros tres navegadores el texto cambia en vivo y aparece la etiqueta `(editado)`.
   - Carlos reacciona con ❤️ al mensaje de Andrea ➡️ El contador aparece en todas las pantallas.
   - Sofía cierra su pestaña ➡️ Se notifica: `"Sofía ha abandonado el chat."` y la lista de usuarios se actualiza.

### Prueba 2: Prueba ante Desconexión y Reconexión
1. Con los clientes abiertos y conectados, diríjase a la terminal donde corre el servidor y presione `Ctrl + C` para detenerlo.
2. Observe el indicador en los navegadores: Cambia de `🟢 Conectado` a `🔴 Desconectado` y luego a `🟡 Reconectando (intento X)...`.
3. Vuelva a iniciar el servidor con `npm start`.
4. Observe cómo en segundos los clientes se reconectan automáticamente, el badge vuelve a `🟢 Conectado` y la sesión de chat se restaura sin perder la vista.

---

## 🌐 Exposición Fuera de Localhost (Túnel Externo)

Para probar la aplicación desde un dispositivo externo (por ejemplo, desde un teléfono móvil con datos móviles):

### Alternativa 1: ngrok (Recomendada)
1. Instale ngrok (o descargue el ejecutable):
   ```bash
   npm install -g ngrok
   ```
2. Ejecute el túnel apuntando al puerto 3000:
   ```bash
   ngrok http 3000
   ```
3. Copie la URL pública generada (ej: `https://abcd-1234.ngrok-free.app`).
4. Abra la URL desde su teléfono celular (desconectado del Wi-Fi, usando datos móviles).
5. Ingrese con un nombre (ej: "Carlos Celular") e interactúe en tiempo real con su computadora.

### Alternativa 2: VS Code Port Forwarding
1. En VS Code, abra la pestaña **PORTS** (Puertos) en el panel inferior.
2. Haga clic en **Forward a Port** (Reenviar un puerto) y escriba `3000`.
3. En la columna de Visibilidad, haga clic derecho y seleccione **Port Visibility -> Public**.
4. Copie la dirección web asignada y ábrala desde su dispositivo móvil.

---

## 📄 Documento de Análisis y Respuestas
Consulte el archivo **[INFORME_LABORATORIO.md](file:///c:/Users/PC-MASTER/7MO%20SEMESTRE/Aplicaciones%20distribuidas/web-socket/websocket-counter-class/INFORME_LABORATORIO.md)** para encontrar el análisis técnico exhaustivo, las respuestas formales a las 6 preguntas del laboratorio y la plantilla estructurada de evidencias requerida para el informe final en PDF.
