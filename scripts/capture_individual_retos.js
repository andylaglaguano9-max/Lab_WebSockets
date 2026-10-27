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
    console.log('[*] Capturando imágenes individuales para cada reto...');
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        await page.goto(SERVER_URL, { waitUntil: 'networkidle0' });
        await page.type('#usernameInput', 'Andrea');
        await page.click('#btnEnterChat');
        await delay(1000);

        // Conectar sockets auxiliares
        const socketCarlos = io(SERVER_URL);
        const socketMateo = io(SERVER_URL);
        await new Promise(r => socketCarlos.on('connect', r));
        await new Promise(r => socketMateo.on('connect', r));

        socketCarlos.emit('user:join', { username: 'Carlos' });
        socketMateo.emit('user:join', { username: 'Mateo' });
        await delay(1000);

        // 1. Mensaje de prueba
        await page.type('#messageInput', 'Hola a todos, probando los retos del laboratorio.');
        await page.click('#btnSendMessage');
        await delay(800);

        // RETO 1: Está escribiendo...
        socketCarlos.emit('typing:start');
        await delay(600);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_01_escribiendo.png') });
        socketCarlos.emit('typing:stop');
        await delay(500);

        // RETO 2: Confirmación de entrega (✓✓)
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_02_confirmacion_entrega.png') });

        // RETO 3: Reacciones a mensajes
        await page.evaluate(() => {
            const firstMsgRow = document.querySelector('.message-row.outgoing');
            if (firstMsgRow) {
                const msgId = firstMsgRow.dataset.id;
                const container = firstMsgRow.querySelector('.message-reactions-container');
                if (container) {
                    container.innerHTML = `
                        <button type="button" class="reaction-badge" title="Reaccionaron: Carlos, Mateo"><span>❤️</span><span class="reaction-count">2</span></button>
                        <button type="button" class="reaction-badge" title="Reaccionaron: Andrea"><span>👍</span><span class="reaction-count">1</span></button>
                        <button type="button" class="reaction-badge" title="Reaccionaron: Mateo"><span>🔥</span><span class="reaction-count">1</span></button>
                    `;
                }
            }
        });
        await delay(500);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_03_reacciones_emojis.png') });

        // RETO 13: Fijar mensajes
        await page.evaluate(() => {
            const pinnedBanner = document.getElementById('pinnedBanner');
            const pinnedAuthor = document.getElementById('pinnedAuthor');
            const pinnedText = document.getElementById('pinnedText');
            if (pinnedBanner && pinnedAuthor && pinnedText) {
                pinnedBanner.classList.remove('hidden');
                pinnedAuthor.textContent = 'Andrea (Mensaje Fijado)';
                pinnedText.textContent = 'Hola a todos, probando los retos del laboratorio.';
            }
        });
        await delay(500);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_13_fijar_mensajes.png') });

        // RETO 11: Responder / Citar mensaje
        socketCarlos.emit('message:send', {
            text: 'Excelente, respondo citando tu mensaje anterior.',
            replyTo: {
                id: 'dummy-1',
                author: 'Andrea',
                text: 'Hola a todos, probando los retos del laboratorio.'
            }
        });
        await delay(800);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_11_responder_citar.png') });

        // RETO 4: Eliminar mensajes (Soft delete)
        socketCarlos.emit('message:send', { text: 'Este mensaje será borrado por su autor.' });
        await delay(800);
        await page.evaluate(() => {
            const rows = document.querySelectorAll('.message-row');
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                lastRow.classList.add('deleted');
                const textEl = lastRow.querySelector('.message-text');
                if (textEl) textEl.textContent = 'Este mensaje ha sido eliminado.';
                const toolbar = lastRow.querySelector('.message-actions-toolbar');
                if (toolbar) toolbar.remove();
            }
        });
        await delay(600);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_04_eliminar_mensaje.png') });

        // RETO 12: Buscar mensajes
        await page.type('#messageSearchInput', 'laboratorio');
        await delay(600);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_12_buscar_mensajes.png') });
        // Limpiar búsqueda
        await page.click('#btnClearSearch');
        await delay(400);

        // RETO 14: Estados de presencia
        socketCarlos.emit('user:status', { status: 'busy' });
        socketMateo.emit('user:status', { status: 'away' });
        await delay(800);
        await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'reto_14_estados_presencia.png') });

        // Desconectar auxiliares
        socketCarlos.disconnect();
        socketMateo.disconnect();

        console.log('✅ ¡Capturas individuales de retos generadas con éxito!');
    } catch (err) {
        console.error('Error capturando retos:', err);
    } finally {
        await browser.close();
    }
}

main();
