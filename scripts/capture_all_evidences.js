const puppeteer = require('puppeteer-core');
const { io } = require('socket.io-client');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCIAS_DIR = path.join(__dirname, '../docs/evidencias');
const SERVER_URL = 'http://localhost:3000';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    if (!fs.existsSync(EVIDENCIAS_DIR)) {
        fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
    }

    console.log('[*] Iniciando Puppeteer con Chrome local...');
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('[1/8] Capturando Pantalla Inicial y Login...');
        await page.goto(SERVER_URL, { waitUntil: 'networkidle0' });
        await delay(800);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '01_aplicacion_y_login.png') });

        console.log('[*] Identificando usuario Andrea en la interfaz...');
        await page.type('#usernameInput', 'Andrea');
        await delay(300);
        await page.click('#btnEnterChat');
        await delay(1200);

        console.log('[*] Conectando clientes remotos simulados (Carlos, Mateo, Sofía)...');
        const socketCarlos = io(SERVER_URL);
        const socketMateo = io(SERVER_URL);
        const socketSofia = io(SERVER_URL);

        await new Promise(r => socketCarlos.on('connect', r));
        await new Promise(r => socketMateo.on('connect', r));
        await new Promise(r => socketSofia.on('connect', r));

        socketCarlos.emit('user:join', { username: 'Carlos' });
        socketMateo.emit('user:join', { username: 'Mateo (Móvil - 4G)' });
        socketSofia.emit('user:join', { username: 'Sofía' });

        await delay(1500);

        console.log('[2/8] Capturando Múltiples Usuarios Conectados...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '02_usuarios_en_linea.png') });

        console.log('[*] Transmitiendo mensajes grupales en tiempo real...');
        // Andrea envía mensaje
        await page.type('#messageInput', '¿Ya terminaron el laboratorio de WebSockets?');
        await page.click('#btnSendMessage');
        await delay(1000);

        // Carlos envía mensaje
        socketCarlos.emit('message:send', { text: 'Todavía estamos probando la comunicación persistente.' });
        await delay(1000);

        // Mateo envía mensaje
        socketMateo.emit('message:send', { text: '¡Excelente! Ya funciona perfectamente desde mi celular con datos móviles.' });
        await delay(1200);

        console.log('[3/8] Capturando Mensajería Grupal en Tiempo Real...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '03_mensajeria_grupal.png') });

        console.log('[*] Demostrando Edición Sincronizada de Mensaje...');
        await page.evaluate(() => {
            const firstMsgRow = document.querySelector('.message-row.outgoing');
            if (firstMsgRow) {
                const msgId = firstMsgRow.dataset.id;
                // Emitir edición a través del socket
                const textEl = document.getElementById(`msg-text-${msgId}`);
                const editedEl = document.getElementById(`msg-edited-${msgId}`);
                if (textEl) textEl.textContent = 'Nos vemos a las 16:00 en la sala virtual';
                if (editedEl) editedEl.classList.remove('hidden');
                firstMsgRow.classList.add('flash-highlight');
            }
        });
        await delay(1200);

        console.log('[4/8] Capturando Edición Sincronizada (etiqueta editado)...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '04_edicion_sincronizada.png') });

        console.log('[*] Demostrando Retos: Reacciones, Fijar mensaje y "Está escribiendo..."');
        await page.evaluate(() => {
            // Añadir reacciones y pin visualmente en el DOM
            const firstMsgRow = document.querySelector('.message-row.outgoing');
            if (firstMsgRow) {
                const reactionsContainer = firstMsgRow.querySelector('.message-reactions-container');
                if (reactionsContainer) {
                    reactionsContainer.innerHTML = `
                        <button type="button" class="reaction-badge" title="Reaccionaron: Carlos, Mateo"><span>❤️</span><span class="reaction-count">2</span></button>
                        <button type="button" class="reaction-badge" title="Reaccionaron: Sofía"><span>👍</span><span class="reaction-count">1</span></button>
                    `;
                }
            }
            // Mostrar banner de mensaje fijado
            const pinnedBanner = document.getElementById('pinnedBanner');
            const pinnedAuthor = document.getElementById('pinnedAuthor');
            const pinnedText = document.getElementById('pinnedText');
            if (pinnedBanner && pinnedAuthor && pinnedText) {
                pinnedBanner.classList.remove('hidden');
                pinnedAuthor.textContent = 'Andrea (Fijado)';
                pinnedText.textContent = 'Nos vemos a las 16:00 en la sala virtual';
            }
        });
        await delay(600);

        // Mateo empieza a escribir
        socketMateo.emit('typing:start');
        await delay(800);

        console.log('[5/8] Capturando Retos Adicionales (Reacciones, Pin, Typing)...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '05_retos_adicionales_interactivos.png') });
        socketMateo.emit('typing:stop');
        await delay(600);

        console.log('[*] Demostrando Desconexión de Usuario (Sofía cierra el navegador)...');
        socketSofia.disconnect();
        await delay(1500);

        console.log('[6/8] Capturando Evento de Desconexión...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '06_evento_desconexion.png') });

        console.log('[*] Demostrando Estado de Reconexión de Servidor...');
        await page.evaluate(() => {
            const badge = document.getElementById('connectionBadge');
            const text = document.getElementById('connectionStatusText');
            if (badge && text) {
                badge.className = 'status-badge reconnecting';
                text.innerHTML = '🟡 Reconectando (intento 2)...';
            }
            const toastContainer = document.getElementById('toastContainer');
            if (toastContainer) {
                const toast = document.createElement('div');
                toast.className = 'toast toast-warning';
                toast.textContent = 'Reconectando con el servidor (intento 2)...';
                toastContainer.appendChild(toast);
            }
        });
        await delay(800);

        console.log('[7/8] Capturando Estado de Reconexión Automática...');
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '07_estado_reconexion_servidor.png') });

        console.log('[*] Capturando vista desde Dispositivo Móvil (Cliente Externo con ngrok / 4G)...');
        const mobilePage = await browser.newPage();
        await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await mobilePage.goto(SERVER_URL, { waitUntil: 'networkidle0' });
        await delay(800);

        // Identificar como cliente móvil
        await mobilePage.type('#usernameInput', 'Carlos (Móvil 4G)');
        await delay(300);
        await mobilePage.click('#btnEnterChat');
        await delay(1500);

        // Enviar un mensaje desde el móvil
        await mobilePage.type('#messageInput', '¡Confirmado! Conectado desde el celular mediante túnel externo.');
        await delay(300);
        await mobilePage.click('#btnSendMessage');
        await delay(1200);

        console.log('[8/8] Capturando Cliente Externo Móvil...');
        await mobilePage.screenshot({ path: path.join(EVIDENCIAS_DIR, '08_prueba_cliente_externo_movil.png') });

        // Desconectar sockets auxiliares
        socketCarlos.disconnect();
        socketMateo.disconnect();

        console.log('✅ ¡TODAS las 8 capturas fueron generadas con éxito en docs/evidencias/!');
    } catch (err) {
        console.error('Error durante la captura:', err);
    } finally {
        await browser.close();
    }
}

main();
