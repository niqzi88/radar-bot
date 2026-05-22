const fs = require('fs');
const fetch = require('node-fetch');
const http = require('http'); // HTTP tanımlaması SADECE BURADA var.

const TELEGRAM_TOKEN = "BURAYA_BOT_TOKENINI_YAZ";
const CHAT_ID = "BURAYA_CHAT_ID_YAZ";
const COIN_LIST = ["XRP", "XLM", "ONDO", "PLUME", "SHIB"];

let lastSignalTime = {};

// 1. Web Sunucusu (Render'ın botunu ayakta tutması için)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
        const data = fs.readFileSync('widget_data.json', 'utf8');
        res.end(data);
    } catch (e) {
        res.end(JSON.stringify({ status: "Bekleniyor..." }));
    }
}).listen(port, () => console.log(`Sunucu ${port} portunda hazır.`));

// 2. Yardımcı Fonksiyonlar
async function getUsdTry() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        return data.rates.TRY || 34.50;
    } catch { return 34.50; }
}

async function fetchMarketData() {
    let market = {};
    await Promise.all(COIN_LIST.map(async (coin) => {
        try {
            const url = (coin === "PLUME") ? "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=PLUMEUSDT" : 
                        `https://api.binance.com/api/v3/ticker/24hr?symbol=${coin === "SHIB" ? "SHIBUSDT" : coin + "USDT"}`;
            const res = await fetch(url);
            const json = await res.json();
            market[coin] = { p: parseFloat(json.lastPrice), c: parseFloat(json.priceChangePercent) };
        } catch {}
    }));
    return market;
}

async function sendTelegramAlert(msg) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(msg)}`;
    try { await fetch(url); } catch (e) { console.error("Telegram hatası!"); }
}

function updateWidgetFile(coin, type, price, percent) {
    const data = { coin, signal: type, price: price.toFixed(4), trend: percent.toFixed(2), time: new Date().toLocaleTimeString() };
    fs.writeFileSync('widget_data.json', JSON.stringify(data));
}

// 3. Ana Döngü
async function startTerminal() {
    const market = await fetchMarketData();
    const now = Date.now();

    COIN_LIST.forEach(coin => {
        const d = market[coin];
        if (!d) return;

        const isNotified = lastSignalTime[coin] && (now - lastSignalTime[coin] < 1800000);
        if (Math.abs(d.c) > 2.5 && !isNotified) {
            const type = d.c < -2.5 ? "AL" : "SAT";
            lastSignalTime[coin] = now;
            sendTelegramAlert(`🎯 SİNYAL: ${coin} | ${type} | Fiyat: ${d.p}`);
            updateWidgetFile(coin, type, d.p, d.c);
        }
    });

    setTimeout(startTerminal, 60000);
}

startTerminal();
