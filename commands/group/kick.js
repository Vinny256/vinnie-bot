module.exports = {
    name: "kick",
    async execute(sock, msg, args) {
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command only works in groups!" });

        // Check if a user was mentioned or replied to
        const cited = msg.message.extendedTextMessage?.contextInfo?.participant || 
                      msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!cited) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Please reply to a user or tag them to kick them." });

        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [cited], "remove");
            await sock.sendMessage(msg.key.remoteJid, { text: "✅ User has been removed from the group." });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ I couldn't kick them. Am I an admin?" });
        }
    }
};