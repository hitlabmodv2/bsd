const { handleAutoTyping, setupAutoTyping } = require('./OWNER/autotyping');
const { handleAutoRecord, setupAutoRecord } = require('./OWNER/autorecord');
const { handleAutoOnline, setupAutoOnline } = require('./OWNER/autoonline');
const { handleAutoAntiDelete, setupAutoAntiDelete } = require('./OWNER/autoantidelete');
const { handleAnticallCommand, setupAnticall } = require('./OWNER/anticall');
const { handleAnticallvidCommand, setupAnticallvid } = require('./OWNER/anticallvid');
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        autoFeatures: { typing: false, recording: false, online: false, antidelete: { enabled: false } }
    };
}

// Main handler untuk semua auto features
function setupAutoFeatures(sock) {
    // Setup semua auto features
    setupAutoTyping(sock);
    setupAutoRecord(sock);
    setupAutoOnline(sock);
    setupAutoAntiDelete(sock);
    setupAnticall(sock);
    setupAnticallvid(sock);
}

// Handler untuk command auto features
async function handleAutoFeaturesCommand(sock, msg, command, args, config) {
    switch (command) {
        case 'typing':
            await handleAutoTyping(sock, msg, args, config);
            break;
        case 'record':
            await handleAutoRecord(sock, msg, args, config);
            break;
        case 'online':
            await handleAutoOnline(sock, msg, args, config);
            break;
        case 'antidelete':
            const safeConfig = loadConfig(); // Use safe config loading
            await handleAutoAntiDelete(sock, msg, args, safeConfig);
            break;
        case 'rvo':
            const { viewOnceHandler } = require('./viewonce');
            return await viewOnceHandler(sock, msg);
        case 'rvov2':
            const { viewOnceV2Handler } = require('./viewoncev2');
            return await viewOnceV2Handler(sock, msg);
        case 'anticall':
            const safeConfigAnticall = loadConfig();
            await handleAnticallCommand(sock, msg, safeConfigAnticall, args);
            break;
        case 'anticallvid':
            const safeConfigAnticallvid = loadConfig();
            await handleAnticallvidCommand(sock, msg, safeConfigAnticallvid, args);
            break;
        default:
            return false; // Command tidak dikenali
    }
    return true; // Command berhasil dihandle
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = {
    setupAutoFeatures,
    handleAutoFeaturesCommand,
    handleAutoTyping,
    handleAutoRecord,
    handleAutoOnline,
    handleAutoAntiDelete,
    handleAnticallCommand,
    handleAnticallvidCommand,
    setupAutoTyping,
    setupAutoRecord,
    setupAutoOnline,
    setupAutoAntiDelete,
    setupAnticall,
    setupAnticallvid,
    ReplyRynzz
};