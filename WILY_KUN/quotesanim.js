
const axios = require('axios');
const { loadConfig } = require('../Wilykun.js');
const { Wily } = require('../CODE_REPLAY/reply.js');

// Function to check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    if (config.bot?.mode === 'self') {
        const botNumber = config.bot?.botNumber || '';
        const ownerNumber = config.bot?.owner || '';
        const senderNumber = senderJid.split('@')[0];
        const isHardcodedBot = senderNumber === '6289681008411';

        return fromMe || senderNumber === botNumber || senderNumber === ownerNumber || isHardcodedBot;
    }
    return true; // Public mode allows everyone
}

// Main handler function for quotes anime
async function handleQuotesAnimCommand(sock, msg) {
    try {
        const config = loadConfig();
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        // Extract sender number correctly
        let senderNumber;
        if (msg.key.participant) {
            senderNumber = msg.key.participant;
        } else if (msg.key.fromMe) {
            senderNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        } else {
            senderNumber = msg.key.remoteJid;
        }

        // Check access based on bot mode
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Send loading message
        await Wily(`🔄 *MENGAMBIL QUOTES ANIME...*\n\n⏳ Sedang mengambil quotes anime random dari database...\n📚 Tunggu sebentar ya!`, msg, sock);

        try {
            // Fetch quotes from API
            const response = await axios.get('https://api.siputzx.my.id/api/r/quotesanime', {
                headers: {
                    'accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            if (!response.data || !response.data.status || !response.data.data || response.data.data.length === 0) {
                throw new Error('No quotes data available');
            }

            // Get random quote from the array
            const quotes = response.data.data;
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

            // Format the quote message
            const quoteText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀
┃ 📜 *QUOTES ANIME RANDOM*
┃ 
┃ 💬 *Quote:*
┃ "${randomQuote.quotes || 'Quote tidak tersedia'}"
┃ 
┃ 👤 *Karakter:* ${randomQuote.karakter || 'Unknown'}
┃ 🎭 *Anime:* ${randomQuote.anime || 'Unknown'}
┃ 📺 *Episode:* ${randomQuote.episode || 'Unknown'}
┃ 
┃ 🔗 *Link:* ${randomQuote.link || 'Tidak tersedia'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🎌 *WilyKun Bot - Quotes Anime Collection* ✨`;

            // Send the character image if available
            if (randomQuote.gambar && randomQuote.gambar.startsWith('http')) {
                try {
                    await sock.sendMessage(senderJid, {
                        image: { url: randomQuote.gambar },
                        caption: quoteText
                    }, { quoted: msg });
                } catch (imageError) {
                    // If image fails, send text only
                    await Wily(quoteText, msg, sock);
                }
            } else {
                // Send text only if no image
                await Wily(quoteText, msg, sock);
            }

        } catch (apiError) {
            let errorMessage = '❌ *GAGAL MENGAMBIL QUOTES ANIME*\n\n';
            
            if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
                errorMessage += '⏰ Koneksi timeout ke server quotes\n💡 Coba lagi dalam beberapa saat';
            } else if (apiError.response?.status === 404) {
                errorMessage += '🔍 API quotes anime tidak ditemukan\n💡 Service mungkin sedang maintenance';
            } else if (apiError.response?.status >= 500) {
                errorMessage += '🔧 Server error pada API quotes\n💡 Coba lagi nanti';
            } else if (apiError.message.includes('Network Error')) {
                errorMessage += '🌐 Error koneksi internet\n💡 Periksa koneksi dan coba lagi';
            } else {
                errorMessage += `🔄 Error: ${apiError.message}\n💡 Silakan coba command lagi`;
            }

            await Wily(errorMessage, msg, sock);
        }

    } catch (error) {
        // Silent error handling - no console logs
        try {
            await Wily(`❌ *TERJADI KESALAHAN*\n\n🔄 Gagal memproses command quotesanim\n💡 Silakan coba lagi dalam beberapa saat`, msg, sock);
        } catch (sendError) {
            // Silent fail
        }
    }
}

module.exports = {
    handleQuotesAnimCommand,
    checkAccess
};
