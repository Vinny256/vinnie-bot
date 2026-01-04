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

const automationHandler = require('./listeners/automation');

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VINNIE BOT IS RUNNING 🚀');
}).listen(process.env.PORT || 3000);

async function startVinnie() {
    console.log("\n--- 🤖 Vinnie Bot Starter ---");
    const authFolder = './vinnie_auth';
    const sessionID = process.env.SESSION_ID;

    if (sessionID && !fs.existsSync(`${authFolder}/creds.json`)) {
        console.log("📦 SESSION_ID detected. Injecting...");
        await fs.ensureDir(authFolder);
        try {
            const cleanID = sessionID.replace('VINNIE-SESSION-', '').trim();
            const decoded = Buffer.from(cleanID, 'base64').toString('utf-8');
            const creds = JSON.parse(decoded, BufferJSON.reviver);
            await fs.writeFile(path.join(authFolder, 'creds.json'), JSON.stringify(creds, BufferJSON.replacer, 2));
            console.log("✅ Credentials injected.");
        } catch (e) { console.error("❌ Injection failed:", e.message); }
    }

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
            const restartRequired = code !== DisconnectReason.loggedOut;

            // 🛠️ MAC ERROR & CORRUPTION PROTECTION
            // If the error is a Bad MAC or Session error, wipe the folder so we can rescan cleanly
            const reason = lastDisconnect?.error?.message || "";
            if (reason.includes("Bad MAC") || code === 401 || code === DisconnectReason.loggedOut) {
                console.log("🧹 Session corrupted (Bad MAC). Wiping auth folder for a clean start...");
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

                // 🛡️ STRICT SPAM & BAN PROTECTION (Anti-Lag)
                // Ignore messages older than 10 seconds to prevent "Reply Flood" on restart
                const now = Math.floor(Date.now() / 1000);
                const msgTime = msg.messageTimestamp;
                const diff = now - msgTime;
                if (diff > 10) {
                    console.log(`⚠️ Ignoring old message (${diff}s ago) to prevent ban.`);
                    continue; 
                }

                const isMe = msg.key.fromMe;
                // Note: We allow !isMe OR isMe so it replies to the host number too.
                
                const mType = Object.keys(msg.message)[0];
                const text = (
                    mType === 'conversation' ? msg.message.conversation :
                    mType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
                    mType === 'imageMessage' ? msg.message.imageMessage.caption :
                    mType === 'videoMessage' ? msg.message.videoMessage.caption : ""
                ).trim();

                if (text) console.log(`📩 [${msg.pushName || (isMe ? 'Owner' : 'User')}]: ${text}`);

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
