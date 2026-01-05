require('dotenv').config();
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    BufferJSON 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const qrcode = require('qrcode-terminal');
const http = require('http');
const mongoose = require('mongoose');

const automationHandler = require('./listeners/automation');

// --- 🔐 SECURE DATABASE CONFIG ---
// No hardcoding here. Set MONGODB_URI in your Render/Docker/Railway settings.
const mongoURI = process.env.MONGODB_URI; 

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    fullCreds: String
});
const SessionModel = mongoose.model('VinnieSession', SessionSchema);

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VINNIE BOT IS RUNNING 🚀');
}).listen(process.env.PORT || 3000);

async function startVinnie() {
    console.log("\n--- 🤖 Vinnie Bot Starter ---");
    const authFolder = './vinnie_auth';
    const sessionID = process.env.SESSION_ID;

    // --- 📥 MONGODB SESSION INJECTION ---
    if (sessionID && !fs.existsSync(`${authFolder}/creds.json`)) {
        console.log("📦 SESSION_ID detected. Fetching from Secure DB...");
        await fs.ensureDir(authFolder);
        try {
            // Only connect if not already connected
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(mongoURI);
            }
            
            const sessionData = await SessionModel.findOne({ sessionId: sessionID });

            if (sessionData) {
                const credsJson = Buffer.from(sessionData.fullCreds, 'base64').toString('utf-8');
                const creds = JSON.parse(credsJson, BufferJSON.reviver);
                
                await fs.writeFile(
                    path.join(authFolder, 'creds.json'), 
                    JSON.stringify(creds, BufferJSON.replacer, 2)
                );
                console.log("✅ Credentials injected from Cloud.");
            } else {
                console.log("❌ Error: SESSION_ID not found in Database.");
            }
        } catch (e) { 
            console.error("❌ DB Session Load failed:", e.message); 
        }
    }

    // --- 📂 COMMAND LOADER ---
    const commands = new Map();
    const cmdPath = path.resolve(__dirname, 'commands');
    if (fs.existsSync(cmdPath)) {
        const readCommands = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    readCommands(fullPath);
                } else if (file.endsWith('.js')) {
                    try {
                        const cmd = require(fullPath);
                        if (cmd.name) commands.set(cmd.name.toLowerCase(), cmd);
                    } catch (e) { }
                }
            }
        };
        readCommands(cmdPath);
        console.log(`📊 Total Commands Ready: ${commands.size}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        logger: pino({ level: "fatal" }),
        browser: Browsers.ubuntu('Chrome'), 
        syncFullHistory: false, 
        markOnlineOnConnect: true,
        fireInitQueries: true,
        getMessage: async (key) => { return { conversation: 'vinnie_sync' } }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("⏳ SCAN QR CODE:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message || "";
            
            if (reason.includes("Bad MAC") || code === 401 || code === DisconnectReason.loggedOut) {
                console.log("🧹 Session corrupted. Wiping auth folder...");
                await fs.remove(authFolder);
            }

            console.log(`❌ Connection closed. Restarting in 5s...`);
            setTimeout(() => startVinnie(), 5000); 
        } else if (connection === 'open') {
            console.log("🚀 VINNIE BOT IS ONLINE!");
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            try {
                if (!msg.message) continue;

                // 🛡️ [ANTI-SPAM] 10-second threshold
                const now = Math.floor(Date.now() / 1000);
                const msgTime = msg.messageTimestamp;
                if (now - msgTime > 10) continue; 

                const isMe = msg.key.fromMe;
                // [SELF-REPLY] Removed 'if (isMe) return' to allow bot to trigger itself
                
                const mType = Object.keys(msg.message)[0];
                const text = (
                    mType === 'conversation' ? msg.message.conversation :
                    mType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
                    mType === 'imageMessage' ? msg.message.imageMessage.caption :
                    mType === 'videoMessage' ? msg.message.videoMessage.caption : ""
                ).trim();

                if (text) console.log(`📩 [${msg.pushName || (isMe ? 'Owner (Self)' : 'User')}]: ${text}`);

                await automationHandler(sock, msg);

                if (!text.startsWith(".")) continue;
                const args = text.slice(1).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                if (commands.has(commandName)) {
                    await commands.get(commandName).execute(sock, msg, args);
                }
            } catch (err) { }
        }
    });
}

startVinnie();
