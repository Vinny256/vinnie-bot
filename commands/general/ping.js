module.exports = {
    name: "ping",
    async execute(sock, msg, args) {
        const start = Date.now();
        
        // 1. Send an initial "Scanning" message
        const { key } = await sock.sendMessage(msg.key.remoteJid, { 
            text: "🛰️ *Vinnie System Diagnostic...*" 
        });

        const end = Date.now();
        const latency = end - start;

        // 2. Determine performance color/status
        let status = "🟢 EXCELLENT";
        if (latency > 500) status = "🟡 AVERAGE";
        if (latency > 1000) status = "🔴 SLOW";

        // 3. Create a visual "Speed Bar"
        const barLength = 10;
        const filledChars = Math.min(Math.floor(latency / 100), barLength);
        const speedBar = "▬".repeat(filledChars) + "🔘" + "▬".repeat(barLength - filledChars);

        // 4. Get System Uptime
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        const response = `
🚀 *VINNIE BOT STATUS* 🚀

📡 *Latency:* ${latency}ms
📊 *Performance:* ${status}
⏲️ *Uptime:* ${hours}h ${minutes}m

⚡ *Speed Bar:*
[ ${speedBar} ]

_System is running at optimal capacity._`.trim();

        // 5. Edit the original message to look interactive
        await sock.sendMessage(msg.key.remoteJid, { 
            text: response, 
            edit: key 
        });
    }
};