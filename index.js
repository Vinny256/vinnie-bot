require('dotenv').config();
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const NodeCache = require("node-cache");

// 🔑 Import your external listener
const automationHandler = require('./listeners/automation');

async function startVinnie() {
    const authFolder = './vinnie_auth';
    const sessionID = process.env.SESSION_ID;

    if (sessionID && !fs.existsSync(`${authFolder}/creds.json`)) {
        await fs.ensureDir(authFolder);
        const base64Data = sessionID.replace('VINNIE-SESSION-', '').trim();
        await fs.writeFile(`${authFolder}/creds.json`, Buffer.from(base64Data, 'base64').toString('utf-8'));
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS('Safari'),
        msgRetryCounterCache: new NodeCache(),
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: true
    });

    // 📁 Command Loader
    const commands = new Map();
    const cmdPath = path.join(__dirname, 'commands');
    if (fs.existsSync(cmdPath)) {
        const load = (dir) => {
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) return load(fullPath);
                if (file.endsWith('.js')) {
                    const cmd = require(fullPath);
                    if (cmd.name) commands.set(cmd.name.toLowerCase(), cmd);
                }
            });
        };
        load(cmdPath);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startVinnie();
            }
        } else if (connection === 'open') {
            console.log("🚀 VINNIE BOT IS ONLINE & READY!");
        }
    });

    // 📩 Main Message Listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
            if (!msg.message) continue;

            // 🤖 1. RUN AUTOMATION (Auto-Read/Status) from folder
            await automationHandler(sock, msg);

            // 🛡️ 2. ANTI-SPAM FILTER
            const messageTime = msg.messageTimestamp; 
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime - messageTime > 15) {
                console.log(`⏩ Skipping old message sent ${currentTime - messageTime}s ago`);
                continue; 
            }

            // ⌨️ 3. COMMAND HANDLING
            const text = (msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || "").trim();

            const prefix = "."; 
            if (!text.startsWith(prefix)) continue;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (commands.has(commandName)) {
                try {
                    await commands.get(commandName).execute(sock, msg, args);
                } catch (e) {
                    console.log("❌ Command Error:", e);
                }
            }
        }
    });
}

startVinnie();