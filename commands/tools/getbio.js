module.exports = {
    name: "getbio",
    async execute(sock, msg, args) {
        // 1. Get the JID of the target (replied person, tagged person, or the sender)
        const cited = msg.message?.extendedTextMessage?.contextInfo?.participant || 
                      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        // Default to the sender if no one is tagged/replied
        const target = cited || msg.key.remoteJid;

        try {
            // 2. Fetch the Status (Bio) from WhatsApp servers
            const statusInfo = await sock.fetchStatus(target);

            // 3. Format the response
            const response = `
📋 *User Information*
────────────────
👤 *User:* @${target.split('@')[0]}
📝 *Bio:* ${statusInfo.status || 'No bio found'}
📅 *Set At:* ${statusInfo.setAt ? new Date(statusInfo.setAt).toLocaleDateString() : 'Unknown'}
            `.trim();

            await sock.sendMessage(msg.key.remoteJid, { 
                text: response,
                mentions: [target] 
            }, { quoted: msg });

        } catch (err) {
            console.error(err);
            // Error usually occurs if the person has privacy settings on 
            // or if the bot is blocked.
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "❌ *Error:* I couldn't fetch the bio. This is usually due to privacy settings or a server delay." 
            });
        }
    }
};