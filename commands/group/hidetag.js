module.exports = {
    name: "hidetag",
    async execute(sock, msg, args) {
        // 1. Check if the message is in a group
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command can only be used in groups!" });

        // 2. Fetch all group participants
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants.map(p => p.id);

        // 3. Determine the message text
        // Use the text provided after the command, or a default message
        const textToTag = args.join(" ") || "📢 *Attention Everyone!*";

        // 4. Send the message with all IDs in the 'mentions' array
        // This triggers the notification for everyone without showing names
        await sock.sendMessage(msg.key.remoteJid, { 
            text: textToTag, 
            mentions: participants 
        });

        // Optional: Delete the command trigger to keep the chat clean
        await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
    }
};