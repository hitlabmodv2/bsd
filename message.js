import fs from 'fs';
import path from 'path';
import { Wily } from './CODE_REPLY/reply.js';
import { handleModeCommand } from './WILY_KUN/OWNER/mode.js';
import { handleOnlineCommand } from './WILY_KUN/OWNER/online.js';
import AutoReaction from './WILY_KUN/OWNER/reaction.js';
import { handleTypingCommand, autoTypingInstance } from './WILY_KUN/OWNER/typing.js';
import { handleRecordCommand, autoRecordInstance } from './WILY_KUN/OWNER/record.js';
import { handleBackupSourceCodeCommand } from './WILY_KUN/OWNER/backupsc.js';
import { handleBackupSesiCommand } from './WILY_KUN/OWNER/backupsesi.js';
import { handleMenuCommand } from './MENU/menu.js';
import { handleWelcomeCommand, handleWelcomeDeleteConfirmation, handleWelcomeDeleteAllConfirmation } from './WILY_KUN/OWNER/welcome.js';
import { handleGoodbyeCommand, handleGoodbyeDeleteConfirmation, handleGoodbyeDeleteAllConfirmation } from './WILY_KUN/OWNER/goodbye.js';
import { handleLevelupCommand, handleLevelCommand, integrateLevelSystem } from './WILY_KUN/OWNER/levelup.js';
import { handleAutoBioCommand } from './WILY_KUN/OWNER/autobio.js';
import { handleClearSesiCommand } from './WILY_KUN/OWNER/clearsesi.js';
import { handleListChatCommand, trackChatMessage } from './WILY_KUN/OWNER/listchat.js';
import { handleNotifGcCommand } from './WILY_KUN/OWNER/notifgc.js';

// Fungsi untuk membaca nomor bot dari creds.json
function getBotNumber() {
    try {
        if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
                const botNumber = creds.me.id.split(':')[0];
                return botNumber;
            }
        }
        // Coba baca dari config.json juga
        const config = readConfig();
        const fallbackNumber = config.OWNER[0] || "6289681008411";
        return fallbackNumber;
    } catch (error) {
        return "6289681008411"; // fallback nomor bot
    }
}

// Fungsi untuk membaca config dengan fallback
function readConfig() {
    try {
        if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "session"
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "packName": "Sticker Dibuat Oleh : Wily",
            "packPublish": "Dika Ardnt.",
            "SESSION_NAME": "session"
        };
    }
}

// Fungsi untuk cek apakah user adalah owner
function isOwner(senderNumber, config) {
    return config.OWNER.includes(senderNumber);
}

// Fungsi untuk cek apakah bot harus respon
function shouldRespond(senderNumber, config, isGroup = false, fromMe = false) {
    // Selalu respon owner, terlepas dari mode atau fromMe
    if (isOwner(senderNumber, config)) {
        return true;
    }

    // Jika fromMe tapi bukan owner, tidak respon
    if (fromMe) {
        return false;
    }

    // Jika mode self, hanya respon owner (sudah dicek di atas)
    if (config.SELF || config.mode === 'self') {
        return false;
    }

    // Jika mode public, respon semua
    return true;
}

// Main message handler
export async function handleMessage(m, sock) {
    try {
        const config = readConfig();

        // Ekstraksi sender number yang lebih baik
        let senderNumber = '';

        // Deteksi fromMe (pesan dari bot sendiri) dengan prioritas tertinggi
        let isFromMe = m.key?.fromMe === true;

        // Ekstraksi nomor sender terlebih dahulu
        let tempSenderNumber = '';
        if (m.sender) {
            tempSenderNumber = m.sender.split('@')[0];
        } else if (m.key?.participant) {
            tempSenderNumber = m.key.participant.split('@')[0];
        } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
            tempSenderNumber = m.key.remoteJid.split('@')[0];
        }

        // Ambil nomor bot untuk perbandingan
        const botNumber = getBotNumber();

        // Jika fromMe tidak terdeteksi tapi sender adalah bot number, anggap sebagai fromMe
        if (!isFromMe && tempSenderNumber === botNumber) {
            isFromMe = true;
        }

        if (isFromMe) {
            // Ini pesan dari bot sendiri, gunakan nomor bot
            senderNumber = botNumber;
        } else {
            // Pesan dari user lain
            senderNumber = tempSenderNumber;
        }

        // Pastikan senderNumber valid
        if (!senderNumber || senderNumber === 'undefined' || senderNumber === '' || senderNumber === 'status') {
            return;
        }

        // Extract message text - improved extraction
        let messageText = '';
        if (m.message?.conversation) {
            messageText = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            messageText = m.message.extendedTextMessage.text;
        } else if (m.message?.imageMessage?.caption) {
            messageText = m.message.imageMessage.caption;
        } else if (m.message?.videoMessage?.caption) {
            messageText = m.message.videoMessage.caption;
        }

        // Fallback untuk compatibility dengan properti lain
        if (!messageText && m.text) {
            messageText = m.text;
        }
        if (!messageText && m.body) {
            messageText = m.body;
        }

        // Skip if no sender
        if (!senderNumber) return;

        // Handle auto typing untuk semua pesan masuk (kecuali dari bot sendiri)
        if (!isFromMe && messageText) {
            await autoTypingInstance.handleIncomingMessage(m);
            await autoRecordInstance.handleIncomingMessage(m);
            
            // Integrate level system untuk pesan dari group
            await integrateLevelSystem(m, sock);
            
            // Track chat message untuk listchat - pastikan dipanggil untuk semua pesan
            try {
                trackChatMessage(m, sock);
            } catch (trackError) {
                // Silent error untuk tracking
            }
        }

        // Track juga untuk pesan yang tidak punya text tapi dari grup
        if (!isFromMe && !messageText && m.key?.remoteJid?.endsWith('@g.us')) {
            try {
                trackChatMessage(m, sock);
            } catch (trackError) {
                // Silent error untuk tracking
            }
        }

        // Skip if no text
        if (!messageText) return;

        // ===== CEK REPLY UNTUK WELCOME/GOODBYE DELETE DULU =====
        // Proses reply message terlebih dahulu sebelum cek prefix
        const hasQuoted = !!(m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage);

        if (hasQuoted) {
            // PRIORITAS 0: Cek emoji category reply dulu (PALING TINGGI)
            const autoReactionForReply = new AutoReaction();
            const emojiReplyHandled = await autoReactionForReply.handleReplyEmojiSelection(m, { hisoka: sock });
            if (emojiReplyHandled) {
                return; // Stop processing jika sudah dihandle
            }

            // PRIORITAS 1: Cek welcome delete all confirmation dulu
            const welcomeDeleteAllHandled = await handleWelcomeDeleteAllConfirmation(m, { hisoka: sock });
            if (welcomeDeleteAllHandled) {
                return; // Stop processing jika sudah dihandle
            }

            // PRIORITAS 2: Cek goodbye delete all confirmation
            const goodbyeDeleteAllHandled = await handleGoodbyeDeleteAllConfirmation(m, { hisoka: sock });
            if (goodbyeDeleteAllHandled) {
                return; // Stop processing jika sudah dihandle
            }

            // PRIORITAS 3: Cek welcome delete confirmation biasa
            const welcomeDeleteHandled = await handleWelcomeDeleteConfirmation(m, { hisoka: sock });
            if (welcomeDeleteHandled) {
                return; // Stop processing jika sudah dihandle
            }

            // PRIORITAS 4: Cek goodbye delete confirmation biasa
            const goodbyeDeleteHandled = await handleGoodbyeDeleteConfirmation(m, { hisoka: sock });
            if (goodbyeDeleteHandled) {
                return; // Stop processing jika sudah dihandle
            }
        }

        // Jika ini adalah reply dengan Y/N saja untuk delete all
        if (hasQuoted && messageText && /^[yn]$/i.test(messageText.trim())) {
            const welcomeDeleteAllForceHandled = await handleWelcomeDeleteAllConfirmation(m, { hisoka: sock });
            if (welcomeDeleteAllForceHandled) {
                return;
            }

            const goodbyeDeleteAllForceHandled = await handleGoodbyeDeleteAllConfirmation(m, { hisoka: sock });
            if (goodbyeDeleteAllForceHandled) {
                return;
            }
        }

        // Jika ini adalah reply dengan angka saja, coba handle delete lagi dengan force
        if (hasQuoted && messageText && /^\d+$/.test(messageText.trim())) {
            const welcomeForceHandled = await handleWelcomeDeleteConfirmation(m, { hisoka: sock });
            if (welcomeForceHandled) {
                return;
            }

            const goodbyeForceHandled = await handleGoodbyeDeleteConfirmation(m, { hisoka: sock });
            if (goodbyeForceHandled) {
                return;
            }
        }

        // Extra check untuk reply message tanpa prefix
        if (hasQuoted && messageText && messageText.length < 5 && (/^\d+$/.test(messageText.trim()) || /^[yn]$/i.test(messageText.trim()))) {
            // Cek welcome delete all dulu
            const extraWelcomeDeleteAllHandled = await handleWelcomeDeleteAllConfirmation(m, { hisoka: sock });
            if (extraWelcomeDeleteAllHandled) {
                return;
            }

            // Cek goodbye delete all
            const extraGoodbyeDeleteAllHandled = await handleGoodbyeDeleteAllConfirmation(m, { hisoka: sock });
            if (extraGoodbyeDeleteAllHandled) {
                return;
            }

            // Cek welcome delete biasa
            const extraWelcomeHandled = await handleWelcomeDeleteConfirmation(m, { hisoka: sock });
            if (extraWelcomeHandled) {
                return;
            }

            // Cek goodbye delete biasa
            const extraGoodbyeHandled = await handleGoodbyeDeleteConfirmation(m, { hisoka: sock });
            if (extraGoodbyeHandled) {
                return;
            }
        }

        // Check if message starts with prefix
        const prefix = '.';
        if (!messageText.startsWith(prefix)) return;

        // Extract command and arguments
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args.shift()?.toLowerCase();
        const text = args.join(' ');

        // Check if bot should respond based on mode
        const isGroup = !!m.key?.participant;
        if (!shouldRespond(senderNumber, config, isGroup, isFromMe)) {
            return; // Silent ignore for non-owners in self mode
        }




        // Handle commands
        const hisoka = sock; // Alias for compatibility


        switch (command) {
            case 'mode':
                await handleModeCommand(m, { hisoka, text, command });
                break;

            case 'online':
                await handleOnlineCommand(m, { hisoka, text, command });
                break;

            case 'reaction':
                const autoReaction = new AutoReaction();
                await autoReaction.handleReactionCommand(m, { hisoka, text, command });
                break;

            case 'typing':
                await handleTypingCommand(m, { hisoka, text, command });
                break;

            case 'record':
                await handleRecordCommand(m, { hisoka, text, command });
                break;

            case 'backupsc':
                await handleBackupSourceCodeCommand(m, { hisoka, text, command });
                break;

            case 'backupsesi':
                await handleBackupSesiCommand(m, { hisoka, text, command });
                break;

            case 'menu':
                await handleMenuCommand(m, { hisoka, text, command });
                break;

            case 'welcome':
                await handleWelcomeCommand(m, { hisoka, text, command });
                break;

            case 'goodbye':
                await handleGoodbyeCommand(m, { hisoka, text, command });
                break;

            case 'levelup':
                await handleLevelupCommand(m, { hisoka, text, command });
                break;

            case 'level':
                await handleLevelCommand(m, { hisoka, text, command });
                break;

            case 'autobio':
                await handleAutoBioCommand(m, { hisoka, text, command });
                break;

            case 'clearsesi':
                await handleClearSesiCommand(m, { hisoka, text, command });
                break;

            case 'listchat':
                try {
                    await handleListChatCommand(m, { hisoka, text, command });
                } catch (error) {
                    await Wily(`❌ Terjadi kesalahan saat memproses command listchat: ${error.message}`, m, hisoka);
                }
                break;

            case 'notifgc':
                await handleNotifGcCommand(m, { hisoka, text, command });
                break;

            default:
                // Command tidak ditemukan, tidak ada response
                break;
        }

    } catch (error) {
        try {
            await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, sock);
        } catch (replyError) {
            // Silent error handling
        }
    }
}

// Export default
export default handleMessage;