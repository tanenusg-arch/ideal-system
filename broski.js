// ===================================================================
// COMPLETE INDEX.JS – All custom emoji IDs integrated
// ===================================================================
const { Telegraf, webhookCallback } = require("telegraf");
const express = require("express");
const axios = require("axios");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const { initializeApp, getApps, getApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  increment,
  limit,
  orderBy,
  runTransaction,
  getCountFromServer,
} = require("firebase/firestore");
require("dotenv").config();

// --------------------------------------------
// Hardcoded Firebase config
// --------------------------------------------
const FIREBASE_CONFIG = {
  projectId: "calcium-medium-1zp2g",
  appId: "1:374499579980:web:80f5c836132daf07fd7ce9",
  apiKey: "AIzaSyBLNq9vnIB_K5YJhWnaGiSy6KXOzXto_mk",
  authDomain: "calcium-medium-1zp2g.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-zipcommand-dcf7d63e-5a0c-4d64-a816-171a8e31d0cc",
  storageBucket: "calcium-medium-1zp2g.firebasestorage.app",
  messagingSenderId: "374499579980",
  measurementId: "",
  oAuthClientId: "374499579980-inme5kn6dd31f4r8cfe9nir7m5et8qej.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const firebaseApp = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
const _db = getFirestore(firebaseApp, FIREBASE_CONFIG.firestoreDatabaseId || '(default)');

// --------------------------------------------
// Logger
// --------------------------------------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} - ${level.toUpperCase()} - ${message}`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "bot_debug.log" }),
  ],
});

// --------------------------------------------
// Constants
// --------------------------------------------
const BOT_TOKEN = "8755046352:AAGhonFRoGmEMv0H0RAzFv3OuHR_QVSd3PI";
const G2BULK_API_KEY =
  "c84e5dbc9994c8fe5799f9d6c464a50ae23623107fcda104755d5eb38b03f66f";
const G2BULK_BASE_URL = "https://api.g2bulk.com/v1";

const QAMIFY_API_KEY = "qamify_d9d52f9dc8b0f38b74a08319b4f48e947d05493a263937f6";
const QAMIFY_BASE_URL = "https://api.qamify.site/v1";
const GEMINI_PRODUCT_ID = 10;
const CAPCUT_PRODUCT_ID = 19;
const QAMIFY_EXTRA_PRODUCTS = {
  netflix: { label: "Netflix", product_id: "5936178658916964051", emoji_key: "NETFLIX", aliases: ["netflix"] },
  nordvpn: { label: "NordVPN", product_id: null, emoji_key: "NORDVPN", aliases: ["nordvpn", "nord vpn"] },
  notion: { label: "Notion", product_id: "6298811268933367054", emoji_key: "NOTION", aliases: ["notion"] },
  amazon_prime: { label: "Amazon Prime", product_id: "6084483883942811660", emoji_key: "AMAZON_PRIME", aliases: ["amazon prime", "prime video"] },
  leonardo_ai: { label: "Leonardo AI", product_id: "6133975818591805751", emoji_key: "LEONARDO_AI", aliases: ["leonardo ai video", "leonardo ai", "leonardo"] },
  grok: { label: "Grok", product_id: null, emoji_key: "GROK", aliases: ["grok", "grok ai", "xai grok", "x.ai grok"] },
};
const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // Automatically delete unpaid pending orders after 10 minutes
const PAYMENT_MAX_AGE_MS = 15 * 60 * 1000; // Payments older than 15 minutes are rejected

const ADMIN_USERNAME = "@yab3021";
const ADMIN_CHAT_ID = [8453713398, 7303627375];
const UPDATES_CHANNEL = "";
// Public links shown by the main-menu navigation buttons. Replace these placeholders.
const BOT_LOGS_LINK = "https://t.me/yabtopupp_group";
const CHANNEL_LINK = "https://t.me/YABTOPUPP_SERVICE";
const TELEBIRR_PHONE = "0973669620"; // updated
const MIN_DEPOSIT_BIRR = 50;
const VERIFY_ET_BASE_URL = "https://verify.et";
const VERIFY_ET_API_KEY = "VERIFY_BANK_ET_VI9elgQb-qJ6M5jhRLUX68URtG6KDzrAG7cVnJ8eMU9ah6Yhhoi3iH4mgjMifhhd";
const EXPECTED_RECEIVER_NAME = "Yabsira Yosef Mulu"; // updated
const CACHE_TTL = 600;
const PROOF_CHANNEL_ID = -1004316159848;
const REPORT_CHANNEL_ID = PROOF_CHANNEL_ID;
const EXCHANGE_RATE = 193.0;

// Helper to normalise a name: uppercase, trim, collapse spaces
function normaliseName(str) {
  return (str || "").toUpperCase().trim().replace(/\s+/g, " ");
}

// ----- Custom emoji IDs (your provided list) -----
const CUSTOM_EMOJIS = {
  PROFILE: "5258011929993026890",
  USER: "5258011929993026890",              // user label uses the existing profile custom emoji
  WALLET: "5447453226498552490",
  ADMIN: "5260730055880876557",
  CONFIRM: "5834516100120842812",
  CANCEL: "5260342697075416641",
  SUCCESS: "5834516100120842812", // same as confirm
  GEMINI: "5841561302480199095",
  NETFLIX: "5936178658916964051",
  NORDVPN: "6339277750716605871",
  NOTION: "6298811268933367054",
  AMAZON_PRIME: "6084483883942811660",
  LEONARDO_AI: "6133975818591805751",
  GROK: "6152102186898694797",
  STARS: "6028338546736107668",
  DEPOSIT: "5258514780469075716",
  SUPPORT: "5258337316715373336",
  SHOP: "5447319442562251569",
  PAY: "5348191451341668809",
  ORDERS: "5447421246172069841",
  WARNING: "5447381715293074599",
  BACK: "5445365692004071819",
  PREMIUM: "5875180111744995604",
  REFERRAL: "5260450573768990626",
  CBE: "5961054379350955385",             // CBE custom emoji
  BOA: "5796558527778527912",             // Bank of Abyssinia (fallback bank emoji)
  TELEBIRR: "5960632377339285724",
  TIKTOK: "5474131686440584294",
  REDEEM: "5418010521309815154",
  TELEGRAM: "5866355487255039002",         // replaced
  CAPCUT: "5474521476197536994",           // new
  FREE_FIRE: "5872968405451020096",        // new
  GAME: "5884479287171485878",              // product label custom emoji
  PENDING_PAYMENT: "5386367538735104399",  // new
  STATUS: "5947131761824632502",           // new
  GEMINI_DESC: "5278711610775457808",      // new
  FF_DIAMONDS: "5427168083074628963",      // Free Fire Diamonds custom emoji
  MONEY: "5224641412787630992",            // new
  CALENDAR: "5039534051816375152",         // new
  FF_LEVELUP: "5445355530111437729",       // new
  FF_MEMBERSHIP: "6048398234441750217",    // new
  BOT_LOGS: "5251662946127336150",
  CHANNEL: "5458603970916270333",
  START_HAND: "5472055112702629499",
  START_CART: "5447319442562251569",
  START_DOWN: "5231102735817918643",
};

// Base emoji characters (used as fallback in text)
const EMOJI_BASE = {
  PROFILE: "👤",
  WALLET: "👛",
  ADMIN: "⚙️",
  CONFIRM: "✅",
  CANCEL: "❌",
  SUCCESS: "✅",
  GEMINI: "🤖",
  NETFLIX: "📺",
  NORDVPN: "🛡️",
  NOTION: "📝",
  AMAZON_PRIME: "▶️",
  LEONARDO_AI: "🎨",
  GROK: "🤖",
  STARS: "⭐",
  DEPOSIT: "📥",
  SUPPORT: "🎧",
  SHOP: "🛍️",
  PAY: "💳",
  ORDERS: "🛒",
  WARNING: "⚠️",
  BACK: "🔙",
  PREMIUM: "💎",
  REFERRAL: "🤝",
  CBE: "🏦",
  BOA: "🏦",
  TELEBIRR: "💸",
  TIKTOK: "🎵",
  REDEEM: "🎁",
  TELEGRAM: "📱",
  GAME: "🎮",
  MONEY: "💰",           // new
  USER: "👤",
  CALENDAR: "📅",        // new
  HOME: "🏠",
  START_HAND: "👋",
  START_CART: "🛒",
  START_DOWN: "👇",
  STAR: "⭐",
  SUPPORT: "🎧",
  WALLET: "👛",
  SUCCESS: "✅",
  FAIL: "❌",
  INFO: "ℹ️",
  WARNING: "⚠️",
  USER: "👤",
  CALENDAR: "📅",
  MONEY: "💰",
  BAN: "🚫",
  UNBAN: "✅",
  TOGGLE: "🔄",
  SETTINGS: "⚙️",
  MEGAPHONE: "📢",
  ADD: "➕",
  LIST: "📋",
  DELETE: "🗑️",
  CLOCK: "⏱️",
  MAIL: "✉️",
  SEARCH: "🔍",
  VIDEO: "🎬",
  CAPCUT: "🎬",          // new
  FREE_FIRE: "🔥",       // new
  PENDING_PAYMENT: "⏳", // new
  STATUS: "📊",          // new
  GEMINI_DESC: "📝",     // new
  FF_DIAMONDS: "💎",     // new
  FF_LEVELUP: "⬆️",      // new
  FF_MEMBERSHIP: "👑",   // new
  BOT_LOGS: "📋",
  CHANNEL: "📢",
};

// Helper to get base emoji for a given key
function getBaseEmoji(key) {
  // Return the explicit placeholder instead of a Unicode fallback. This is
  // important when two custom emojis share the same Unicode fallback (for
  // The placeholder keeps
  // the exact custom emoji ID tied to its intended key.
  return getCustomEmojiId(key) ? `{emoji:${key}}` : "";
}

// Helper to get custom emoji ID for a given key (returns null if not mapped)
function getCustomEmojiId(key) {
  return CUSTOM_EMOJIS[key] || null;
}

// Convert emoji placeholders/known Unicode emoji in keyboard buttons to
// Telegram's native icon_custom_emoji_id field. This makes the emoji
// appear as a Premium/custom emoji on the button itself (Bot API 9.4+).
function processKeyboardCustomEmojis(markup) {
  if (!markup || typeof markup !== "object") return markup;

  const known = Object.entries(EMOJI_BASE)
    .filter(([key, emoji]) => getCustomEmojiId(key) && emoji)
    .sort((a, b) => b[1].length - a[1].length);

  const processButton = (button) => {
    if (!button || typeof button !== "object") return button;
    const out = { ...button };
    let text = String(out.text ?? "");
    let customId = out.icon_custom_emoji_id || null;

    text = text.replace(/\{emoji:([A-Z_]+)\}/g, (full, key) => {
      if (!customId) customId = getCustomEmojiId(key) || null;
      return "";
    });

    // Match each literal Unicode emoji to its own custom ID first.
    for (const [key, emoji] of known) {
      if (text.includes(emoji)) {
        if (!customId) customId = getCustomEmojiId(key);
        text = text.split(emoji).join("");
      }
    }

    // Remove any remaining unmapped normal emoji. Never display it.
    text = text.replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/gu, "");
    text = text.replace(/^[\s]+|[\s]+$/g, "");
    out.text = text;
    // Consistent button colors: wallet/confirm green, cancel/back red;
    // product/service buttons use Telegram's blue primary style.
    const label = text.trim().toLowerCase();
    const cb = String(out.callback_data || "");
    if (cb.startsWith("svc_") || cb.startsWith("shop_") || cb.startsWith("pkg_") ||
        cb.startsWith("ff_sub:") || cb.endsWith("_buy")) {
      out.style = "primary";
    }
    if (label === "wallet" || label.startsWith("wallet ") || out.callback_data === "menu_wallet") {
      out.style = "success";
    } else if (label.includes("cancel") || label === "back" || label.startsWith("back ")) {
      out.style = "danger";
    } else if (label.includes("confirm")) {
      out.style = "success";
    }
    if (customId) out.icon_custom_emoji_id = String(customId);
    return out;
  };

  const result = { ...markup };
  if (Array.isArray(result.inline_keyboard)) {
    result.inline_keyboard = result.inline_keyboard.map(row =>
      Array.isArray(row) ? row.map(processButton) : row
    );
  }
  if (Array.isArray(result.keyboard)) {
    result.keyboard = result.keyboard.map(row =>
      Array.isArray(row) ? row.map(processButton) : row
    );
  }
  return result;
}

// We'll use a function to wrap emoji text with custom emoji entities.
// In the send functions, we'll parse the text and add entities.

// --------------------------------------------
// Fixed selling prices (ETB)
// Firestore overrides take precedence over these defaults.
// --------------------------------------------
const FIXED_STARS_PRICES = {
  50: 250, 100: 400, 250: 900, 350: 1300, 500: 1700,
  750: 2550, 1000: 3500, 1500: 4800, 2500: 7900,
};
const FIXED_FF_DIAMOND_PRICES = {
  "110": 210, "231": 400, "583": 1000, "1188": 1900, "2420": 3850,
};
const FIXED_FF_LEVELUP_PRICES = {
  "Level 6": 80, "Level 10": 115, "Level 15": 120,
  "Level 20": 125, "Level 25": 130, "Level 30": 175,
};
const FIXED_FF_MEMBERSHIP_PRICES = {
  "Weekly": 550, "Monthly": 2400, "Booyah Pass": 750,
};
function getFixedStarsPrice(name) {
  const parsed = parse_telegram_name(name);
  return parsed && parsed[0] === "stars" ? (FIXED_STARS_PRICES[parsed[1]] ?? null) : null;
}
function getFixedFFPrice(category, cleanedName) {
  const n = String(cleanedName || "").trim();
  if (category === "diamonds") return FIXED_FF_DIAMOND_PRICES[n] ?? null;
  if (category === "levelup") {
    const m = n.match(/level\s*(\d+)/i);
    return m ? (FIXED_FF_LEVELUP_PRICES[`Level ${m[1]}`] ?? null) : null;
  }
  if (category === "membership") {
    const l = n.toLowerCase();
    if (l === "weekly") return FIXED_FF_MEMBERSHIP_PRICES.Weekly;
    if (l === "monthly") return FIXED_FF_MEMBERSHIP_PRICES.Monthly;
    if (l.includes("booyah")) return FIXED_FF_MEMBERSHIP_PRICES["Booyah Pass"];
  }
  return null;
}

// --------------------------------------------
// Payment Methods (UPDATED)
// --------------------------------------------
const PAYMENT_METHODS = {
  telebirr: {
    label: "Telebirr",
    account: "0973669620",           // updated
    name: "Yabsira Yosef Mulu",      // updated
    verify: true,
  },
  cbe: {
    label: "CBE",
    account: "1000773797734",
    name: "Yabsira Yosef Mulu",
    verify: true,
  },
  boa: {
    label: "Bank of Abyssinia",
    account: "205529772",
    name: "Yabsira Yosef Mulu",
    verify: true,
  },
  wallet: {
    label: "Wallet",
    verify: false,
  }
};

const DEPOSIT_METHODS = ['telebirr', 'cbe', 'boa'];
const ORDER_PAYMENT_METHODS = ['telebirr', 'cbe', 'boa', 'wallet'];

// Virtual 1‑month Premium
const PREMIUM_1MONTH = {
  id: 'premium_1month',
  name: '1 Month Premium',
  display_name: '1 Month Premium',
  price: 800,
  is_virtual: true,
};

// Fixed Telegram Premium selling prices.
// 1 month is manual/admin; 3, 6 and 12 months are delivered automatically by G2Bulk.
const TELEGRAM_PREMIUM_PRICES = {
  1: 800,
  3: 2900,
  6: 3900,
  12: 6300,
};

// --------------------------------------------
// Helper functions (unchanged)
// --------------------------------------------
function api_price_to_birr(api_price, markup_amount = 0.0, is_telegram = false) {
  return is_telegram ? api_price * 1.0 + markup_amount : api_price * EXCHANGE_RATE + markup_amount;
}

function parse_amount(s) {
  if (!s || typeof s !== "string") return null;
  const clean = s.trim().toLowerCase().replace(/,/g, "");
  if (clean.endsWith("k")) {
    const val = parseFloat(clean.slice(0, -1));
    return isNaN(val) ? null : Math.floor(val * 1000);
  }
  if (clean.endsWith("m")) {
    const val = parseFloat(clean.slice(0, -1));
    return isNaN(val) ? null : Math.floor(val * 1000000);
  }
  if (clean.endsWith("b")) {
    const val = parseFloat(clean.slice(0, -1));
    return isNaN(val) ? null : Math.floor(val * 1000000000);
  }
  const val = parseFloat(clean);
  return isNaN(val) ? null : Math.floor(val);
}

function parse_telegram_name(name) {
  if (!name || typeof name !== "string") return null;
  const s = name.toLowerCase().trim();
  const starsMatch = s.match(/(\S+)\s*stars?/);
  if (starsMatch) {
    const amount = parse_amount(starsMatch[1]);
    if (amount !== null) return ["stars", amount];
  }
  const premiumMatch = s.match(/(\S+)\s*(?:months?|month|year|yr)\s*premium/);
  if (premiumMatch) {
    let amount = parse_amount(premiumMatch[1]);
    if (amount !== null) {
      if (s.includes("year") || s.includes("yr")) amount *= 12;
      return ["premium", amount];
    }
  }
  return null;
}

function format_telegram_display(name, birr_price) {
  const parsed = parse_telegram_name(name);
  if (parsed) {
    const [type, amount] = parsed;
    if (type === "stars") return `${amount} stars - ${Math.floor(birr_price)}ETB`;
    if (type === "premium") return `${amount} Months - ${Math.floor(birr_price)}ETB`;
  }
  return `${name} - ${Math.floor(birr_price)}ETB`;
}

function get_clean_telegram_name(name) {
  const parsed = parse_telegram_name(name);
  if (parsed) {
    const [type, amount] = parsed;
    if (type === "stars") return `${amount} stars`;
    if (type === "premium") return `${amount} Months`;
  }
  return name;
}

function clean_freefire_package_name(rawName) {
  if (!rawName) return 'Package';
  let cleaned = String(rawName);
  cleaned = cleaned.replace(/\s*[-–]\s*[\d.]+(\s*\$)?/gi, '');
  cleaned = cleaned.replace(/\s*\([\d.]+\s*\$\)/gi, '');
  cleaned = cleaned.trim();

  const lower = cleaned.toLowerCase();
  if (lower.includes('diamond') || /^\d+[km]?$/i.test(cleaned)) {
    const numMatch = cleaned.match(/([\d.]+\s*[km]?)/i);
    if (numMatch) return numMatch[1].replace(/\s+/g, '').toUpperCase();
    return cleaned.replace(/\s*diamonds?/ig, '').trim();
  }
  const levelMatch = lower.match(/level\s*(\d+)/);
  if (levelMatch) return `Level ${levelMatch[1]}`;
  if (lower.includes('weekly membership')) return 'Weekly';
  if (lower.includes('monthly membership')) return 'Monthly';
  if (lower.includes('membership')) {
    const durationMatch = lower.match(/(\d+)\s*(week|month|year|day)/);
    if (durationMatch) {
      const num = durationMatch[1];
      const unit = durationMatch[2];
      let displayUnit = unit.charAt(0).toUpperCase() + unit.slice(1);
      if (parseInt(num) > 1) displayUnit += 's';
      return `${num} ${displayUnit}`;
    }
    return 'Membership';
  }
  const anyNum = cleaned.match(/([\d.]+\s*[km]?)/i);
  if (anyNum && !lower.includes('level') && !lower.includes('pass') && !lower.includes('booyah')) {
    return anyNum[1].replace(/\s+/g, '').toUpperCase();
  }
  return cleaned;
}

function numeric_package_value(name) {
  if (!name) return Number.POSITIVE_INFINITY;
  const match = String(name).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kmb])?/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const value = parseFloat(match[1]);
  const suffix = (match[2] || '').toLowerCase();
  return value * (suffix === 'k' ? 1000 : suffix === 'm' ? 1000000 : suffix === 'b' ? 1000000000 : 1);
}

function sort_telegram_packages(packages) {
  return [...packages].sort((a, b) => {
    const aName = a.display_name || a.name || a.title || a.catalogue_name || '';
    const bName = b.display_name || b.name || b.title || b.catalogue_name || '';
    const av = numeric_package_value(aName);
    const bv = numeric_package_value(bName);
    if (av !== bv) return av - bv;
    const ap = parseFloat(a._override_price ?? a.unit_price ?? a.price ?? a.amount ?? 0);
    const bp = parseFloat(b._override_price ?? b.unit_price ?? b.price ?? b.amount ?? 0);
    return ap - bp;
  });
}

function format_deposit_id(dep_id) {
  const num = parseInt(dep_id, 10);
  return `EX${num + 100}`;
}

function format_withdrawal_id(wth_id) {
  const str = String(wth_id);
  if (str.startsWith("WTH-")) return str;
  if (/^\d+$/.test(str)) return `EX${parseInt(str, 10) + 200}`;
  return str;
}

function parse_formatted_id(formatted, type) {
  if (!formatted) return null;
  const match = formatted.trim().toUpperCase().match(/^EX(\d+)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (type === "deposit") return String(num - 100);
  if (type === "withdrawal") return String(num - 200);
  if (num >= 101 && num <= 199) return String(num - 100);
  if (num >= 201 && num <= 299) return String(num - 200);
  return null;
}

// --------------------------------------------
// Inline keyboards (updated with custom emoji base characters)
// --------------------------------------------
function get_main_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('WALLET')} Wallet`.trim(), callback_data: "menu_wallet" },
        { text: `${getBaseEmoji('SHOP')} Shop`.trim(), callback_data: "menu_shop", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('PROFILE')} My Profile`.trim(), callback_data: "menu_profile" },
        { text: `${getBaseEmoji('ORDERS')} My Orders`.trim(), callback_data: "menu_orders" },
      ],
      [
        { text: `${getBaseEmoji('SUPPORT')} Support`.trim(), callback_data: "menu_support", style: "primary" },
        { text: `${getBaseEmoji('PENDING_PAYMENT')} Pending Payment`.trim(), callback_data: "menu_pending_payments", style: "primary" },
      ],
      [
        { text: "Bot Logs", url: BOT_LOGS_LINK, icon_custom_emoji_id: "5251662946127336150" },
      ],
      [
        { text: "Channel", url: CHANNEL_LINK, style: "primary", icon_custom_emoji_id: "5458603970916270333" },
      ],
    ],
  };
}

function get_profile_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('REFERRAL')} Referral`, callback_data: "profile_referral", style: "primary" },
        { text: `${getBaseEmoji('REDEEM')} Redeem`, callback_data: "profile_redeem", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" },
      ],
    ],
  };
}

function get_shop_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('STARS')} Telegram Stars`, callback_data: "svc_telegram_stars", style: "primary" },
        { text: `${getBaseEmoji('PREMIUM')} Telegram Premium`, callback_data: "svc_telegram_premium", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('TIKTOK')} TikTok Coin`, callback_data: "shop_tiktok", style: "primary" },
        { text: `${getBaseEmoji('GEMINI')} Gemini Pro`, callback_data: "shop_gemini", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('CAPCUT')} CapCut`, callback_data: "shop_capcut", style: "primary" },
        { text: `${getBaseEmoji('FREE_FIRE')} Free Fire`, callback_data: "shop_freefire", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('NETFLIX')} Netflix`, callback_data: "shop_qamify:netflix", style: "primary" },
        { text: `${getBaseEmoji('AMAZON_PRIME')} Amazon Prime`, callback_data: "shop_qamify:amazon_prime", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('LEONARDO_AI')} Leonardo AI`, callback_data: "shop_qamify:leonardo_ai", style: "primary" },
        { text: `${getBaseEmoji('NORDVPN')} NordVPN`, callback_data: "shop_qamify:nordvpn", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('NOTION')} Notion`, callback_data: "shop_qamify:notion", style: "primary" },
        { text: `${getBaseEmoji('GROK')} Grok`, callback_data: "shop_qamify:grok", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" },
      ],
    ],
  };
}

function get_telegram_shop_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('STARS')} Telegram Stars`, callback_data: "svc_telegram_stars", style: "primary" },
        { text: `${getBaseEmoji('PREMIUM')} Telegram Premium`, callback_data: "svc_telegram_premium", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back to Shop`, callback_data: "shop_back" },
      ],
    ],
  };
}

function get_wallet_keyboard() {
  const depositButtons = DEPOSIT_METHODS.map(m => ({
    text: `${getBaseEmoji(m.toUpperCase())} ${PAYMENT_METHODS[m].label}`,
    callback_data: `dep_method:${m}`,
  }));
  const rows = [];
  for (let i = 0; i < depositButtons.length; i += 2) {
    rows.push(depositButtons.slice(i, i + 2));
  }
  rows.push([{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]);
  return { inline_keyboard: rows };
}

function get_order_payment_keyboard() {
  const buttons = ORDER_PAYMENT_METHODS.map(m => ({
    text: `${getBaseEmoji(m.toUpperCase())} ${PAYMENT_METHODS[m].label}`,
    callback_data: `pay_method:${m}`,
  }));
  const rows = [
    [
      buttons.find(b => b.callback_data === 'pay_method:telebirr'),
      buttons.find(b => b.callback_data === 'pay_method:cbe'),
    ],
    [buttons.find(b => b.callback_data === 'pay_method:boa')],
    [buttons.find(b => b.callback_data === 'pay_method:wallet')],
  ];
  rows.push([{ text: `${getBaseEmoji('CANCEL')} Cancel`, callback_data: "order_cancel", style: "danger" }]);
  return { inline_keyboard: rows };
}

function get_deposit_keyboard() {
  const buttons = DEPOSIT_METHODS.map(m => ({
    text: `${getBaseEmoji(m.toUpperCase())} ${PAYMENT_METHODS[m].label}`,
    callback_data: `dep_method:${m}`,
  }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  rows.push([{ text: `${getBaseEmoji('CANCEL')} Cancel`, callback_data: "cancel_action", style: "danger" }]);
  return { inline_keyboard: rows };
}

function get_confirmation_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('CONFIRM')} Confirm Order`, callback_data: "order_confirm", style: "success" },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back`, callback_data: "order_back", style: "danger" },
      ],
    ],
  };
}

function get_support_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Chat with Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main", style: "danger" },
      ],
    ],
  };
}

function get_freefire_sub_keyboard() {
  return {
    inline_keyboard: [
      [{ text: `${getBaseEmoji('FF_DIAMONDS')} Diamonds`, callback_data: "ff_sub:diamonds", style: "primary" }],
      [{ text: `${getBaseEmoji('FF_MEMBERSHIP')} Membership`, callback_data: "ff_sub:membership", style: "primary" }],
      [{ text: `${getBaseEmoji('FF_LEVELUP')} Level Up Pass`, callback_data: "ff_sub:levelup", style: "primary" }],
      [{ text: `${getBaseEmoji('BACK')} Back to Shop`, callback_data: "shop_back" }],
    ],
  };
}

// Admin keyboards (unchanged, will also inherit custom emojis)
function get_admin_keyboard() {
  return {
    inline_keyboard: [
      [{ text: "📊 Dashboard", callback_data: "admin_dashboard" }],
      [
        { text: "📥 Deposits", callback_data: "admin_deposits" },
        { text: "📤 Withdrawals", callback_data: "admin_withdrawals" },
      ],
      [
        { text: "🎟️ Promo Codes", callback_data: "admin_promo" },
        { text: "👥 Users", callback_data: "admin_user_manage" },
      ],
      [{ text: "Verified Transactions", callback_data: "admin_verified_txns" }],
      [{ text: "Settings / Markup", callback_data: "admin_settings" }],
      [{ text: "Close", callback_data: "admin_close" }],
    ],
  };
}

function get_admin_promo_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Create Code", callback_data: "admin_promo_create" },
        { text: "📋 List Codes", callback_data: "admin_promo_list" },
      ],
      [{ text: "Delete Code", callback_data: "admin_promo_delete" }],
      [{ text: "🔙 Back", callback_data: "admin_back" }],
    ],
  };
}

function get_admin_settings_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Game Prices", callback_data: "admin_game_products" },
        { text: "Telegram Prices", callback_data: "admin_set_product_price" },
      ],
      [
        { text: "Set Stars Markup", callback_data: "admin_stars_markup" },
        { text: "Set Premium Markup", callback_data: "admin_premium_markup" },
      ],
      [
        { text: "Toggle Maintenance", callback_data: "admin_toggle_maintenance" },
        { text: "Toggle Reports", callback_data: "admin_toggle_reports" },
      ],
      [{ text: "🔙 Back", callback_data: "admin_back" }],
    ],
  };
}

function get_user_manage_keyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Broadcast", callback_data: "admin_broadcast" },
        { text: "Referral Lookup", callback_data: "admin_referral" },
      ],
      [
        { text: "Ban User", callback_data: "admin_ban" },
        { text: "Unban User", callback_data: "admin_unban" },
      ],
      [
        { text: "Set Balance", callback_data: "admin_set_balance" },
        { text: "Search by ID", callback_data: "admin_search_by_id" },
      ],
      [{ text: "🔙 Back", callback_data: "admin_back" }],
    ],
  };
}

function get_search_by_id_keyboard() {
  return {
    inline_keyboard: [
      [{ text: "Search Order", callback_data: "admin_search_id:order" }],
      [{ text: "Search Deposit", callback_data: "admin_search_id:deposit" }],
      [
        { text: "Search Withdrawal", callback_data: "admin_search_id:withdrawal" },
      ],
      [{ text: "🔙 Back", callback_data: "admin_user_manage" }],
    ],
  };
}

// --------------------------------------------
// State Constants
// --------------------------------------------
const STATE_NONE = "none";
const STATE_SELECT_PKG = "select_pkg";
const STATE_ENTER_UID = "enter_uid";
const STATE_CONFIRM = "confirm";
const STATE_PAYMENT_METHOD = "pay_method";
const STATE_PAYMENT_TXN_ID = "pay_txn_id";
const STATE_PAYMENT_CBE_SUFFIX = "pay_cbe_suffix";
const STATE_PAYMENT_BOA_SUFFIX = "pay_boa_suffix";
const STATE_DEPOSIT_AMOUNT = "dep_amount";
const STATE_DEPOSIT_TRANSACTION_ID = "dep_txn_id";
const STATE_DEPOSIT_CBE_SUFFIX = "dep_cbe_suffix";
const STATE_DEPOSIT_BOA_SUFFIX = "dep_boa_suffix";
const STATE_PROFILE_REDEEM = "profile_redeem";
const STATE_ADMIN_MAIN = "admin_main";
const STATE_ADMIN_CREATE_CODE = "admin_create_code";
const STATE_ADMIN_DELETE_CODE = "admin_delete_code";
const STATE_ADMIN_BROADCAST = "admin_broadcast";
const STATE_ADMIN_REFERRAL_INPUT = "admin_refer_input";
const STATE_ADMIN_BAN = "admin_ban";
const STATE_ADMIN_UNBAN = "admin_unban";
const STATE_ADMIN_SETBALANCE = "admin_setbalance";
const STATE_ADMIN_SEARCH_BY_ID = "admin_search_by_id";
const STATE_ADMIN_GAME_MARKUP = "admin_game_markup";
const STATE_ADMIN_GAME_PRICE_INPUT = "admin_game_price_input";
const STATE_ADMIN_GLOBAL_MARKUP = "admin_global_markup";
const STATE_ADMIN_SET_PRICE_INPUT = "admin_set_price_input";
const STATE_ADMIN_STARS_MARKUP = "admin_stars_markup";
const STATE_ADMIN_PREMIUM_MARKUP = "admin_premium_markup";
const STATE_ADMIN_GEMINI_PRICE = "admin_gemini_price";
const STATE_ADMIN_CAPCUT_PRICE = "admin_capcut_price";
const STATE_ADMIN_1MONTH_PRICE = "admin_1month_price";
const STATE_ADMIN_QAMIFY_PRICE_INPUT = "admin_qamify_price_input";
const STATE_SHOP = "shop";

const REFERRAL_REWARD = 0.5;

let userSessions = {};
function getUserSession(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = { state: STATE_NONE, data: {} };
  }
  return userSessions[userId];
}
function clearUserSession(userId) {
  if (userSessions[userId]) {
    userSessions[userId].state = STATE_NONE;
    userSessions[userId].data = {};
  }
}

let verify_attempts = {};
let pending_decline = {};

const IMG_TRANSACTION_ID =
  "https://img-mom.bitibiti.workers.dev/img/AgACAgQAAxkBAAIz_GqReSeH5xb_VFJkDyy89TWDKECCAAKfEGsbTqCJUJLAtuR8JLU8AQADAgADeQADPQQ";

// --------------------------------------------
// G2Bulk API Client
// --------------------------------------------
class G2BulkAPIClient {
  constructor(base_url, api_key, cache_ttl) {
    this.base_url = base_url;
    this.api_key = api_key;
    this.cache_ttl = cache_ttl;
    this._cache = {};
  }

  async _request(endpoint, method = "GET", data = null) {
    const url = `${this.base_url}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.api_key}`,
      "X-API-Key": this.api_key,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    try {
      const response = await axios({ method, url, headers, data, timeout: 30000 });
      return response.data;
    } catch (e) {
      logger.error(`API Error on ${endpoint}: ${e.message}`);
      if (e.response && e.response.data) return e.response.data;
      return { success: false, message: e.message };
    }
  }

  async get_games() {
    const now = Date.now();
    if (this._cache["games"] && (now - this._cache["games"].ts) / 1000 < this.cache_ttl) {
      return this._cache["games"].data;
    }
    const data = await this._request("/games");
    if (data && data.success) {
      this._cache["games"] = { ts: now, data: data };
    }
    return data;
  }

  async get_category_products(category_id) {
    const cache_key = `cat_prod_${category_id}`;
    const now = Date.now();
    if (this._cache[cache_key] && (now - this._cache[cache_key].ts) / 1000 < this.cache_ttl) {
      return this._cache[cache_key].data;
    }
    const data = await this._request(`/category/${category_id}`);
    if (data && data.success) {
      this._cache[cache_key] = { ts: now, data: data };
    }
    return data;
  }

  async get_game_catalogue(game_code) {
    const cache_key = `cat_${game_code}`;
    const now = Date.now();
    if (this._cache[cache_key] && (now - this._cache[cache_key].ts) / 1000 < this.cache_ttl) {
      return this._cache[cache_key].data;
    }
    const data = await this._request(`/games/${game_code}/catalogue`);
    if (data && data.success) {
      this._cache[cache_key] = { ts: now, data: data };
    }
    return data;
  }

  async check_player_id(game_code, player_id, server_id = null, charname = null) {
    const endpoint = `/games/checkPlayerId`;
    const payload = { game: game_code, user_id: String(player_id) };
    if (server_id) payload.server_id = String(server_id);
    if (charname) payload.charname = String(charname);
    logger.info(`Checking player ID: ${JSON.stringify(payload)}`);
    const res = await this._request(endpoint, "POST", payload);
    logger.info(`Player ID Check Result: ${JSON.stringify(res)}`);
    if (res && res.error === "Endpoint not found") return { success: true };
    return res;
  }

  async purchase_product(product_id, quantity = 1) {
    const payload = { quantity: quantity };
    return await this._request(`/products/${product_id}/purchase`, "POST", payload);
  }

  async place_order(game_code, package_id, player_id, server_id = null, user_ip = null) {
    let catalogue_name = package_id;
    const cat = await this.get_game_catalogue(game_code);
    if (cat && cat.catalogues) {
      const pkg = cat.catalogues.find(p => String(p.id || p.name) === String(package_id));
      if (pkg && pkg.name) catalogue_name = pkg.name;
    }
    const payload = { catalogue_name, player_id: String(player_id) };
    if (server_id) payload.server_id = String(server_id);
    if (user_ip) payload.user_ip = String(user_ip);
    return await this._request(`/games/${game_code}/order`, "POST", payload);
  }
}

// --------------------------------------------
// Qamify API Client
// --------------------------------------------
class QamifyAPIClient {
  constructor(base_url, api_key) {
    this.base_url = base_url;
    this.api_key = api_key;
  }

  async _request(endpoint, method = "GET", data = null, idempotency_key = null) {
    const url = `${this.base_url}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.api_key}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
    if (idempotency_key) {
      headers["Idempotency-Key"] = idempotency_key;
    }
    try {
      const response = await axios({ method, url, headers, data, timeout: 30000 });
      return response.data;
    } catch (e) {
      logger.error(`Qamify API Error: ${e.message}`);
      if (e.response && e.response.data) return e.response.data;
      return { ok: false, message: e.message };
    }
  }

  async get_product(product_id) {
    const response = await this._request(`/products/${product_id}`);
    // Qamify may wrap a product in data/product instead of returning it directly.
    if (response && typeof response === "object") {
      if (response.id !== undefined || response.product_id !== undefined) return response;
      if (response.product && typeof response.product === "object") return response.product;
      if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
        if (response.data.id !== undefined || response.data.product_id !== undefined) return response.data;
        if (response.data.product && typeof response.data.product === "object") return response.data.product;
      }
    }
    return response;
  }

  async get_products() {
    const response = await this._request("/products");
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.products)) return response.data.products;
    return [];
  }

  async find_product_by_aliases(aliases = []) {
    const wanted = aliases.map(x => String(x).toLowerCase().trim());
    const products = await this.get_products();
    return products.find(product => {
      const name = String(product?.name || product?.title || product?.product_name || "").toLowerCase().trim();
      return wanted.some(alias => name === alias || name.includes(alias));
    }) || null;
  }

  async place_order(product_id, quantity = 1, idempotency_key = null) {
    // Keep Qamify product IDs as strings. Some IDs are 18-20 digits and
    // converting them with parseInt/Number can silently change the ID.
    // Reuse the same key when retrying the same order so Qamify can
    // safely deduplicate the request.
    const key = idempotency_key || `order-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
    const payload = { product_id: String(product_id), qty: quantity };
    return await this._request("/orders", "POST", payload, key);
  }
}

// --------------------------------------------
// Verify payment (FIXED: robust parsing of top-level fields)
// --------------------------------------------
async function verify_payment(transaction_id, method = "telebirr", expected_amount = null, options = {}) {
  const bank = String(method || "").toLowerCase();
  if (!["telebirr", "cbe", "boa"].includes(bank)) {
    return { success: false, error: "Unsupported automatic verification method.", server_error: false };
  }
  if (!VERIFY_ET_API_KEY) {
    return { success: false, error: "VERIFY_ET_API_KEY is not configured.", server_error: true };
  }

  try {
    const paymentAccount = PAYMENT_METHODS[bank]?.account || "";
    let payload;
    if (bank === "cbe") {
      payload = {
        bank: "cbe",
        referenceNumber: transaction_id,
        accountSuffix: String(options.accountSuffix || options.cbeAccountSuffix || "").trim(),
        settlementAccount: paymentAccount || undefined,
      };
      if (!/^\d{8}$/.test(payload.accountSuffix)) {
        return { success: false, error: "CBE verification requires the last 8 digits of the account number.", server_error: false };
      }
    } else if (bank === "boa") {
      payload = {
        bank: "boa",
        referenceNumber: transaction_id,
        accountSuffix: String(options.accountSuffix || options.boaAccountSuffix || "").trim(),
        ...(paymentAccount ? { settlementAccount: paymentAccount } : {}),
      };
      if (!/^\d{5}$/.test(payload.accountSuffix)) {
        return { success: false, error: "Bank of Abyssinia verification requires the last 5 digits of the account number.", server_error: false };
      }
    } else {
      payload = {
        bank: "telebirr",
        transactionNumber: transaction_id,
        settlementAccount: paymentAccount,
      };
    }

    const idempotencyKey = `yabtopup-${bank}-${String(transaction_id).trim()}-${uuidv4()}`;
    const url = `${VERIFY_ET_BASE_URL}/api/verify?waitMs=5000`;

    const response = await axios.post(url, payload, {
      headers: {
        "x-api-key": VERIFY_ET_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    logger.info(`[VERIFY.ET] HTTP ${response.status} | bank=${bank} | reference=${transaction_id}`);
    logger.info(`[VERIFY.ET] Raw response | bank=${bank} | reference=${transaction_id} | body=${JSON.stringify(response.data)}`);

    const root = response.data || {};

    if (response.status >= 400) {
      const msg = root.message || root.error || `Payment verification service returned HTTP ${response.status}.`;
      return {
        success: false,
        error: String(msg),
        server_error: response.status >= 500 || response.status === 429 || response.status === 503,
      };
    }

    // 200 = completed immediately. Verify.ET returns transaction details in data[].
    let transaction = Array.isArray(root.data) ? root.data[0] : (
      root.data && typeof root.data === "object" ? root.data : null
    );

    // 202 = queued. Poll the status endpoint until it reaches a terminal state.
    if (response.status === 202 || root.verification?.processingStatus === "queued") {
      const requestId = root.requestId || root.verification?.requestId;
      if (!requestId) {
        return { success: false, error: "Payment verification is processing, but no request ID was returned. Please try again.", server_error: true };
      }

      let finalStatus = root.verification || {};
      for (let attempt = 0; attempt < 20; attempt++) {
        const wait = Number(root.links?.pollAfterMs || 1500);
        await new Promise(resolve => setTimeout(resolve, Math.max(500, Math.min(wait, 5000))));

        const statusResponse = await axios.get(
          `${VERIFY_ET_BASE_URL}/api/verify/${encodeURIComponent(requestId)}`,
          {
            headers: { "x-api-key": VERIFY_ET_API_KEY, "Accept": "application/json" },
            timeout: 15000,
            validateStatus: () => true,
          }
        );

        logger.info(`[VERIFY.ET] Poll ${attempt + 1}/20 | HTTP ${statusResponse.status} | requestId=${requestId} | body=${JSON.stringify(statusResponse.data)}`);

        if (statusResponse.status >= 400) {
          const msg = statusResponse.data?.message || statusResponse.data?.error || `Payment verification status returned HTTP ${statusResponse.status}.`;
          return { success: false, error: String(msg), server_error: statusResponse.status >= 500 || statusResponse.status === 429 || statusResponse.status === 503 };
        }

        const statusBody = statusResponse.data || {};
        finalStatus = statusBody.data || statusBody.verification || statusBody;
        const processingStatus = String(finalStatus.processingStatus || "").toLowerCase();
        const status = String(finalStatus.status || "").toLowerCase();

        if (processingStatus === "completed" || processingStatus === "failed" || ["success", "failed", "not_found"].includes(status)) {
          // Some Verify.ET deployments include the completed transaction in data.
          if (Array.isArray(statusBody.data)) transaction = statusBody.data[0];
          else if (statusBody.data?.amount != null || statusBody.data?.receiverName || statusBody.data?.timestamp) transaction = statusBody.data;
          break;
        }
      }

      const processingStatus = String(finalStatus.processingStatus || "").toLowerCase();
      const status = String(finalStatus.status || "").toLowerCase();
      if (processingStatus !== "completed" && !["success", "failed", "not_found"].includes(status)) {
        return { success: false, error: "Verification did not finish before the polling timeout. Please try again.", server_error: false };
      }
      if (status !== "success" && finalStatus.verified !== true) {
        return { success: false, error: finalStatus.message || `Payment verification failed (${status || processingStatus}).`, server_error: false };
      }

      // The documented status endpoint may expose status only. Never approve
      // without transaction details needed for amount/receiver/age validation.
      if (!transaction) {
        return { success: false, error: "Payment verification completed, but transaction details were not returned. Please try again.", server_error: false };
      }
    }

    if (!transaction || transaction.verified === false || (transaction.status && String(transaction.status).toLowerCase() !== "success")) {
      return { success: false, error: transaction?.message || "Transaction was not verified successfully.", server_error: false };
    }

    // BOA returns receiver details inside bankSpecific.
    // CBE/Telebirr may return receiverName at the top level.
    const bankSpecific = transaction.bankSpecific && typeof transaction.bankSpecific === "object"
      ? transaction.bankSpecific
      : {};
    const receiverName = bank === "boa"
      ? (bankSpecific.receiverName ?? transaction.receiverName ?? transaction.receiver ?? "")
      : (transaction.receiverName ?? transaction.receiver ?? "");
    const receiverAccount = bank === "boa"
      ? (bankSpecific.receiverAccount ?? transaction.receiverAccount ?? "")
      : (transaction.receiverAccount ?? "");
    const amount = transaction.amount ?? transaction.settledAmount;
    const paymentDate = transaction.timestamp ?? transaction.paymentDate ?? transaction.date;
    const settlementMatch = transaction.settlementAccountMatch;

    logger.info(`[VERIFY.ET] Extracted | bank=${bank} | reference=${transaction_id} | timestamp=${JSON.stringify(paymentDate)} | receiver=${JSON.stringify(receiverName)} | amount=${JSON.stringify(amount)} | settlement=${JSON.stringify(settlementMatch)}`);

    if (typeof receiverName !== "string" || normaliseName(receiverName) !== normaliseName(EXPECTED_RECEIVER_NAME)) {
      return {
        success: false,
        error: `Invalid recipient. Expected "${EXPECTED_RECEIVER_NAME}", but got "${receiverName || "empty"}".`,
        server_error: false,
      };
    }

    // Verify.ET can return settlementAccountMatch when settlementAccount was supplied.
    // Require a positive match when the API provides the matching object.
    if (settlementMatch && settlementMatch.matched !== true) {
      return {
        success: false,
        error: `Payment was not received in the configured ${bank === "cbe" ? "CBE" : (bank === "boa" ? "Bank of Abyssinia" : "Telebirr")} settlement account.`,
        server_error: false,
      };
    }

    const parseProviderDate = (value) => {
      if (value == null || value === "") return NaN;
      if (typeof value === "number" && Number.isFinite(value)) return value < 100000000000 ? value * 1000 : value;
      const raw = String(value).trim();
      if (!raw) return NaN;
      if (/^\d{10,13}(?:\.\d+)?$/.test(raw)) {
        const n = Number(raw);
        return n < 100000000000 ? n * 1000 : n;
      }
      return Date.parse(raw);
    };

    const parsedPaymentDate = parseProviderDate(paymentDate);
    if (!Number.isFinite(parsedPaymentDate)) {
      return { success: false, error: "Payment timestamp was not returned. Please try again.", server_error: false };
    }

    const paymentAge = Date.now() - parsedPaymentDate;
    logger.info(`[VERIFY.ET] Payment age | bank=${bank} | reference=${transaction_id} | age_minutes=${(paymentAge / 60000).toFixed(2)}`);
    if (paymentAge > PAYMENT_MAX_AGE_MS || paymentAge < -2 * 60 * 1000) {
      return {
        success: false,
        error: "Payment is older than 15 minutes and has been rejected.",
        server_error: false,
        payment_too_old: paymentAge > PAYMENT_MAX_AGE_MS,
      };
    }

    const verifiedAmount = typeof amount === "string"
      ? Number((amount.match(/[0-9]+(?:\.[0-9]+)?/) || [""])[0])
      : Number(amount);

    if (!Number.isFinite(verifiedAmount)) {
      return { success: false, error: "Transaction amount not found or invalid.", server_error: false };
    }

    if (expected_amount !== null) {
      const expected = Number(expected_amount);
      if (!Number.isFinite(expected)) {
        return { success: false, error: "Expected payment amount is invalid.", server_error: false };
      }

      // Orders may overpay: surplus is credited to the wallet by place_order_flow.
      // Deposits remain exact-match by passing { exactAmount: true }.
      if (options.exactAmount ? verifiedAmount !== expected : verifiedAmount < expected) {
        return {
          success: false,
          error: options.exactAmount
            ? `Payment amount (${verifiedAmount} ETB) does not exactly match expected (${expected} ETB).`
            : `Payment amount (${verifiedAmount} ETB) is less than the order total (${expected} ETB).`,
          server_error: false,
        };
      }
    }

    return {
      success: true,
      data: {
        amount: verifiedAmount,
        receiver: receiverName,
        receiverAccount,
        paymentDate: new Date(parsedPaymentDate).toISOString(),
        sender: transaction.senderName || transaction.sender || null,
        referenceNumber: transaction.referenceNumber || transaction.reference || transaction_id,
        bank,
      },
    };
  } catch (e) {
    logger.error(`[VERIFY.ET] REQUEST FAILURE | bank=${bank} | reference=${transaction_id} | http_status=${e?.response?.status ?? "none"} | error=${e.message || "unknown"} | response_body=${JSON.stringify(e?.response?.data ?? null)}`);
    return {
      success: false,
      error: e.message || "Could not verify automatically.",
      server_error: !e.response || e.response.status >= 500,
    };
  }
}

// --------------------------------------------
// FirestoreDatabase class
// --------------------------------------------
class FirestoreDatabase {
  constructor() { this.db = _db; }

  async load_settings(appSettingsObj) {
    const d = await getDoc(doc(this.db, 'settings', 'appSettings'));
    if (d.exists()) Object.assign(appSettingsObj, d.data());
    else await setDoc(doc(this.db, 'settings', 'appSettings'), appSettingsObj);
  }

  async save_setting(key, value, appSettingsObj) {
    appSettingsObj[key] = value;
    await setDoc(doc(this.db, 'settings', 'appSettings'), { [key]: value }, { merge: true });
  }

  async register_user(userId, username, first_name, last_name) {
    const userRef = doc(this.db, 'users', String(userId));
    const d = await getDoc(userRef);
    if (!d.exists()) {
      await setDoc(userRef, {
        id: String(userId),
        username: username || '',
        first_name: first_name || '',
        last_name: last_name || '',
        balance: 0,
        referral_balance: 0,
        is_banned: 0,
        registered_at: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  async is_banned(userId) {
    const d = await getDoc(doc(this.db, 'users', String(userId)));
    return d.exists() && d.data().is_banned === 1;
  }

  async ban_user(userId) {
    await setDoc(doc(this.db, 'users', String(userId)), { is_banned: 1 }, { merge: true });
    return true;
  }

  async unban_user(userId) {
    await setDoc(doc(this.db, 'users', String(userId)), { is_banned: 0 }, { merge: true });
    return true;
  }

  async get_user_profile(userId) {
    const d = await getDoc(doc(this.db, 'users', String(userId)));
    return d.exists() ? d.data() : null;
  }

  async get_all_users() {
    const snap = await getDocs(collection(this.db, 'users'));
    return snap.docs.map(d => d.data());
  }

  async update_balance(userId, amount) {
    const ref = doc(this.db, 'users', String(userId));
    await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      if (d.exists()) {
        const newBal = (d.data().balance || 0) + amount;
        t.update(ref, { balance: newBal });
      }
    });
  }

  async set_balance(userId, amount) {
    await setDoc(doc(this.db, 'users', String(userId)), { balance: amount }, { merge: true });
  }

  async get_username(userId) {
    const d = await getDoc(doc(this.db, 'users', String(userId)));
    if (d.exists()) {
      const data = d.data();
      return data.username || data.first_name || String(userId);
    }
    return String(userId);
  }

  async create_promo_code(code, amount, max_uses) {
    await setDoc(doc(this.db, 'admin_codes', code), {
      code,
      reward_amount: amount,
      max_uses,
      uses: 0,
      created_at: new Date().toISOString()
    });
    return true;
  }

  async list_promo_codes() {
    const snap = await getDocs(collection(this.db, 'admin_codes'));
    return snap.docs.map(d => d.data());
  }

  async delete_promo_code(code) {
    await deleteDoc(doc(this.db, 'admin_codes', code));
    return true;
  }

  async use_promo_code(code, userId) {
    const ref = doc(this.db, 'admin_codes', code);
    const historyRef = doc(this.db, 'users', String(userId), 'promo_history', code);
    return await runTransaction(this.db, async (t) => {
      const histDoc = await t.get(historyRef);
      if (histDoc.exists()) return "already_used";
      const d = await t.get(ref);
      if (!d.exists()) return "invalid";
      const data = d.data();
      if (data.uses >= data.max_uses) return "exhausted";
      t.update(ref, { uses: increment(1) });
      t.set(historyRef, { used_at: new Date().toISOString() });
      const userRef = doc(this.db, 'users', String(userId));
      t.set(userRef, { balance: increment(data.reward_amount) }, { merge: true });
      return "success";
    });
  }

  async create_referral(referrer_id, referred_id, reward) {
    const ref = doc(this.db, 'users', String(referrer_id));
    const newRef = doc(this.db, 'referrals', String(referred_id));
    const d = await getDoc(newRef);
    if (!d.exists()) {
      await setDoc(newRef, {
        referrer_id: String(referrer_id),
        referred_id: String(referred_id),
        reward,
        created_at: new Date().toISOString()
      });
      await setDoc(ref, { referral_balance: increment(reward) }, { merge: true });
    }
  }

  async get_referral_stats(userId) {
    const q = query(collection(this.db, 'referrals'), where('referrer_id', '==', String(userId)));
    const snap = await getDocs(q);
    let total_earned = 0;
    snap.docs.forEach(d => total_earned += (d.data().reward || 0));
    return { count: snap.size, total_earned };
  }

  async get_referral_list(userId) {
    const q = query(collection(this.db, 'referrals'), where('referrer_id', '==', String(userId)));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ referred_user_id: d.data().referred_id, reward: d.data().reward }));
  }

  async get_next_numeric_id(collectionName) {
    const ref = doc(this.db, 'counters', collectionName);
    return await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      let nextId = 1;
      if (d.exists()) nextId = (d.data().lastId || 0) + 1;
      t.set(ref, { lastId: nextId });
      return nextId;
    });
  }

  async create_order(userId, game, package_name, api_price, charged_price, status, reference) {
    const numId = await this.get_next_numeric_id('orders');
    const orderId = `ORD-${100000 + numId}`;
    await setDoc(doc(this.db, 'orders', orderId), {
      id: orderId,
      order_id: orderId,
      numeric_id: numId,
      telegram_id: String(userId),
      game,
      package_name,
      api_price,
      charged_price,
      status,
      reference: reference || "",
      created_at: new Date().toISOString()
    });
    return orderId;
  }

  async get_user_orders(userId, limitCount = 5) {
    const q = query(
      collection(this.db, 'orders'),
      where('telegram_id', '==', String(userId)),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => { const data = d.data(); return { ...data, order_id: data.id }; });
  }

  async update_order(order_id, updates = {}) {
    if (!order_id) throw new Error('Missing order ID');
    await setDoc(doc(this.db, 'orders', String(order_id)), {
      ...updates,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return String(order_id);
  }

  async get_user_pending_payment_orders(userId, limitCount = 10) {
    await this.cleanup_expired_pending_payment_orders(userId);
    const q = query(
      collection(this.db, 'orders'),
      where('telegram_id', '==', String(userId)),
      where('status', '==', 'pending_payment')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => { const data = d.data(); return { ...data, order_id: data.id }; })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, limitCount);
  }

  async delete_order(order_id) {
    if (!order_id) return;
    await deleteDoc(doc(this.db, 'orders', String(order_id)));
  }

  async delete_pending_payment(reference) {
    if (!reference) return;
    await deleteDoc(doc(this.db, 'pending_payments', encodeURIComponent(String(reference))));
  }

  async cleanup_expired_pending_payment_orders(userId = null) {
    const q = userId == null
      ? query(collection(this.db, 'orders'), where('status', '==', 'pending_payment'))
      : query(
          collection(this.db, 'orders'),
          where('telegram_id', '==', String(userId)),
          where('status', '==', 'pending_payment')
        );
    const snap = await getDocs(q);
    const cutoff = Date.now() - PENDING_PAYMENT_TIMEOUT_MS;
    const expired = [];
    for (const d of snap.docs) {
      const data = d.data();
      const created = Date.parse(data.created_at || '');
      if (!Number.isFinite(created) || created <= cutoff) {
        expired.push({ order_id: data.id || d.id, reference: data.reference || '' });
      }
    }
    for (const item of expired) {
      try { await this.delete_order(item.order_id); } catch (e) { logger.warn(`Could not delete expired order ${item.order_id}: ${e.message}`); }
      if (item.reference) {
        try { await this.delete_pending_payment(item.reference); } catch (e) { logger.warn(`Could not delete expired pending payment ${item.reference}: ${e.message}`); }
      }
    }
    return expired.length;
  }

  async cancel_all_pending_payment_orders(userId) {
    const q = query(
      collection(this.db, 'orders'),
      where('telegram_id', '==', String(userId)),
      where('status', '==', 'pending_payment')
    );
    const snap = await getDocs(q);
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      try { await this.delete_order(data.id || d.id); } catch (e) { logger.warn(`Could not cancel order ${data.id || d.id}: ${e.message}`); continue; }
      if (data.reference) {
        try { await this.delete_pending_payment(data.reference); } catch (e) { logger.warn(`Could not delete pending payment ${data.reference}: ${e.message}`); }
      }
      count++;
    }
    return count;
  }

  async get_order_by_id(order_id) {
    const d = await getDoc(doc(this.db, 'orders', order_id));
    if (d.exists()) { const data = d.data(); return { ...data, order_id: data.id }; }
    return null;
  }

  async get_order_by_numeric_id(numeric_id) {
    const q = query(collection(this.db, 'orders'), where('numeric_id', '==', numeric_id), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) { const data = snap.docs[0].data(); return { ...data, order_id: data.id }; }
    return null;
  }

  async create_pending_payment(data) {
    const ref = String(data.reference || uuidv4());
    await setDoc(doc(this.db, 'pending_payments', encodeURIComponent(ref)), {
      id: ref,
      reference: ref,
      user_id: String(data.user_id),
      product: data.product || "Unknown Product",
      package_name: data.package_name || "",
      amount: Number(data.amount || 0),
      method: data.method || "telebirr",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return ref;
  }

  async update_pending_payment(reference, status, extra = {}) {
    const ref = doc(this.db, 'pending_payments', encodeURIComponent(String(reference)));
    await setDoc(ref, { status, updated_at: new Date().toISOString(), ...extra }, { merge: true });
  }

  async get_user_pending_payments(user_id) {
    const q = query(
      collection(this.db, 'pending_payments'),
      where('user_id', '==', String(user_id)),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data()).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  async create_deposit(user_id, method, amount, currency, txn_id) {
    if (amount === undefined) throw new Error('Cannot create deposit with undefined amount');
    const numId = await this.get_next_numeric_id('deposits');
    const id = String(numId);
    await setDoc(doc(this.db, 'deposits', id), {
      id,
      numeric_id: numId,
      user_id: String(user_id),
      method,
      amount,
      currency,
      transaction_id: txn_id,
      status: "pending",
      admin_note: "",
      created_at: new Date().toISOString()
    });
    return id;
  }

  async get_deposit_by_id(dep_id) {
    const d = await getDoc(doc(this.db, 'deposits', String(dep_id)));
    return d.exists() ? d.data() : null;
  }

  async approve_deposit(deposit_id, note = "") {
    const ref = doc(this.db, 'deposits', String(deposit_id));
    return await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      if (d.exists() && d.data().status === "pending") {
        t.update(ref, { status: "approved", admin_note: note });
        const userRef = doc(this.db, 'users', d.data().user_id);
        t.set(userRef, { balance: increment(d.data().amount) }, { merge: true });
        return true;
      }
      return false;
    });
  }

  async reject_deposit(deposit_id, note) {
    const ref = doc(this.db, 'deposits', String(deposit_id));
    return await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      if (d.exists() && d.data().status === "pending") {
        t.update(ref, { status: "rejected", admin_note: note });
        return true;
      }
      return false;
    });
  }

  async get_pending_deposits() {
    const q = query(collection(this.db, 'deposits'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }

  async is_transaction_used(txn_id) {
    const q = query(collection(this.db, 'transactions'), where('transaction_id', '==', String(txn_id)), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  async record_transaction_use(txn_id, user_id, amount, extra = {}) {
    await setDoc(doc(this.db, 'transactions', encodeURIComponent(String(txn_id))), {
      transaction_id: String(txn_id),
      user_id: String(user_id),
      amount: Number(amount || 0),
      used_at: new Date().toISOString(),
      ...extra
    });
  }

  async get_verified_transactions(limitCount = 30) {
    const snap = await getDocs(collection(this.db, 'transactions'));
    return snap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => String(b.used_at || '').localeCompare(String(a.used_at || '')))
      .slice(0, limitCount);
  }

  // Withdrawal methods (kept for admin)
  async create_withdrawal(user_id, method, amount, currency, account, nickname, fee) {
    const numId = await this.get_next_numeric_id('withdrawals');
    const id = String(1000 + numId);
    await setDoc(doc(this.db, 'withdrawals', id), {
      id,
      numeric_id: numId,
      user_id: String(user_id),
      method,
      amount,
      currency,
      account,
      nickname,
      fee,
      status: "pending",
      admin_note: "",
      approved_by: "",
      rejected_by: "",
      created_at: new Date().toISOString()
    });
    await this.update_balance(user_id, -(amount + fee));
    return id;
  }

  async get_withdrawal_by_id(wth_id) {
    const d = await getDoc(doc(this.db, 'withdrawals', String(wth_id)));
    return d.exists() ? d.data() : null;
  }

  async approve_withdrawal(withdrawal_id, note, admin_id) {
    const ref = doc(this.db, 'withdrawals', String(withdrawal_id));
    return await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      if (d.exists() && d.data().status === "pending") {
        t.update(ref, { status: "approved", admin_note: note, approved_by: String(admin_id) });
        return true;
      }
      return false;
    });
  }

  async reject_withdrawal(withdrawal_id, note, admin_id) {
    const ref = doc(this.db, 'withdrawals', String(withdrawal_id));
    return await runTransaction(this.db, async (t) => {
      const d = await t.get(ref);
      if (d.exists() && d.data().status === "pending") {
        t.update(ref, { status: "rejected", admin_note: note, rejected_by: String(admin_id) });
        const userRef = doc(this.db, 'users', d.data().user_id);
        t.set(userRef, { balance: increment(d.data().amount + d.data().fee) }, { merge: true });
        return true;
      }
      return false;
    });
  }

  async get_pending_withdrawals() {
    const q = query(collection(this.db, 'withdrawals'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }

  async get_dashboard_stats() {
    let stats = {
      total_users: 0,
      total_orders: 0,
      total_deposits: 0,
      total_deposit_amount: 0,
      pending_deposits: 0,
      total_withdrawals: 0,
      total_withdrawal_amount: 0,
      pending_withdrawals: 0,
      revenue_today: 0
    };
    try {
      const usersSnap = await getCountFromServer(collection(this.db, 'users'));
      stats.total_users = usersSnap.data().count;
      const ordersSnap = await getCountFromServer(collection(this.db, 'orders'));
      stats.total_orders = ordersSnap.data().count;
      const today = new Date().toISOString().slice(0, 10);
      const qOrders = query(collection(this.db, 'orders'), where('status', '==', 'completed'));
      const todayOrders = await getDocs(qOrders);
      todayOrders.docs.forEach(d => {
        const o = d.data();
        if (o.created_at && o.created_at.startsWith(today)) {
          stats.revenue_today += (o.charged_price || 0) - (o.api_price || 0);
        }
      });
      const depsSnap = await getDocs(collection(this.db, 'deposits'));
      stats.total_deposits = depsSnap.size;
      depsSnap.docs.forEach(d => {
        const dep = d.data();
        if (dep.status === 'approved') stats.total_deposit_amount += (dep.amount || 0);
        if (dep.status === 'pending') stats.pending_deposits++;
      });
      const wthSnap = await getDocs(collection(this.db, 'withdrawals'));
      stats.total_withdrawals = wthSnap.size;
      wthSnap.docs.forEach(d => {
        const w = d.data();
        if (w.status === 'approved') stats.total_withdrawal_amount += (w.amount || 0);
        if (w.status === 'pending') stats.pending_withdrawals++;
      });
    } catch (e) { console.error("Dashboard stats error:", e); }
    return stats;
  }

  async get_game_markup(game_code) {
    const d = await getDoc(doc(this.db, 'game_overrides', String(game_code)));
    if (d.exists() && d.data().markup_percentage !== undefined) return d.data().markup_percentage;
    return global.appSettings ? global.appSettings.DEFAULT_MARKUP_PERCENT : 15.0;
  }

  async set_game_markup(game_code, markup_percent) {
    await setDoc(doc(this.db, 'game_overrides', String(game_code)), { markup_percentage: markup_percent });
  }

  async set_game_product_price_override(game_code, product_id, price) {
    const id = `${game_code}__${product_id}`;
    if (price === null) await deleteDoc(doc(this.db, 'product_overrides', id));
    else await setDoc(doc(this.db, 'product_overrides', id), { id, game_code, product_id, price_override: price, type: "game" });
  }

  async get_all_product_overrides() {
    const snap = await getDocs(collection(this.db, 'product_overrides'));
    return snap.docs.map(d => d.data());
  }

  async get_product_price_override(product_id) {
    const q = query(collection(this.db, 'product_overrides'), where('product_id', '==', String(product_id)), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data().price_override;
    return null;
  }

  async set_product_price_override(product_id, price, type = "stars") {
    const id = String(product_id);
    if (price === null) await deleteDoc(doc(this.db, 'product_overrides', id));
    else await setDoc(doc(this.db, 'product_overrides', id), { id, product_id: id, price_override: price, type });
  }
}

// --------------------------------------------
// CatalogService
// --------------------------------------------
let appSettings = {
  DEFAULT_MARKUP_PERCENT: 15.0,
  TELEGRAM_STARS_MARKUP: 10.0,
  TELEGRAM_PREMIUM_MARKUP: 50.0,
  MAINTENANCE_MODE: false,
  REPORT_EVENTS: true,
  MAX_DEPOSIT_LIMIT: 7000.0,
  MAX_WITHDRAW_LIMIT: 5000.0,
  WITHDRAWAL_FEE_PERCENT: 0.05,
};

class CatalogService {
  constructor(api_client, db) {
    this.api_client = api_client;
    this.db = db;
    this._telegram_cache = null;
    this._telegram_ts = 0;
  }
  clear_cache() {
    this._telegram_cache = null;
    this._telegram_ts = 0;
  }
  async get_telegram_catalogue(force = false) {
    const now = Date.now();
    if (!force && this._telegram_cache && (now - this._telegram_ts) / 1000 < CACHE_TTL) {
      return this._telegram_cache;
    }
    const games_res = await this.api_client.get_games();
    let telegram_code = null;
    const games = games_res && games_res.success ? games_res.games || games_res.data : [];
    if (games) {
      const tg = games.find(g =>
        (g.name && g.name.toLowerCase().includes("telegram")) ||
        (g.code && g.code.toLowerCase().includes("telegram"))
      );
      if (tg) telegram_code = tg.code;
    }
    if (!telegram_code) telegram_code = "Telegram";
    const cat_res = await this.api_client.get_game_catalogue(telegram_code);
    let packages = [];
    if (cat_res && cat_res.success) packages = cat_res.catalogues || cat_res.data || [];
    const overrides = new Map();
    for (const ov of await this.db.get_all_product_overrides()) {
      if (ov.price_override !== undefined && ov.price_override !== null) {
        overrides.set(String(ov.product_id || ov.id), parseFloat(ov.price_override));
      }
    }
    const mapped = packages.map((pkg) => {
      const product_id = pkg.id || pkg.code || pkg.name;
      const override = overrides.get(String(product_id));
      return { ...pkg, _game_code: telegram_code, _override_price: override };
    });
    this._telegram_cache = mapped;
    this._telegram_ts = now;
    return mapped;
  }
  async get_telegram_stars_packages() {
    const packages = await this.get_telegram_catalogue();
    return packages.filter(p => {
      const n = (p.name || p.title || p.catalogue_name || "").toLowerCase();
      return n.includes("star") || n.includes("stars");
    });
  }
  async get_telegram_premium_plans() {
    const packages = await this.get_telegram_catalogue();
    return packages.filter(p => {
      const n = (p.name || p.title || p.catalogue_name || "").toLowerCase();
      return n.includes("premium") || n.includes("month") || n.includes("year");
    });
  }
  async get_telegram_stars_markup() {
    return appSettings.TELEGRAM_STARS_MARKUP;
  }
  async get_telegram_premium_markup() {
    return appSettings.TELEGRAM_PREMIUM_MARKUP;
  }
}

// --------------------------------------------
// Helper UI functions with custom emoji support
// --------------------------------------------
async function clear_last_photo(ctx, session) {
  if (session.data.last_photo_msg_id) {
    try { await ctx.telegram.deleteMessage(ctx.chat.id, session.data.last_photo_msg_id); } catch (e) {}
    session.data.last_photo_msg_id = null;
  }
}

// Build message with custom emoji entities
function buildMessageWithCustomEmojis(text) {
  let value = String(text ?? "");
  const tokenMap = new Map();
  let tokenIndex = 0;
  const makeToken = (key) => {
    const customId = getCustomEmojiId(key);
    if (!customId) return "";
    const token = `__CUSTOM_EMOJI_${tokenIndex++}__`;
    const fallback = EMOJI_BASE[key] || "·";
    tokenMap.set(token, `<tg-emoji emoji-id="${customId}">${fallback}</tg-emoji>`);
    return token;
  };

  // Convert explicit placeholders first.
  value = value.replace(/\{emoji:([A-Z_]+)\}/g, (full, key) => makeToken(key));

  // Convert every known literal Unicode emoji that has its own custom ID.
  const known = Object.entries(EMOJI_BASE)
    .filter(([key, emoji]) => getCustomEmojiId(key) && emoji)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, emoji] of known) {
    if (value.includes(emoji)) {
      const token = makeToken(key);
      value = value.split(emoji).join(token);
    }
  }

  // Remove any remaining ordinary Unicode emoji, but do this BEFORE restoring
  // custom-emoji HTML so the fallback character inside <tg-emoji> is retained.
  value = value.replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/gu, "");
  for (const [token, html] of tokenMap) value = value.split(token).join(html);
  return value;
}

async function sendOrEditPhoto(ctx, photoUrl, caption, extra = {}) {
  const session = getUserSession(ctx.from.id);
  const fullExtra = { parse_mode: "HTML", ...extra };
  fullExtra.reply_markup = processKeyboardCustomEmojis(fullExtra.reply_markup);
  caption = buildMessageWithCustomEmojis(caption);
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try {
      await ctx.editMessageMedia(
        { type: "photo", media: photoUrl, caption: caption, parse_mode: "HTML" },
        fullExtra,
      );
      session.data.last_photo_msg_id = ctx.callbackQuery.message.message_id;
      return;
    } catch (e) {}
  }
  await clear_last_photo(ctx, session);
  try {
    const photoExtra = { parse_mode: "HTML", ...extra };
    photoExtra.reply_markup = processKeyboardCustomEmojis(photoExtra.reply_markup);
    const msg = await ctx.replyWithPhoto(photoUrl, { caption, ...photoExtra });
    session.data.last_photo_msg_id = msg.message_id;
  } catch (e) {
    await sendOrEdit(ctx, caption, extra);
  }
}

async function sendOrEdit(ctx, text, extra = {}) {
  const session = getUserSession(ctx.from.id);
  const fullExtra = { parse_mode: "HTML", ...extra };
  fullExtra.reply_markup = processKeyboardCustomEmojis(fullExtra.reply_markup);
  const processedText = buildMessageWithCustomEmojis(text);
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try {
      if (ctx.callbackQuery.message.photo) {
        await ctx.deleteMessage().catch(() => {});
      } else {
        return await ctx.editMessageText(processedText, fullExtra);
      }
    } catch (e) {
      if (e.description && e.description.includes("message is not modified")) return;
    }
  }
  await clear_last_photo(ctx, session);
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
  }
  return await ctx.reply(processedText, fullExtra);
}

async function sendNewMessage(ctx, text, extra = {}) {
  const session = getUserSession(ctx.from.id);
  await clear_last_photo(ctx, session);
  const fullExtra = { parse_mode: "HTML", ...extra };
  fullExtra.reply_markup = processKeyboardCustomEmojis(fullExtra.reply_markup);
  const processedText = buildMessageWithCustomEmojis(text);
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
  }
  return await ctx.reply(processedText, fullExtra);
}

async function maintenance_check(ctx) {
  if (appSettings.MAINTENANCE_MODE && !ADMIN_CHAT_ID.includes(ctx.from.id)) {
    await sendOrEdit(ctx, `{emoji:WARNING} <b>Maintenance Mode</b>\n\nThe bot is currently undergoing maintenance. Please try again later.`);
    return false;
  }
  return true;
}

async function check_channel_membership(ctx) {
  // Channel is optional. Users are never blocked from /start or the shop.
  return true;
}

async function register_user_implicit(ctx, db, bot) {
  const user = ctx.from;
  const is_new = await db.register_user(user.id, user.username, user.first_name, user.last_name);
  if (is_new) {
    const uMention = `<a href="tg://user?id=${user.id}">${user.first_name || "User"}</a>`;
    await report_event(bot, `{emoji:USER} <b>New User Registered</b>\n${uMention} (ID: <code>${user.id}</code>)`);
  }
  return is_new;
}

// ====== FIXED report_event ======
async function report_event(bot, text, reply_markup = undefined) {
  // Bot Logs should contain ONLY pending payments and successful purchases.
  // Keep all other report_event calls harmless so existing bot functionality is unchanged.
  const logText = String(text || "");
  const allowed =
    /<b>Pending Product Payment<\/b>/i.test(logText) ||
    /<b>Pending Product Order<\/b>/i.test(logText) ||
    /<b>Pending Payment<\/b>/i.test(logText) ||
    /<b>New Order Placed<\/b>/i.test(logText) ||
    /<b>New Purchase<\/b>/i.test(logText) ||
    /<b>New Pending Order!<\/b>/i.test(logText);   // ✅ ADDED – enables the clean pending format

  if (!allowed) return;

  try {
    const options = { parse_mode: "HTML" };
    if (reply_markup) options.reply_markup = processKeyboardCustomEmojis(reply_markup);
    await bot.telegram.sendMessage(REPORT_CHANNEL_ID, buildMessageWithCustomEmojis(logText), options);
  } catch (e) {
    logger.warn(`Failed to send group log: ${e.message}`);
  }
}
// ====== END OF FIX ======

// Apply discount deduplication and clean names for Free Fire
function apply_discount_deduplication(packages) {
  if (!packages || !Array.isArray(packages)) return packages;
  packages.forEach(pkg => {
    const originalName = String(pkg.display_name || pkg.name || pkg.title || "");
    let normalized = originalName
      .replace(/\s*UC\s*\(discounted\)/ig, '')
      .replace(/\s*Diamonds?\s*\(discounted\)/ig, '')
      .replace(/\s*\(discounted\)/ig, '')
      .trim();
    pkg.display_name = normalized;
    pkg.is_discounted = originalName.toLowerCase().includes('(discounted)');
  });
  const grouped = {};
  packages.forEach(pkg => {
    const key = pkg.display_name.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(pkg);
  });
  const chosenPackages = new Set();
  for (const key in grouped) {
    const group = grouped[key];
    const discounted = group.filter(p => p.is_discounted);
    if (discounted.length > 0) {
      discounted.forEach(p => chosenPackages.add(p));
    } else {
      group.forEach(p => chosenPackages.add(p));
    }
  }
  const filtered = packages.filter(pkg => chosenPackages.has(pkg));
  filtered.sort((a, b) => {
    const numA = parseFloat((String(a.display_name || "").match(/[\d\.]+/) || [])[0]);
    const numB = parseFloat((String(b.display_name || "").match(/[\d\.]+/) || [])[0]);
    const isValidA = !isNaN(numA);
    const isValidB = !isNaN(numB);
    if (isValidA && isValidB && numA !== numB) return numA - numB;
    const priceA = parseFloat(a.unit_price ?? a.price ?? a.amount ?? a.cost ?? 0);
    const priceB = parseFloat(b.unit_price ?? b.price ?? b.amount ?? b.cost ?? 0);
    return priceA - priceB;
  });
  return filtered;
}

function sort_game_packages(gameCode, packages) {
  if (!packages || !Array.isArray(packages)) return packages;
  const lowerCode = (gameCode || "").toLowerCase();
  if (lowerCode.includes("freefire") || lowerCode.includes("free_fire")) {
    function getFFCategory(pkg) {
      const name = (pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || "").toLowerCase();
      if (name.includes("level up") || name.includes("levelup")) return 3;
      if (name.includes("membership") || name.includes("booyah") || name.includes("pass") || name.includes("lite"))
        return 2;
      return 1;
    }
    packages.sort((a, b) => {
      const catA = getFFCategory(a);
      const catB = getFFCategory(b);
      if (catA !== catB) return catA - catB;
      if (catA === 3) {
        const matchA = (a.name || a.title || "").match(/level\s*(\d+)/i);
        const matchB = (b.name || b.title || "").match(/level\s*(\d+)/i);
        if (matchA && matchB) return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      const priceA = parseFloat(a.unit_price ?? a.price ?? a.amount ?? a.cost ?? 0);
      const priceB = parseFloat(b.unit_price ?? b.price ?? b.amount ?? b.cost ?? 0);
      return priceA - priceB;
    });
  }
  return packages;
}

function normalize_game_name(game) {
  return String(game?.name || game?.title || game?.game_name || game?.code || "Game").trim();
}
function normalize_game_code(game) {
  return String(game?.code || game?.game_code || game?.slug || game?.name || "").trim();
}
function game_display_name(game) {
  return normalize_game_name(game);
}

// Product-specific custom emoji used in group logs.
function getProductEmojiKey(session) {
  const data = session?.data || {};
  const selectedId = String(data.selected_pkg_id || data.qamify_product_id || '').trim();
  const fields = [
    data.game_name,
    data.service_name,
    data.package_display_name,
    data.package_name,
    data.product_name,
  ].map(v => String(v || '').trim().toLowerCase()).filter(Boolean);

  // Resolve the actual flow before any Qamify/product-name fallback.
  // This prevents a stale qamify_key (for example "netflix") from
  // overriding a Free Fire package such as Weekly or Monthly.
  const flow = String(data.flow_type || '').toLowerCase();
  if (flow === 'gemini') return 'GEMINI';
  if (flow === 'capcut') return 'CAPCUT';
  if (flow === 'freefire') return 'FREE_FIRE';
  if (flow === 'telegram') return String(data.telegram_kind || '').toLowerCase() === 'premium' ? 'PREMIUM' : 'STARS';

  // Resolve Qamify products from the actual selected product ID first.
  for (const [key, config] of Object.entries(QAMIFY_EXTRA_PRODUCTS)) {
    if (selectedId && selectedId === String(config.product_id)) return config.emoji_key;
  }

  // Then resolve from the displayed/product names. This prevents a stale qamify_key
  // from making every Qamify product use the Netflix emoji.
  const matchers = [
    ['netflix', 'NETFLIX'],
    ['nordvpn', 'NORDVPN'],
    ['nord vpn', 'NORDVPN'],
    ['notion', 'NOTION'],
    ['amazon prime', 'AMAZON_PRIME'],
    ['prime video', 'AMAZON_PRIME'],
    ['leonardo ai video', 'LEONARDO_AI'],
    ['leonardo ai', 'LEONARDO_AI'],
    ['leonardo', 'LEONARDO_AI'],
  ];
  for (const [needle, emojiKey] of matchers) {
    if (fields.some(value => value.includes(needle))) return emojiKey;
  }

  if (fields.some(value => value.includes('gemini'))) return 'GEMINI';
  if (fields.some(value => value.includes('capcut'))) return 'CAPCUT';
  if (fields.some(value => value.includes('grok'))) return 'GROK';
  if (fields.some(value => value.includes('free fire') || value === 'ff')) return 'FREE_FIRE';
  if (fields.some(value => value.includes('premium'))) return 'PREMIUM';
  if (fields.some(value => value.includes('stars'))) return 'STARS';

  // qamify_key is only trusted as an exact fallback after the real flow and
  // displayed product/package names have been checked.
  const qamifyKey = String(data.qamify_key || '').trim().toLowerCase();
  if (qamifyKey && QAMIFY_EXTRA_PRODUCTS[qamifyKey]) {
    return QAMIFY_EXTRA_PRODUCTS[qamifyKey].emoji_key;
  }
  return 'GAME';
}

function getProductLogName(session) {
  return session?.data?.package_display_name || session?.data?.package_name || session?.data?.game_name || session?.data?.service_name || "Product";
}

// --------------------------------------------
// Main function (place_order_flow)
// --------------------------------------------
async function place_order_flow(ctx, session, db, api_client, bot, method, reference = null, verified_amount = null) {
  const user = ctx.from;
  const package_id = session.data.qamify_product_id || session.data.selected_pkg_id;
  const game_code = session.data.game_code || session.data.telegram_game_code || "Telegram";
  const player_id = session.data.player_id;
  const server_id = session.data.server_id || null;
  const charged_price = session.data.charged_price;
  const api_price = session.data.api_price;

  if (method === "wallet") {
    await db.update_balance(user.id, -charged_price);
  } else if (verified_amount > charged_price) {
    await db.update_balance(user.id, verified_amount - charged_price);
  }

  try {
    let api_res;
    if (session.data.flow_type === "voucher") {
      api_res = await api_client.purchase_product(package_id, 1);
    } else if (session.data.flow_type === "gemini" || session.data.flow_type === "capcut" || session.data.flow_type === "qamify") {
      const qamify = new QamifyAPIClient(QAMIFY_BASE_URL, QAMIFY_API_KEY);
      // Do NOT parse the Qamify product ID as an integer: Qamify IDs can
      // exceed JavaScript's safe integer range.
      const qamifyIdempotencyKey = session.data.qamify_idempotency_key || `order-${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
      session.data.qamify_idempotency_key = qamifyIdempotencyKey;
      api_res = await qamify.place_order(String(package_id), 1, qamifyIdempotencyKey);
    } else {
      api_res = await api_client.place_order(game_code, package_id, player_id, server_id, "127.0.0.1");
    }
    // Every product ordered through the Qamify /orders endpoint must use the
    // Qamify delivery parser, regardless of the product name or qamify_key.
    // Some Qamify products use flow_type=qamify while others use a dedicated
    // flow (for example Gemini/CapCut), so also detect the provider marker.
    const isQamifyOrder = ["qamify", "gemini", "capcut"].includes(String(session.data.flow_type || "").toLowerCase()) ||
      Boolean(session.data.qamify_key || session.data.qamify_product_id || session.data.qamify_idempotency_key) ||
      String(game_code || "").toLowerCase() === "qamify";

    // Normalize all Qamify delivery shapes before deciding whether the order
    // succeeded. This matters for products that return only a URL or a nested
    // delivery object instead of {content: ...}.
    const qamifyDeliveryTexts = [];
    const qamifyDeliveryLinks = [];
    const qamifySeenTexts = new Set();
    const qamifySeenLinks = new Set();

    const addQamifyDeliveryText = (value) => {
      if (value === null || value === undefined) return;
      const text = String(value).trim();
      if (!text || qamifySeenTexts.has(text)) return;
      qamifySeenTexts.add(text);
      qamifyDeliveryTexts.push(text);
    };

    const addQamifyDeliveryLink = (value) => {
      if (value === null || value === undefined) return;
      const link = String(value).trim();
      if (!/^https?:\/\//i.test(link) || qamifySeenLinks.has(link)) return;
      qamifySeenLinks.add(link);
      qamifyDeliveryLinks.push(link);
    };

    const collectQamifyDelivery = (value, depth = 0) => {
      if (value === null || value === undefined || depth > 8) return;
      if (typeof value === "string") {
        const text = value.trim();
        if (/^https?:\/\//i.test(text)) addQamifyDeliveryLink(text);
        else if (text) addQamifyDeliveryText(text);
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) collectQamifyDelivery(item, depth + 1);
        return;
      }
      if (typeof value !== "object") return;

      const textKeys = [
        "content", "credential", "credentials", "delivery", "delivery_content",
        "delivery_text", "email", "username", "password", "token", "code",
        "account", "account_details", "details", "value"
      ];
      const linkKeys = [
        "link", "url", "access_link", "download_link", "login_url",
        "activation_link", "redeem_link"
      ];
      const nestedKeys = [
        "data", "item", "items", "delivery_data", "delivery_items",
        "delivery", "result", "order", "response", "payload"
      ];

      for (const key of textKeys) {
        if (typeof value[key] === "string" && value[key].trim()) addQamifyDeliveryText(value[key]);
      }
      for (const key of linkKeys) {
        if (typeof value[key] === "string" && value[key].trim()) addQamifyDeliveryLink(value[key]);
      }
      for (const key of nestedKeys) {
        if (value[key] !== undefined) collectQamifyDelivery(value[key], depth + 1);
      }
    };

    if (isQamifyOrder) collectQamifyDelivery(api_res);

    const isQamifyDeliveryResponse = isQamifyOrder &&
      (qamifyDeliveryTexts.length > 0 || qamifyDeliveryLinks.length > 0);

    const success = isQamifyDeliveryResponse || (api_res &&
      (api_res.ok === true || api_res.success === true || api_res.success === "true" ||
       api_res.status === "completed" || api_res.status === "processing" ||
       api_res.message === "success" || api_res.status === 200 || api_res.code === 200));
    const status = success ? "completed" : "failed";
    let orderId = session.data.pending_order_id || null;
    if (orderId) {
      await db.update_order(orderId, {
        game: session.data.game_name,
        package_name: session.data.package_display_name || session.data.package_name,
        api_price,
        charged_price,
        status,
        reference: reference || "",
        verified_amount: verified_amount == null ? null : Number(verified_amount)
      });
    } else {
      orderId = await db.create_order(
        user.id,
        session.data.game_name,
        session.data.package_display_name || session.data.package_name,
        api_price,
        charged_price,
        status,
        reference,
      );
    }
    if (success) {
      // Escape provider-supplied delivery text before putting it into Telegram
      // HTML. Qamify credentials may contain &, <, >, or other characters.
      const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      // Delivery was normalized above for every Qamify product.
      const deliveryTexts = qamifyDeliveryTexts;
      const deliveryLinks = qamifyDeliveryLinks;

      let extra = "";
      if (deliveryTexts.length || deliveryLinks.length) {
        extra = "\n\n<b>Delivery:</b>";

        if (deliveryTexts.length) {
          extra += "\n<code>" + deliveryTexts.map(escapeHtml).join("\n") + "</code>";
        }

        if (deliveryLinks.length) {
          extra += "\n\n" + deliveryLinks.map(link =>
            `<b>Access Link:</b> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`
          ).join("\n") ;
        }
      }

      await sendOrEdit(ctx,
        `{emoji:SUCCESS} <b>Order Successful!</b>\n\n` +
        `Your order for <b>${escapeHtml(session.data.package_display_name || session.data.package_name)}</b> has been placed.` +
        `\nOrder ID: <code>${escapeHtml(orderId)}</code>${extra}`,
        { reply_markup: get_main_keyboard() });
      const maskPurchaseUserId = (value) => {
        const id = String(value || "");
        if (id.length <= 5) return id;
        return `${id.slice(0, 3)}***${id.slice(-2)}`;
      };
      const maskPurchaseOrderNo = (value) => {
        const code = String(value || "");
        if (code.length <= 5) return code;
        return `${code.slice(0, 3)}***${code.slice(-2)}`;
      };
      const purchaseProductName = getProductLogName(session);
      const purchaseEmojiKey = getProductEmojiKey(session);
      const purchaseBotUsername = bot.botInfo?.username || "";
      const purchaseProductToken = (() => {
        if (session.data.flow_type === "gemini") return "gemini";
        if (session.data.flow_type === "capcut") return "capcut";
        if (session.data.flow_type === "qamify" && session.data.qamify_key) return `qamify_${session.data.qamify_key}`;
        if (session.data.flow_type === "freefire") return "freefire";
        if (session.data.flow_type === "telegram") return session.data.telegram_kind === "premium" ? "telegram_premium" : "telegram_stars";
        return "shop";
      })();
      const purchaseProductLink = session.data.product_link ||
        (purchaseBotUsername ? `https://t.me/${purchaseBotUsername}?start=product_${encodeURIComponent(purchaseProductToken)}` : "");
      const purchaseMarkup = purchaseProductLink ? {
        inline_keyboard: [[{ text: `{emoji:${purchaseEmojiKey}} ${purchaseProductName}`, url: purchaseProductLink }]]
      } : undefined;

      await report_event(bot,
        `{emoji:CONFIRM} <b>New Purchase!</b>\n\n` +
        `{emoji:${purchaseEmojiKey}} <b>Product:</b> ${purchaseProductName}\n\n` +
        `       {emoji:USER} <b>By:</b> <code>${maskPurchaseUserId(user.id)}</code>\n` +
        `       {emoji:ORDERS} <b>Order No:</b> <code>${maskPurchaseOrderNo(orderId)}</code>`,
        purchaseMarkup
      );
      try {
        await bot.telegram.sendMessage(
          PROOF_CHANNEL_ID,
          buildMessageWithCustomEmojis(
            `{emoji:ORDERS} <b>Order ID:</b> <code>${orderId}</code>\n` +
            `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${getProductLogName(session)}\n` +
            `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:MONEY} <b>Charged:</b> ${Math.floor(charged_price)} ETB\n` +
            `{emoji:SUCCESS} <b>Status:</b> COMPLETED\n` +
            `{emoji:CALENDAR} <b>Date:</b> ${new Date().toISOString().slice(0, 10)}`
          ),
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Bot", url: `https://t.me/${bot.botInfo.username}` }]] } }
        );
      } catch (_) {}
    } else {
      if (method === "wallet") await db.update_balance(user.id, charged_price);
      else await db.update_balance(user.id, charged_price);
      const err_msg = api_res && (api_res.message || api_res.error || "Unknown error from provider.");
      await sendOrEdit(ctx, `{emoji:FAIL} <b>Order Failed</b>\n\nProvider returned an error: ${err_msg}\nYour funds have been refunded to your wallet.`, { reply_markup: get_main_keyboard() });
      await report_event(bot,
        `{emoji:FAIL} <b>Order Failed</b>\n` +
        `{emoji:USER} User: <a href="tg://user?id=${user.id}">${user.first_name || "User"}</a> (ID: <code>${user.id}</code>)\n` +
        `{emoji:${getProductEmojiKey(session)}} Product: ${getProductLogName(session)}\n` +
        `{emoji:ORDERS} Package: ${session.data.package_display_name || session.data.package_name}\n` +
        `{emoji:FAIL} Error: ${err_msg}`
      );
    }
  } catch (e) {
    if (method === "wallet") await db.update_balance(user.id, charged_price);
    else await db.update_balance(user.id, charged_price);
    await sendOrEdit(ctx, `{emoji:FAIL} <b>System Error</b>\n\nFailed to place order: ${e.message}\nFunds have been refunded to your wallet.`, { reply_markup: get_main_keyboard() });
  }
  clearUserSession(user.id);
}

// --------------------------------------------
// sendMainMenu – no image
// --------------------------------------------
async function sendMainMenu(ctx, db, messageIdToEdit = null) {
  const userId = ctx.from.id;
  const user_data = await db.get_user_profile(userId);
  const tgName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || ctx.from.username || "there";
  const safeTgName = String(tgName)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const caption =
    `{emoji:HOME} <b>Welcome, ${safeTgName}!</b> {emoji:START_HAND}\n\n` +
    `Your trusted top-up shop{emoji:START_CART} for Telegram, TikTok, Gemini, CapCut, Free Fire and premium subscriptions.\n\n` +
    `Use the buttons{emoji:START_DOWN} below to shop, manage your wallet, view orders or get support.`;
  if (messageIdToEdit) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        messageIdToEdit,
        null,
        buildMessageWithCustomEmojis(caption),
        {
          parse_mode: "HTML",
          reply_markup: processKeyboardCustomEmojis(get_main_keyboard()),
        }
      );
      return;
    } catch (e) {}
  }
  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.deleteMessage().catch(() => {});
    }
  } catch (e) {}
  await ctx.reply(buildMessageWithCustomEmojis(caption), {
    parse_mode: "HTML",
    reply_markup: processKeyboardCustomEmojis(get_main_keyboard()),
  });
}

// --------------------------------------------
// Package page render helper
// --------------------------------------------
async function render_package_page(ctx, session, page) {
  const buttons = session.data.pkg_buttons || [];
  const isOnePerRow = session.data.isOnePerRow || false;
  const isPaginated = session.data.isPaginated || false;
  const backBtn = session.data.pkg_back || "shop_back";
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(buttons.length / pageSize));
  page = Math.max(0, Math.min(page, totalPages - 1));
  let slice = buttons;
  if (isPaginated) {
    slice = buttons.slice(page * pageSize, page * pageSize + pageSize);
  }
  const grid = [];
  if (isOnePerRow) {
    for (let btn of slice) grid.push([btn]);
  } else {
    for (let i = 0; i < slice.length; i += 2) grid.push(slice.slice(i, i + 2));
  }
  if (isPaginated && totalPages > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: `{emoji:BACK} Previous`, callback_data: `pkg_page:${page - 1}` });
    if (page < totalPages - 1) nav.push({ text: `Next {emoji:BACK}`, callback_data: `pkg_page:${page + 1}` });
    if (nav.length) grid.push(nav);
  }
  grid.push([{ text: `{emoji:BACK} Back`, callback_data: backBtn, style: "danger" }]);
  session.state = STATE_SELECT_PKG;
  await sendOrEdit(ctx, `{emoji:ORDERS} <b>Select a package:</b>`, {
    reply_markup: { inline_keyboard: grid },
  });
}

// --------------------------------------------
// Main function (continued)
// --------------------------------------------
const ADMIN_CHAT_IDS = ADMIN_CHAT_ID;

async function main() {
  const db = new FirestoreDatabase();
  await db.load_settings(appSettings);
  // Enforce the requested maximum deposit limit.
  appSettings.MAX_DEPOSIT_LIMIT = 7000.0;
  try { await db.save_setting("MAX_DEPOSIT_LIMIT", 7000.0, appSettings); } catch (e) { logger.warn(`Could not persist MAX_DEPOSIT_LIMIT: ${e.message}`); }
  logger.info("Initial settings loaded from Firestore.");

  const api_client = new G2BulkAPIClient(G2BULK_BASE_URL, G2BULK_API_KEY, CACHE_TTL);
  const catalog_service = new CatalogService(api_client, db);
  const qamify_client = new QamifyAPIClient(QAMIFY_BASE_URL, QAMIFY_API_KEY);
  const bot = new Telegraf(BOT_TOKEN);

  // Sync settings every 5s
  setInterval(async () => {
    try { await db.load_settings(appSettings); } catch (e) { logger.error(`Failed to sync settings: ${e.message}`); }
  }, 5000);

  // ---- Commands ----
  bot.command("cancel", async (ctx) => {
    const userId = ctx.from.id;
    clearUserSession(userId);
    await sendMainMenu(ctx, db);
  });

  // ---- Quick commands for every main-menu button (except Bot Logs / Channel) ----
  bot.command("wallet", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await maintenance_check(ctx))) return;
    if (!(await check_channel_membership(ctx))) return;
    await register_user_implicit(ctx, db, bot);
    const profile = await db.get_user_profile(userId);
    const balance = profile ? profile.balance || 0 : 0;
    const msg = `{emoji:WALLET} <b>Your Wallet</b>\n\n` +
      `{emoji:MONEY} <b>Balance:</b> ${Math.floor(balance)} ETB\n\n` +
      `Select a deposit method to add funds:`;
    await sendOrEdit(ctx, msg, { reply_markup: get_wallet_keyboard() });
  });

  bot.command("shop", async (ctx) => {
    if (!(await maintenance_check(ctx))) return;
    if (!(await check_channel_membership(ctx))) return;
    const session = getUserSession(ctx.from.id);
    session.state = STATE_SHOP;
    await sendOrEdit(ctx, `{emoji:GAME} <b>Shop</b>\n\nSelect a service:`, {
      reply_markup: get_shop_keyboard()
    });
  });

  bot.command("profile", async (ctx) => {
    const userId = ctx.from.id;
    const user_data = await db.get_user_profile(userId);
    if (!user_data || !Object.keys(user_data).length) {
      await sendOrEdit(ctx, `{emoji:WARNING} Profile sync delayed.`, { reply_markup: get_main_keyboard() });
      return;
    }
    const reg_date = (user_data.registered_at || "").slice(0, 10);
    const profile_text =
      `{emoji:PROFILE} <b>User Profile</b>\n\n` +
      `{emoji:USER} <b>Name:</b> ${user_data.first_name || "N/A"}\n` +
      `{emoji:USER} <b>Username:</b> @${user_data.username || "N/A"}\n` +
      ` <b>ID:</b> <code>${user_data.telegram_id || userId}</code>\n` +
      `{emoji:MONEY} <b>Balance:</b> ${Math.floor(user_data.balance || 0)} ETB\n` +
      `{emoji:MONEY} <b>Referral Balance:</b> ${Math.floor(user_data.referral_balance || 0)} ETB\n` +
      `{emoji:CALENDAR} <b>Registered:</b> ${reg_date}\n` +
      "━━━━━━━━━━━━━━━━━━━━━━\n" +
      `{emoji:ORDERS} <b>Completed Orders:</b> ${user_data.total_orders || 0}\n` +
      `{emoji:MONEY} <b>Total Spent:</b> ${Math.floor(user_data.total_spent || 0)} ETB\n`;
    await sendOrEdit(ctx, profile_text, { reply_markup: get_profile_keyboard() });
  });

  bot.command("orders", async (ctx) => {
    const orders = await db.get_user_orders(ctx.from.id, 5);
    let text;
    if (!orders.length) {
      text = `{emoji:ORDERS} <b>No orders yet.</b>`;
    } else {
      text = `{emoji:ORDERS} <b>Last 5 Orders:</b>\n\n`;
      for (const order of orders) {
        text +=
          `{emoji:ORDERS} <b>Order ID:</b> <code>${order.order_id}</code>\n` +
          `{emoji:GAME} <b>Product:</b> ${order.game}\n` +
          `{emoji:MONEY} <b>Package:</b> ${order.package_name}\n` +
          `{emoji:MONEY} <b>Charged:</b> ${Math.floor(order.charged_price || 0)} ETB\n` +
          `{emoji:STATUS} <b>Status:</b> ${order.status}\n` +
          `{emoji:CALENDAR} <b>Date:</b> ${(order.created_at || "").slice(0, 10)}\n` +
          "━━━━━━━━━━━━━━━━━━━━━━\n";
      }
    }
    await sendOrEdit(ctx, text, { reply_markup: get_main_keyboard() });
  });

  bot.command("support", async (ctx) => {
    clearUserSession(ctx.from.id);
    await sendOrEdit(ctx,
      `{emoji:SUPPORT} <b>Support & Help</b>\n\n` +
      `For support, manual purchases, custom orders and any action requiring admin assistance, contact <b>${ADMIN_USERNAME}</b>.`,
      { reply_markup: get_support_keyboard() }
    );
  });

  bot.command("pending", async (ctx) => {
    const pending = await db.get_user_pending_payment_orders(ctx.from.id);
    if (!pending.length) {
      await sendOrEdit(ctx, `{emoji:INFO} <b>Pending Payments</b>\n\nYou have no pending product payments.`, {
        reply_markup: get_main_keyboard()
      });
      return;
    }
    let msg = `{emoji:PENDING_PAYMENT} <b>Pending Payments</b>\n\n`;
    const keyboard = [];
    for (const order of pending) {
      msg += `{emoji:ORDERS} <b>Order ${String(order.order_id)}</b>\n` +
        `${String(order.game || "Product")}${order.package_name ? ` — ${String(order.package_name)}` : ""}\n` +
        `{emoji:MONEY} ${Math.floor(Number(order.charged_price || 0))} ETB\n` +
        (order.reference ? `Ref: <code>${String(order.reference)}</code>\n` : "") +
        `{emoji:STATUS} Status: Pending Payment\n\n`;
      keyboard.push([
        { text: `${getBaseEmoji('PAY')} Resume Order`, callback_data: `resume_order:${String(order.order_id)}` },
        { text: `${getBaseEmoji('CANCEL')} Cancel`, callback_data: `order_cancel_pending:${String(order.order_id)}`, style: "danger" }
      ]);
    }
    keyboard.push([{ text: `${getBaseEmoji('CANCEL')} Cancel All`, callback_data: "cancel_all_pending", style: "danger" }]);
    keyboard.push([{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]);
    await sendOrEdit(ctx, msg, { reply_markup: { inline_keyboard: keyboard } });
  });

  bot.hears(/^(cancel|❌ cancel|🔙 back)/i, async (ctx) => {
    const userId = ctx.from.id;
    clearUserSession(userId);
    await sendMainMenu(ctx, db);
  });

  bot.command("terms", async (ctx) => {
    clearUserSession(ctx.from.id);
    const terms =
      `{emoji:WARNING} <b>YABTOPUP — RULES &amp; TERMS</b> {emoji:WARNING}\n` +
      `By using YABTOPUP, you automatically agree to the following Terms &amp; Conditions\n\n` +
      `{emoji:WARNING} <b>AGE REQUIREMENT</b>\n` +
      `Users must be 18+ to use our services. If you are under 18, do not send money without permission from a parent/guardian. Unauthorized transactions may lead to legal action.\n\n` +
      `{emoji:GEMINI_DESC} <b>AUTO PRODUCTS</b>\n` +
      `{emoji:FREE_FIRE} Free Fire, {emoji:STARS} Telegram Stars, {emoji:GEMINI} Gemini Pro, {emoji:CAPCUT} CapCut Pro, Netflix, Amazon Prime, Leonardo AI, Surfshark VPN &amp; Notion are AUTO. After payment, copy the receipt text and send it to the Bot. Your selected product will be delivered automatically.\n\n` +
      `{emoji:CANCEL} Fake receipts / fake payments are strictly prohibited. Users who submit fake receipts will be permanently banned from the Bot.\n\n` +
      `{emoji:GEMINI_DESC} <b>MANUAL PRODUCTS</b>\n` +
      `{emoji:TIKTOK} TikTok Coins &amp; {emoji:TELEGRAM} Telegram Premium are MANUAL. To order, contact the Admin or YABTOPUP directly.\n\n` +
      `{emoji:PREMIUM} Telegram Premium: After payment, send the Telegram @username where you want Premium.\n\n` +
      `{emoji:TIKTOK} TikTok Coins: After payment, send the TikTok Email or Phone Number of the account. If using Email, also provide the password. When a login code is sent to your Email/Phone, send the code carefully to the Admin.\n\n` +
      `{emoji:GEMINI_DESC} <b>PAYMENT &amp; RESPONSIBILITY</b>\n` +
      `Check the product, account details and price carefully before making payment. Customers are responsible for incorrect information.\n\n` +
      `{emoji:WARNING} No refunds after an order has been completed.\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `{emoji:GEMINI} <b>AUTO:</b> Free Fire • Telegram Stars • Gemini Pro • CapCut Pro • Netflix • Amazon Prime • Leonardo AI • Surfshark VPN • Notion\n\n` +
      `{emoji:SUPPORT} <b>MANUAL:</b> TikTok Coins • Telegram Premium\n\n` +
      `{emoji:SUPPORT} <b>Support:</b> ${ADMIN_USERNAME}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `{emoji:WARNING} <b>PLEASE READ THE RULES BEFORE ORDERING</b>`;
    await sendOrEdit(ctx, terms, { reply_markup: get_main_keyboard() });
  });

  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    if (!(await maintenance_check(ctx))) return;
    if (!(await check_channel_membership(ctx))) return;
    if (await db.is_banned(user.id)) {
      await sendOrEdit(ctx, `{emoji:FAIL} You are banned.`);
      return;
    }
    await register_user_implicit(ctx, db, bot);
    const parts = (ctx.message.text || "").split(" ");
    if (parts.length > 1 && parts[1].startsWith("ref")) {
      try {
        const referrer_id = parseInt(parts[1].slice(3), 10);
        if (referrer_id !== user.id) {
          const success = await db.create_referral(referrer_id, user.id, REFERRAL_REWARD);
          if (success) {
            const userMention = `<a href="tg://user?id=${user.id}">${user.first_name || "User"}</a>`;
            try {
              await bot.telegram.sendMessage(
                referrer_id,
                `{emoji:USER} ${userMention} joined using your referral link! You earned ${REFERRAL_REWARD} ETB!`,
                { parse_mode: "HTML" }
              );
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    await sendMainMenu(ctx, db);
  });

  bot.command("admin", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) {
      await sendOrEdit(ctx, `{emoji:FAIL} Unauthorized.`);
      return;
    }
    const session = getUserSession(ctx.from.id);
    session.state = STATE_ADMIN_MAIN;
    await sendOrEdit(ctx, `{emoji:SUCCESS} Access granted.`, { reply_markup: get_admin_keyboard() });
  });

  bot.command("broadcast", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const text = ctx.message.text.replace(/^\/broadcast\s*/, "").trim();
    if (!text) { await sendOrEdit(ctx, "Usage: /broadcast <message>"); return; }
    const users = await db.get_all_users();
    let success = 0;
    for (const uid of users) {
      try { await bot.telegram.sendMessage(uid, text); success++; } catch (_) {}
    }
    await sendOrEdit(ctx, `{emoji:SUCCESS} Broadcast sent to ${success}/${users.length} users.`);
  });

  bot.command("gencode", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    if (!args.length) { await sendOrEdit(ctx, "Usage: /gencode <amount> [max_uses] [code]"); return; }
    const amount = parseFloat(args[0]);
    if (isNaN(amount)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid amount.`); return; }
    const max_uses = args.length > 1 ? parseInt(args[1], 10) : 1;
    const code = args.length > 2 ? args[2].toUpperCase() : uuidv4().slice(0, 8).toUpperCase();
    const success = await db.create_promo_code(code, amount, max_uses);
    if (success) await sendOrEdit(ctx, `{emoji:SUCCESS} Code <b>${code}</b> created for ${Math.floor(amount)} ETB, uses: ${max_uses}`);
    else await sendOrEdit(ctx, `{emoji:FAIL} Code already exists.`);
  });

  bot.command("listcodes", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const codes = await db.list_promo_codes();
    if (!codes.length) { await sendOrEdit(ctx, `{emoji:INFO} No promo codes found.`); return; }
    let msg = `{emoji:MONEY} <b>Active Promo Codes</b>\n\n`;
    for (const c of codes) msg += `<code>${c.code}</code>: ${Math.floor(c.amount)} ETB | ${c.used_count}/${c.max_uses} used\n`;
    await sendOrEdit(ctx, msg);
  });

  bot.command("delcode", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    if (!args.length) { await sendOrEdit(ctx, "Usage: /delcode <code>"); return; }
    const code = args[0].toUpperCase();
    await db.delete_promo_code(code);
    await sendOrEdit(ctx, `{emoji:SUCCESS} Code <b>${code}</b> deleted.`);
  });

  bot.command("refer", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    if (!args.length) { await sendOrEdit(ctx, "Usage: /refer <user_id>"); return; }
    const user_id = parseInt(args[0], 10);
    if (isNaN(user_id)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid ID.`); return; }
    const stats = await db.get_referral_stats(user_id);
    const referrals = await db.get_referral_list(user_id);
    let msg = `{emoji:INFO} <b>Referral Stats for ID <code>${user_id}</code></b>\n\n`;
    msg += `{emoji:USER} Total invited: <b>${stats.count}</b>\n`;
    msg += `{emoji:MONEY} Rewarded: <b>${stats.total_earned}</b>\n`;
    msg += `{emoji:MONEY} Total earned: <b>${Math.floor(stats.total_earned)} ETB</b>\n\n`;
    if (referrals.length) {
      msg += "<b>Recent invites:</b>\n";
      for (const r of referrals) {
        const status_icon = r.reward_given ? '{emoji:SUCCESS}' : '{emoji:CLOCK}';
        msg += ` ${status_icon} <code>${r.referred_id}</code> (${r.status}) – ${(r.created_at || "").slice(0, 10)}\n`;
      }
    } else { msg += "<i>No invites yet.</i>"; }
    await sendOrEdit(ctx, msg);
  });

  bot.command("listgames", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const games_res = await api_client.get_games();
    const games = (games_res && (games_res.games || games_res.data)) || [];
    if (!games.length) { await sendOrEdit(ctx, "No games found."); return; }
    let msg = `{emoji:GAME} <b>Game Codes</b>\n\n`;
    for (const g of games) msg += `<code>${g.code}</code> – ${g.name}\n`;
    await sendOrEdit(ctx, msg);
  });

  // ---- Callback query handler ----
  bot.on("callback_query", async (ctx) => {
    try {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from.id;
      const session = getUserSession(userId);
      await ctx.answerCbQuery().catch(() => {});
      if (await db.is_banned(userId)) {
        await sendOrEdit(ctx, `{emoji:FAIL} You are banned.`);
        return;
      }

      // Cancel / back
      if (data === "cancel_action") {
        await clear_last_photo(ctx, session);
        clearUserSession(userId);
        delete verify_attempts[userId];
        await ctx.answerCbQuery("Action cancelled.").catch(() => {});
        await sendMainMenu(ctx, db);
        return;
      }
      if (data === "back_to_main") {
        clearUserSession(userId);
        await sendMainMenu(ctx, db);
        return;
      }

      if (data === "retry_payment") {
        const orderId = session.data.pending_order_id;
        const order = orderId ? await db.get_order_by_id(orderId) : null;
        if (!order || String(order.telegram_id) !== String(userId)) {
          clearUserSession(userId);
          await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment rejected.</b>\n\nThis payment session is no longer available. Please create a new order.`, {
            reply_markup: get_main_keyboard()
          });
          return;
        }

        const method = order.payment_method;
        const methodInfo = PAYMENT_METHODS[method];
        if (!methodInfo || method === "wallet") {
          clearUserSession(userId);
          await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment rejected.</b>\n\nPlease create a new order.`, {
            reply_markup: get_main_keyboard()
          });
          return;
        }

        // Re-open the same pending order so the user can submit a new reference.
        await db.update_order(orderId, {
          status: "pending_payment",
          payment_stage: "waiting_reference",
          payment_error: null
        });

        session.state = STATE_PAYMENT_TXN_ID;
        session.data.pending_order_id = orderId;
        session.data.pay_method = method;
        session.data.game_name = order.game_name || order.game || "Product";
        session.data.service_name = order.service_name || "";
        session.data.package_name = order.package_name || "";
        session.data.package_display_name = order.package_display_name || order.package_name || "";
        session.data.charged_price = Number(order.charged_price || 0);
        session.data.api_price = Number(order.api_price || 0);
        session.data.game_code = order.game_code || "Telegram";
        session.data.telegram_game_code = order.game_code || "Telegram";
        session.data.selected_pkg_id = order.selected_pkg_id || "";
        session.data.player_id = order.player_id || "";
        session.data.server_id = order.server_id || null;
        session.data.flow_type = order.flow_type || "game";
        delete verify_attempts[userId];

        let retryCaption;
        if (method === "telebirr") {
          retryCaption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:GAME} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:TELEBIRR} TeleBirr Account\n\n` +
            `Number: ${methodInfo.account}\n` +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `Please complete your payment within 15 minutes.\n\n` +
            `Now send your Transaction Number.`;
        } else if (method === "cbe") {
          retryCaption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:GAME} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:CBE} CBE Account\n\n` +
            `Account: ${methodInfo.account}\n` +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `If you have a link that looks like https://mbreceipt.cbe.com.et/...\n` +
            `paste the link and send your last 8 digits of your CBE account.`;
        } else {
          retryCaption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:GAME} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:BOA} <b>Bank of Abyssinia Account</b>\n\n` +
            (methodInfo.account ? `Account: ${methodInfo.account}\n` : "") +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `After sending, please provide the transaction reference number, then the last 5 digits of your Bank of Abyssinia account.`;
        }

        const retryKb = {
          inline_keyboard: [[
            { text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }
          ]]
        };
        await sendOrEdit(ctx, retryCaption, { reply_markup: retryKb });
        return;
      }

      if (data === "menu_pending_payments") {
        const pending = await db.get_user_pending_payment_orders(userId);
        if (!pending.length) {
          await sendNewMessage(ctx, `{emoji:INFO} <b>Pending Payments</b>\n\nYou have no pending product payments.`, { reply_markup: { inline_keyboard: [[{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]] } });
          return;
        }
        let msg = `{emoji:PENDING_PAYMENT} <b>Pending Payments</b>\n\n`;
        const keyboard = [];
        for (const order of pending) {
          msg += `{emoji:ORDERS} <b>Order ${String(order.order_id)}</b>\n` +
            `${String(order.game || "Product")}` +
            (order.package_name ? ` — ${String(order.package_name)}` : "") +
            `\n{emoji:MONEY} ${Math.floor(Number(order.charged_price || 0))} ETB\n` +
            (order.reference ? `Ref: <code>${String(order.reference)}</code>\n` : "") +
            `{emoji:STATUS} Status: Pending Payment\n\n`;
          keyboard.push([
            { text: `${getBaseEmoji('PAY')} Resume Order`, callback_data: `resume_order:${String(order.order_id)}` },
            { text: `${getBaseEmoji('CANCEL')} Cancel`, callback_data: `order_cancel_pending:${String(order.order_id)}`, style: "danger" }
          ]);
        }
        keyboard.push([{ text: `${getBaseEmoji('CANCEL')} Cancel All`, callback_data: "cancel_all_pending", style: "danger" }]);
        keyboard.push([{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]);
        await sendNewMessage(ctx, msg, { reply_markup: { inline_keyboard: keyboard } });
        return;
      }

      if (data === "cancel_all_pending") {
        const count = await db.cancel_all_pending_payment_orders(userId);
        clearUserSession(userId);
        delete verify_attempts[userId];
        await ctx.answerCbQuery(count ? `${count} pending order${count === 1 ? '' : 's'} cancelled.` : "No pending orders to cancel.").catch(() => {});
        await sendMainMenu(ctx, db);
        return;
      }

      if (data.startsWith("order_cancel_pending:")) {
        const orderId = data.slice("order_cancel_pending:".length);
        const order = await db.get_order_by_id(orderId);
        if (!order || String(order.telegram_id) !== String(userId) || String(order.status) !== "pending_payment") {
          await ctx.answerCbQuery("This pending order is no longer available.").catch(() => {});
          return;
        }
        try { await db.delete_order(orderId); } catch (e) { logger.warn(`Could not cancel pending order ${orderId}: ${e.message}`); }
        if (order.reference) {
          try { await db.delete_pending_payment(order.reference); } catch (e) { logger.warn(`Could not delete pending payment ${order.reference}: ${e.message}`); }
        }
        clearUserSession(userId);
        delete verify_attempts[userId];
        await ctx.answerCbQuery("Order cancelled.").catch(() => {});
        const remaining = await db.get_user_pending_payment_orders(userId);
        if (!remaining.length) {
          await sendOrEdit(ctx, `{emoji:INFO} <b>Pending Payments</b>\n\nAll pending payments have been cancelled.`, { reply_markup: get_main_keyboard() });
        } else {
          let msg = `{emoji:PENDING_PAYMENT} <b>Pending Payments</b>\n\n`;
          const keyboard = [];
          for (const item of remaining) {
            msg += `{emoji:ORDERS} <b>Order ${String(item.order_id)}</b>\n` +
              `${String(item.game || "Product")}${item.package_name ? ` — ${String(item.package_name)}` : ""}\n` +
              `{emoji:MONEY} ${Math.floor(Number(item.charged_price || 0))} ETB\n` +
              (item.reference ? `Ref: <code>${String(item.reference)}</code>\n` : "") +
              `{emoji:STATUS} Status: Pending Payment\n\n`;
            keyboard.push([
              { text: `${getBaseEmoji('PAY')} Resume Order`, callback_data: `resume_order:${String(item.order_id)}` },
              { text: `${getBaseEmoji('CANCEL')} Cancel`, callback_data: `order_cancel_pending:${String(item.order_id)}`, style: "danger" }
            ]);
          }
          keyboard.push([{ text: `${getBaseEmoji('CANCEL')} Cancel All`, callback_data: "cancel_all_pending", style: "danger" }]);
          keyboard.push([{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]);
          await sendOrEdit(ctx, msg, { reply_markup: { inline_keyboard: keyboard } });
        }
        return;
      }

      if (data.startsWith("resume_order:")) {
        const orderId = data.slice("resume_order:".length);
        const order = await db.get_order_by_id(orderId);
        if (!order || String(order.telegram_id) !== String(userId) || order.status !== "pending_payment") {
          await sendOrEdit(ctx, `{emoji:FAIL} This pending order is no longer available.`, { reply_markup: get_main_keyboard() });
          return;
        }
        const method = order.payment_method;
        const methodInfo = PAYMENT_METHODS[method];
        if (!methodInfo || method === "wallet") {
          await sendOrEdit(ctx, `{emoji:FAIL} This payment session cannot be resumed. Please create a new order.`, { reply_markup: get_main_keyboard() });
          return;
        }

        session.state = STATE_PAYMENT_TXN_ID;
        session.data.pending_order_id = orderId;
        session.data.pay_method = method;
        session.data.game_name = order.game_name || order.game || "Product";
        session.data.service_name = order.service_name || "";
        session.data.package_name = order.package_name || "";
        session.data.package_display_name = order.package_display_name || order.package_name || "";
        session.data.charged_price = Number(order.charged_price || 0);
        session.data.api_price = Number(order.api_price || 0);
        session.data.game_code = order.game_code || "Telegram";
        session.data.telegram_game_code = order.game_code || "Telegram";
        session.data.selected_pkg_id = order.selected_pkg_id || "";
        session.data.player_id = order.player_id || "";
        session.data.server_id = order.server_id || null;
        session.data.flow_type = order.flow_type || "game";

        let caption;
        if (method === "telebirr") {
          caption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:TELEBIRR} TeleBirr Account\n\n` +
            `Number: ${methodInfo.account}\n` +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `Please complete your payment within 15 minutes.\n\n` +
            `Now send your Transaction Number.`;
        } else if (method === "cbe") {
          caption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:CBE} CBE Account\n\n` +
            `Account: ${methodInfo.account}\n` +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `If you have a link that looks like https://mbreceipt.cbe.com.et/...\npaste the link and send your last 8 digits of your CBE account.`;
        } else if (method === "boa") {
          caption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:BOA} <b>Bank of Abyssinia Account</b>\n\n` +
            (methodInfo.account ? `Account: ${methodInfo.account}\n` : "") +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `After sending, please provide the transaction reference number, then the last 5 digits of your Bank of Abyssinia account.`;
        } else {
          caption =
            `{emoji:PAY} Payment Instructions\n\n` +
            `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:${method.toUpperCase()}} ${methodInfo.label} Account\n\n` +
            `Account: ${methodInfo.account}\n` +
            `Name: ${methodInfo.name}\n` +
            `{emoji:MONEY} Amount: ${Math.floor(session.data.charged_price)} Birr\n\n` +
            `After sending, please provide the transaction reference.`;
        }
        await db.update_order(orderId, { payment_stage: "waiting_reference" });
        const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]] };
        await clear_last_photo(ctx, session);
        await sendOrEditPhoto(ctx, IMG_TRANSACTION_ID, caption, { reply_markup: cancel_kb });
        return;
      }

      // ---- Profile ----
      if (data === "menu_profile") {
        const user_data = await db.get_user_profile(userId);
        if (!user_data || !Object.keys(user_data).length) {
          await sendOrEdit(ctx, `{emoji:WARNING} Profile sync delayed.`, { reply_markup: get_main_keyboard() });
          return;
        }
        const reg_date = (user_data.registered_at || "").slice(0, 10);
        const profile_text =
          `{emoji:PROFILE} <b>User Profile</b>\n\n` +
          `{emoji:USER} <b>Name:</b> ${user_data.first_name || "N/A"}\n` +
          `{emoji:USER} <b>Username:</b> @${user_data.username || "N/A"}\n` +
          ` <b>ID:</b> <code>${user_data.telegram_id || userId}</code>\n` +
          `{emoji:MONEY} <b>Balance:</b> ${Math.floor(user_data.balance)} ETB\n` +
          `{emoji:MONEY} <b>Referral Balance:</b> ${Math.floor(user_data.referral_balance)} ETB\n` +
          `{emoji:CALENDAR} <b>Registered:</b> ${reg_date}\n` +
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          `{emoji:ORDERS} <b>Completed Orders:</b> ${user_data.total_orders}\n` +
          `{emoji:MONEY} <b>Total Spent:</b> ${Math.floor(user_data.total_spent)} ETB\n`;
        await sendOrEdit(ctx, profile_text, { reply_markup: get_profile_keyboard() });
        return;
      }

      if (data === "profile_referral") {
        const stats = await db.get_referral_stats(userId);
        const me = await bot.telegram.getMe();
        const ref_link = `https://t.me/${me.username}?start=ref${userId}`;
        const msgText =
          `{emoji:USER} <b>Your Referral Stats</b>\n\n` +
          `{emoji:USER} <b>Your Link:</b> <code>${ref_link}</code>\n` +
          `{emoji:USER} <b>Total Invites:</b> ${stats.count}\n` +
          `{emoji:MONEY} <b>Rewarded:</b> ${stats.total_earned}\n` +
          `{emoji:MONEY} <b>Total Earned:</b> ${Math.floor(stats.total_earned)} ETB\n` +
          `{emoji:MONEY} <b>Reward per invite:</b> ${REFERRAL_REWARD} ETB (instant, not withdrawable)\n\n` +
          "<i>Share your link. Each new user who joins gives you an instant reward!</i>";
        const kb = { inline_keyboard: [[{ text: "Back to Main Menu", callback_data: "back_to_main" }]] };
        await sendOrEdit(ctx, msgText, { reply_markup: kb });
        return;
      }

      if (data === "profile_redeem") {
        session.state = STATE_PROFILE_REDEEM;
        await sendOrEdit(ctx, `{emoji:MONEY} <b>Enter your promo code:</b>`, {
          reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action" }]] }
        });
        return;
      }

      // ---- Shop ----
      if (data === "menu_shop") {
        if (!(await maintenance_check(ctx))) return;
        if (!(await check_channel_membership(ctx))) return;
        await clear_last_photo(ctx, session);
        session.state = STATE_SHOP;
        await sendOrEdit(ctx, `{emoji:GAME} <b>Shop</b>\n\nSelect a service:`, { reply_markup: get_shop_keyboard() });
        return;
      }

      if (data === "shop_back") {
        if (!(await maintenance_check(ctx))) return;
        await clear_last_photo(ctx, session);
        session.state = STATE_SHOP;
        await sendOrEdit(ctx, `{emoji:GAME} <b>Shop</b>\n\nSelect a service:`, { reply_markup: get_shop_keyboard() });
        return;
      }

      if (data === "shop_telegram") {
        await sendOrEdit(ctx, `{emoji:STARS} <b>Telegram Services</b>\n\nChoose a service:`, { reply_markup: get_telegram_shop_keyboard() });
        return;
      }

      if (data === "shop_tiktok") {
        await sendOrEdit(ctx,
          `{emoji:WARNING} <b>TikTok Top-Up</b>\n\nTikTok purchases are handled manually by our admin.\nPlease contact ${ADMIN_USERNAME} to place your order.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Contact Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
                [{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }],
              ],
            },
          }
        );
        return;
      }

      if (data === "shop_freefire") {
        await sendOrEdit(ctx, `{emoji:GAME} <b>Free Fire Middle East</b>\n\nSelect category:`, {
          reply_markup: get_freefire_sub_keyboard(),
        });
        return;
      }

      // ---- Free Fire sub-category handling ----
      if (data.startsWith("ff_sub:")) {
        const category = data.split(":")[1];
        let games = session.data.available_games || [];
        try {
          const gamesRes = await api_client.get_games();
          if (gamesRes && gamesRes.success) games = gamesRes.games || gamesRes.data || [];
        } catch (e) { logger.warn(`Failed to refresh games: ${e.message}`); }
        session.data.available_games = games;
        const ffGame = games.find(g => {
          const n = (g.name || g.title || "").toLowerCase();
          const c = (g.code || "").toLowerCase();
          return (n.includes("free fire") || n.includes("freefire") || c.includes("free_fire") || c.includes("freefire")) &&
            (n.includes("middle east") || n.includes("me"));
        });
        if (!ffGame) {
          await sendOrEdit(ctx, `{emoji:FAIL} Free Fire Middle East is currently unavailable.`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] }
          });
          return;
        }
        const gameCode = ffGame.code;
        const gameName = "Free Fire Middle East";
        session.data.game_code = gameCode;
        session.data.game_name = gameName;
        session.data.flow_type = "game";
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, `{emoji:GAME} <b>${gameName}</b>\n\nLoading ${category} packages...`);
        try {
          const res = await api_client.get_game_catalogue(gameCode);
          if (!res || !res.success) throw new Error((res && res.message) || "No catalogue returned");
          let packages = res.catalogues || res.data || [];
          
          packages = packages.filter(pkg => {
            const name = (pkg.display_name || pkg.name || pkg.title || "").toLowerCase();
            const isNumeric = /^\d+$/.test(name.trim());
            const hasDiamond = name.includes("diamond");
            
            if (category === "diamonds") {
              return (hasDiamond || isNumeric) && !name.includes("membership") && !name.includes("level") && !name.includes("pass") && !name.includes("booyah");
            } else if (category === "membership") {
              return name.includes("membership") || name.includes("booyah") || name.includes("pass");
            } else if (category === "levelup") {
              return name.includes("level up") || name.includes("levelup");
            }
            return false;
          });
          
          packages = packages.filter(pkg => {
            const cleaned = clean_freefire_package_name(
              pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || pkg.code || ""
            );
            return getFixedFFPrice(category, cleaned) !== null;
          });
          if (!packages.length) throw new Error(`No configured ${category} packages available.`);
          packages = sort_game_packages(gameCode, packages);
          if (category === "membership") {
            const order = (n) => {
              const l = String(n).toLowerCase();
              return l.includes("weekly") ? 0 : l.includes("monthly") ? 1 : l.includes("booyah") ? 2 : 99;
            };
            packages.sort((a, b) => order(clean_freefire_package_name(a.display_name || a.name || a.title || "")) -
                                  order(clean_freefire_package_name(b.display_name || b.name || b.title || "")));
          }
          const markup = await db.get_game_markup(gameCode);
          const overrides = new Map();
          for (const ov of await db.get_all_product_overrides()) {
            if (ov.price_override !== undefined && ov.price_override !== null)
              overrides.set(String(ov.id), parseFloat(ov.price_override));
          }
          packages = apply_discount_deduplication(packages);
          session.data.active_packages = packages;
          session.data.game_markup = markup;
          session.data.package_raw_names = {};
          const buttons = [];
          for (let idx = 0; idx < packages.length; idx++) {
            const pkg = packages[idx];
            let rawName = String(
              pkg.display_name || pkg.name || pkg.title ||
              pkg.catalogue_name || pkg.code || `Package ${idx + 1}`
            );
            rawName = clean_freefire_package_name(rawName);
            const productId = String(pkg.id || pkg.code || rawName);
            const apiPrice = parseFloat(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
            const override = overrides.get(`${gameCode}__${productId}`) ?? overrides.get(productId);
            const fixedPrice = getFixedFFPrice(category, rawName);
            const charged = override !== undefined
              ? override
              : (fixedPrice !== null ? fixedPrice : api_price_to_birr(apiPrice, markup));
            session.data.package_raw_names[String(idx)] = rawName;
            session.data[`pkg_price_${idx}`] = charged;
            // Use the emoji assigned to the actual Free Fire category.
            let ffEmojiKey = "FF_DIAMONDS";
            const lowerRawName = rawName.toLowerCase();
            if (category === "levelup" || lowerRawName.includes("level")) ffEmojiKey = "FF_LEVELUP";
            else if (category === "membership" || lowerRawName.includes("membership") || lowerRawName === "weekly" || lowerRawName === "monthly") ffEmojiKey = "FF_MEMBERSHIP";
            buttons.push({
              text: `${getBaseEmoji(ffEmojiKey)}${rawName} - ${Math.floor(charged)} ETB`.trim(),
              callback_data: `pkg_game:${idx}`,
              style: "primary",
            });
          }
          session.data.pkg_buttons = buttons;
          session.data.pkg_back = "shop_freefire";
          session.data.isOnePerRow = false;
          session.data.isPaginated = true;
          await render_package_page(ctx, session, 0);
        } catch (e) {
          logger.error(`Error fetching FF ${category} packages: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load ${category} packages.\n\n${e.message}`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back`, callback_data: "shop_freefire", style: "primary" }]] }
          });
        }
        return;
      }

      // ---- Gemini Pro ----
      if (data === "shop_gemini") {
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, `{emoji:GEMINI} <b>Gemini Pro</b>\n\nLoading product details...`);
        try {
          const response = await qamify_client.get_product(GEMINI_PRODUCT_ID);
          const product = response?.product || response?.data?.product || response?.data || response;
          if (!product || product.id === undefined || product.id === null || product.ok === false) {
            throw new Error(response?.message || response?.error || "Product is currently unavailable. Please try again later.");
          }
          const rawName = product.name || "Gemini Pro";
          const description = product.description || "No description available.";
          const priceInUSD = parseFloat(product.unit_price) || 0;
          const charged = priceInUSD * EXCHANGE_RATE;
          const override = await db.get_product_price_override(`gemini_${GEMINI_PRODUCT_ID}`);
          const finalPrice = override !== null ? override : 350;

          session.data.flow_type = "gemini";
          session.data.game_code = "gemini";
          session.data.game_name = rawName;
          session.data.selected_pkg_id = String(product.id);
          session.data.package_name = rawName;
          session.data.package_display_name = rawName;
          session.data.api_price = priceInUSD;
          session.data.charged_price = finalPrice;
          session.data.markup = 0;
          session.data.service_name = "Gemini Pro API";
          session.data.player_id = "GeminiOrder";
          session.data.nickname = "GeminiOrder";

          const details =
            `{emoji:GEMINI} <b>${rawName}</b>\n\n` +
            `{emoji:GEMINI_DESC} <b>Description:</b>\n${description}\n\n` +
            `{emoji:MONEY} <b>Price:</b> ${Math.floor(finalPrice)} ETB\n` +
            `{emoji:INFO} <b>Stock:</b> ${product.stock || 'N/A'}\n` +
            `{emoji:INFO} <b>Sold:</b> ${product.sold_total || 'N/A'}\n\n` +
            `Tap "Buy Now" to proceed with your order.`;

          const buy_kb = {
            inline_keyboard: [
              [{ text: `{emoji:PAY} Buy Now`, callback_data: "gemini_buy", style: "primary" }],
              [{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back", style: "danger" }],
            ],
          };
          await sendOrEdit(ctx, details, { reply_markup: buy_kb });
        } catch (e) {
          logger.error(`Error fetching Gemini: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load Gemini Pro.\n\n${e.message}`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] }
          });
        }
        return;
      }

      if (data === "gemini_buy") {
        const summary =
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
          `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${getProductLogName(session)}\n` +
          `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
          `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)}ETB\n` +
          "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          `No player ID required. After payment, your subscription will be activated.`;
        session.state = STATE_CONFIRM;
        await sendOrEdit(ctx, summary, { reply_markup: get_confirmation_keyboard() });
        return;
      }

      // ---- CapCut Pro ----
      if (data === "shop_capcut") {
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, `{emoji:CAPCUT} <b>CapCut Pro</b>\n\nLoading product details...`);
        try {
          const response = await qamify_client.get_product(CAPCUT_PRODUCT_ID);
          const product = response?.product || response?.data?.product || response?.data || response;
          if (!product || product.id === undefined || product.id === null || product.ok === false) {
            throw new Error(response?.message || response?.error || "Product is currently unavailable. Please try again later.");
          }
          const rawName = product.name || "CapCut Pro";
          const description = product.description || "No description available.";
          const priceInUSD = parseFloat(product.unit_price) || 0;
          const charged = priceInUSD * EXCHANGE_RATE;
          const override = await db.get_product_price_override(`capcut_${CAPCUT_PRODUCT_ID}`);
          const finalPrice = override !== null ? override : 550;

          session.data.flow_type = "capcut";
          session.data.game_code = "capcut";
          session.data.game_name = rawName;
          session.data.selected_pkg_id = String(product.id);
          session.data.package_name = rawName;
          session.data.package_display_name = rawName;
          session.data.api_price = priceInUSD;
          session.data.charged_price = finalPrice;
          session.data.markup = 0;
          session.data.service_name = "CapCut Pro";
          session.data.player_id = "CapCutOrder";
          session.data.nickname = "CapCutOrder";

          const details =
            `{emoji:CAPCUT} <b>${rawName}</b>\n\n` +
            `{emoji:GEMINI_DESC} <b>Description:</b>\n${description}\n\n` +
            `{emoji:MONEY} <b>Price:</b> ${Math.floor(finalPrice)} ETB\n` +
            `{emoji:INFO} <b>Stock:</b> ${product.stock || 'N/A'}\n` +
            `{emoji:INFO} <b>Sold:</b> ${product.sold_total || 'N/A'}\n\n` +
            `Tap "Buy Now" to proceed with your order.`;

          const buy_kb = {
            inline_keyboard: [
              [{ text: `{emoji:PAY} Buy Now`, callback_data: "capcut_buy", style: "primary" }],
              [{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back", style: "danger" }],
            ],
          };
          await sendOrEdit(ctx, details, { reply_markup: buy_kb });
        } catch (e) {
          logger.error(`Error fetching CapCut: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load CapCut Pro.\n\n${e.message}`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] }
          });
        }
        return;
      }

      if (data === "capcut_buy") {
        const summary =
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
          `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${getProductLogName(session)}\n` +
          `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
          `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)}ETB\n` +
          "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          `No player ID required. After payment, your subscription will be activated.`;
        session.state = STATE_CONFIRM;
        await sendOrEdit(ctx, summary, { reply_markup: get_confirmation_keyboard() });
        return;
      }

      // ---- Qamify subscription products ----
      if (data.startsWith("shop_qamify:")) {
        const key = data.split(":")[1];
        const config = QAMIFY_EXTRA_PRODUCTS[key];
        if (!config) return;
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, `{emoji:${config.emoji_key}} <b>${config.label}</b>\n\nLoading product details...`);
        try {
          let product = await qamify_client.get_product(config.product_id);

          // Some Qamify deployments expose the catalogue through /products but do not
          // resolve every numeric product ID through /products/:id. Fall back to the
          // catalogue and match the configured product name/aliases in that case.
          if (!product || (product.id === undefined && product.product_id === undefined)) {
            product = await qamify_client.find_product_by_aliases(config.aliases || [config.label]);
          }
          if (!product || (product.id === undefined && product.product_id === undefined)) {
            throw new Error("Product is currently unavailable. Please try again later.");
          }

          // Normalize alternate Qamify product-id fields so the rest of the flow
          // always uses the actual catalogue ID returned by Qamify.
          if (product.id === undefined || product.id === null) product.id = product.product_id;
          // Always retain the actual Qamify catalogue ID returned by the API.
          // This is especially important for products such as Grok whose ID may be
          // discovered from the catalogue instead of hardcoded in the config.
          config.product_id = String(product.id);
          session.data.qamify_product_id = String(product.id);
          const apiPrice = parseFloat(product.unit_price ?? product.price ?? product.amount ?? product.cost ?? 0);
          if (!Number.isFinite(apiPrice) || apiPrice <= 0) throw new Error("Invalid product price. Please try again later.");
          const qamifyOverride = await db.get_product_price_override(`qamify_${String(product.id)}`);
          const finalPrice = qamifyOverride !== null ? Number(qamifyOverride) : Math.ceil(apiPrice * EXCHANGE_RATE);
          const rawName = product.name || product.title || config.label;
          const description = product.description || "No description available.";

          session.data.flow_type = "qamify";
          session.data.qamify_key = key;
          session.data.game_code = "Qamify";
          session.data.game_name = config.label;
          session.data.service_name = config.label;
          session.data.selected_pkg_id = String(product.id);
          session.data.package_name = rawName;
          session.data.package_display_name = rawName;
          session.data.api_price = apiPrice;
          session.data.charged_price = finalPrice;
          session.data.markup = 0;
          session.data.player_id = "";
          session.data.nickname = "";

          const details =
            `{emoji:${config.emoji_key}} <b>${config.label}</b>\n\n` +
            `{emoji:GEMINI_DESC} <b>Description:</b>\n${description}\n\n` +
            `{emoji:MONEY} <b>Price:</b> ${Math.floor(finalPrice)} ETB\n` +
            `{emoji:INFO} <b>Stock:</b> ${product.stock ?? "N/A"}\n` +
            `{emoji:INFO} <b>Sold:</b> ${product.sold_total ?? "N/A"}\n\n` +
            `Tap "Buy Now" to proceed with your order.`;
          await sendOrEdit(ctx, details, { reply_markup: { inline_keyboard: [
            [{ text: `{emoji:PAY} Buy Now`, callback_data: `qamify_buy:${key}`, style: "primary" }],
            [{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back", style: "danger" }]
          ] } });
        } catch (e) {
          logger.error(`Error fetching ${config.label}: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load ${config.label}.\n\n${e.message}`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] }
          });
        }
        return;
      }

      if (data.startsWith("qamify_buy:")) {
        const key = data.split(":")[1];
        const config = QAMIFY_EXTRA_PRODUCTS[key];
        if (!config || session.data.qamify_key !== key) return;
        const summary =
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
          `{emoji:${config.emoji_key}} <b>Product:</b> ${session.data.game_name}\n` +
          `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
          `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)} ETB\n` +
          "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          `No account/player ID is required here. After payment, your subscription will be activated.`;
        session.state = STATE_CONFIRM;
        await sendOrEdit(ctx, summary, { reply_markup: get_confirmation_keyboard() });
        return;
      }

      // ---- Telegram services (Stars / Premium) ----
      if (data === "svc_telegram_stars" || data === "svc_telegram_premium") {
        const selection = data === "svc_telegram_stars" ? "stars" : "premium";
        if (selection === "premium") {
          session.data.telegram_kind = "premium";
          session.data.game_name = "Telegram Premium";
          session.data.flow_type = "telegram";
          session.data.game_code = "Telegram";
          await clear_last_photo(ctx, session);
          const premiumKeyboard = {
            inline_keyboard: [
              [{ text: `${getBaseEmoji('PREMIUM')} 1 Month - 800 ETB`.trim(), callback_data: "premium_manual_1", style: "primary" }],
              [{ text: `${getBaseEmoji('PREMIUM')} 3 Months - 2,900 ETB`.trim(), callback_data: "premium_auto_3", style: "primary" }],
              [{ text: `${getBaseEmoji('PREMIUM')} 6 Months - 3,900 ETB`.trim(), callback_data: "premium_auto_6", style: "primary" }],
              [{ text: `${getBaseEmoji('PREMIUM')} 12 Months - 6,300 ETB`.trim(), callback_data: "premium_auto_12", style: "primary" }],
              [{ text: `${getBaseEmoji('BACK')} Back to Telegram`.trim(), callback_data: "shop_telegram" }]
            ]
          };
          await sendOrEdit(ctx, `{emoji:PREMIUM} <b>Telegram Premium</b>\n\nSelect your subscription:`, { reply_markup: premiumKeyboard });
          return;
        }
        session.data.telegram_kind = selection;
        session.data.game_name = selection === "stars" ? "Telegram Stars" : "Telegram Premium";
        session.data.flow_type = "telegram";
        session.data.game_code = "Telegram";
        await clear_last_photo(ctx, session);
        const emoji = selection === "stars" ? 'STARS' : 'PREMIUM';
        await sendOrEdit(ctx, `{emoji:${emoji}} <b>${session.data.game_name}</b>\n\nLoading packages...`);
        let packages = [], markup = 0.0;
        try {
          if (selection === "stars") {
            packages = await catalog_service.get_telegram_stars_packages();
            markup = await catalog_service.get_telegram_stars_markup();
          } else {
            const realPackages = await catalog_service.get_telegram_premium_plans();

            // Keep only the G2Bulk Premium plans that we sell automatically.
            // 1 month is our manual/admin product and is added separately below.
            const autoPremiumPackages = realPackages
              .map(pkg => {
                const name = pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || "";
                const parsed = parse_telegram_name(name);
                if (!parsed || parsed[0] !== "premium") return null;
                const months = Number(parsed[1]);
                if (!TELEGRAM_PREMIUM_PRICES[months] || months === 1) return null;
                return {
                  ...pkg,
                  _premium_months: months,
                  _override_price: TELEGRAM_PREMIUM_PRICES[months],
                  _g2bulk_auto: true,
                };
              })
              .filter(Boolean);

            // Remove duplicate G2Bulk entries for the same duration.
            const seenMonths = new Set();
            const uniqueAutoPremium = autoPremiumPackages.filter(pkg => {
              if (seenMonths.has(pkg._premium_months)) return false;
              seenMonths.add(pkg._premium_months);
              return true;
            }).sort((a, b) => a._premium_months - b._premium_months);

            const virtual = {
              ...PREMIUM_1MONTH,
              _game_code: "Telegram",
              _override_price: TELEGRAM_PREMIUM_PRICES[1],
              _premium_months: 1,
              _manual_admin: true,
            };

            packages = [virtual, ...uniqueAutoPremium];
            markup = 0.0;
          }
        } catch (e) {
          logger.error(`Error fetching Telegram packages: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load plans.`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back`, callback_data: "shop_telegram" }]] }
          });
          return;
        }
        if (selection === "stars") {
          packages = packages.filter(pkg =>
            getFixedStarsPrice(pkg.display_name || pkg.name || pkg.title || "") !== null
          );
        }
        if (!packages.length) {
          await sendOrEdit(ctx, `{emoji:FAIL} No plans found.`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back`, callback_data: "shop_telegram" }]] }
          });
          return;
        }
        packages = apply_discount_deduplication(packages);
        packages = sort_telegram_packages(packages);
        session.data.active_packages = packages;
        session.data.telegram_markup = markup;
        session.data.telegram_game_code = packages[0]._game_code || "Telegram";
        session.data.package_raw_names = {};
        const keyboard_buttons = [];
        for (let idx = 0; idx < packages.length; idx++) {
          const pkg = packages[idx];
          let raw_name = pkg.display_name || pkg.name || pkg.title || "Package";
          const override = pkg._override_price;
          let birr_price;
          if (selection === "stars" && (override === undefined || override === null)) {
            const parsed = parse_telegram_name(raw_name);
            if (parsed && parsed[0] === "stars") {
              const amount = parsed[1];
              birr_price = FIXED_STARS_PRICES[amount];
              raw_name = `${amount} stars`;
            } else {
              const api_price = parseFloat(pkg.unit_price || pkg.price || pkg.amount || 0.0);
              birr_price = api_price_to_birr(api_price, markup, true);
              const numMatch = raw_name.match(/(\d+)/);
              if (numMatch) raw_name = `${numMatch[1]} stars`;
            }
          } else {
            if (override !== undefined && override !== null) birr_price = override;
            else {
              const api_price = parseFloat(pkg.unit_price || pkg.price || pkg.amount || 0.0);
              birr_price = api_price_to_birr(api_price, markup, true);
            }
            const parsed = parse_telegram_name(raw_name);
            if (parsed && parsed[0] === "premium") {
              raw_name = `${parsed[1]} ${Number(parsed[1]) === 1 ? "Month" : "Months"}`;
            } else {
              const numMatch = raw_name.match(/(\d+)/);
              if (numMatch) {
                const months = Number(numMatch[1]);
                raw_name = `${months} ${months === 1 ? "Month" : "Months"}`;
              }
            }
          }
          session.data.package_raw_names[String(idx)] = raw_name;
          const packageEmojiKey = selection === "stars" ? "STARS" : "PREMIUM";
          const display_text = `${getBaseEmoji(packageEmojiKey)}${raw_name} - ${Math.floor(birr_price)} ETB`.trim();
          session.data[`pkg_price_${idx}`] = birr_price;
          keyboard_buttons.push({
            text: display_text,
            callback_data: `pkg_idx:${idx}`,
            style: "primary",
          });
        }
        let grid = [];
        if (selection === "premium") {
          for (let i = 0; i < keyboard_buttons.length; i += 2) {
            grid.push(keyboard_buttons.slice(i, i + 2));
          }
        } else {
          for (let i = 0; i < keyboard_buttons.length; i += 2) grid.push(keyboard_buttons.slice(i, i + 2));
        }
        grid.push([
          { text: `{emoji:SUPPORT} Contact Admin for Custom`, callback_data: "contact_admin_custom" },
        ]);
        grid.push([
          { text: `{emoji:BACK} Back`, callback_data: "shop_telegram", style: "danger" },
        ]);
        session.state = STATE_SELECT_PKG;
        await sendOrEdit(ctx, `{emoji:ORDERS} <b>Select a package:</b>`, {
          reply_markup: { inline_keyboard: grid },
        });
        return;
      }

      if (data === "contact_admin_custom") {
        await sendOrEdit(ctx,
          `{emoji:INFO} For custom orders (large quantity, special requests), please contact ${ADMIN_USERNAME} directly.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Chat with Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
                [{ text: `{emoji:BACK} Back`, callback_data: "shop_telegram" }],
              ],
            },
          }
        );
        return;
      }

      // ---- Telegram Premium duration selection ----
      if (["premium_manual_1", "premium_auto_3", "premium_auto_6", "premium_auto_12"].includes(data)) {
        const months = Number(data.split("_").pop());
        const price = TELEGRAM_PREMIUM_PRICES[months];
        if (data === "premium_manual_1") {
          await sendOrEdit(ctx,
            `⚠️ <b>1 Month Telegram Premium</b>\n\nPrice: <b>${price} ETB</b>\nThis plan is handled manually by our admin.`,
            { reply_markup: { inline_keyboard: [
              [{ text: "Contact Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
              [{ text: `${getBaseEmoji('BACK')} Back to Premium`.trim(), callback_data: "svc_telegram_premium" }]
            ] } }
          );
          clearUserSession(userId);
          return;
        }

        const realPackages = await catalog_service.get_telegram_premium_plans();
        const matching = realPackages.find(pkg => {
          const name = pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || "";
          const parsed = parse_telegram_name(name);
          return parsed && parsed[0] === "premium" && Number(parsed[1]) === months;
        });
        if (!matching) {
          await sendOrEdit(ctx, `❌ ${months}-Month Telegram Premium is currently unavailable right now.`, {
            reply_markup: { inline_keyboard: [[{ text: `${getBaseEmoji('BACK')} Back to Premium`.trim(), callback_data: "svc_telegram_premium" }]] }
          });
          return;
        }
        session.data.telegram_kind = "premium";
        session.data._premium_months = months;
        session.data.game_name = "Telegram Premium";
        session.data.flow_type = "telegram";
        session.data.game_code = "Telegram";
        // Normalize the selected G2Bulk Premium package into the same session
        // fields used by the normal package-selection flow. This prevents the
        // confirmation summary from showing undefined / NaN values.
        const packageDisplayName = `${months} ${months === 1 ? "Month" : "Months"}`;
        const packageName = matching.catalogue_name || matching.display_name || matching.name || matching.title || matching.code || packageDisplayName;
        const apiPrice = Number(matching.unit_price ?? matching.price ?? matching.amount ?? matching.cost ?? 0);

        session.data.active_packages = [{
          ...matching,
          _premium_months: months,
          _override_price: price,
          _g2bulk_auto: true,
        }];
        session.data.package_raw_names = { "0": packageDisplayName };
        session.data.pkg_price_0 = price;
        session.data.selected_pkg_id = matching.id || matching.code || packageName;
        session.data.package_name = packageName;
        session.data.package_display_name = packageDisplayName;
        session.data.api_price = apiPrice;
        session.data.charged_price = Number(price);
        session.data.markup = 0;
        session.data.service_name = "Telegram Premium";
        session.data.game_name = "Telegram Premium";
        session.data.telegram_markup = 0;
        session.state = STATE_ENTER_UID;
        await sendOrEdit(ctx, `{emoji:PREMIUM} <b>${months} ${months === 1 ? "Month" : "Months"} Telegram Premium</b>\n\nPrice: <b>${price} ETB</b>\n\nEnter your Telegram username (with @):`, {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_action", style: "danger" }]] }
        });
        return;
      }

      // ---- Package selection ----
      if (data.startsWith("pkg_game:") || data.startsWith("pkg_idx:")) {
        let idx;
        if (data.startsWith("pkg_game:")) idx = parseInt(data.slice("pkg_game:".length), 10);
        else idx = parseInt(data.split(":")[1], 10);
        const packages = session.data.active_packages || [];
        if (isNaN(idx) || idx < 0 || idx >= packages.length) {
          await sendOrEdit(ctx, `{emoji:FAIL} Package unavailable.`, { reply_markup: get_main_keyboard() });
          clearUserSession(userId);
          return;
        }
        const pkg = packages[idx];
        const rawName = (session.data.package_raw_names && session.data.package_raw_names[String(idx)]) ||
          pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || "Item";
        const apiPrice = parseFloat(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
        const chargedPrice = session.data[`pkg_price_${idx}`] ??
          api_price_to_birr(apiPrice, session.data.game_markup || 0);
        session.data.selected_pkg_id = pkg.id || pkg.code || rawName;
        session.data.package_name = pkg.catalogue_name || pkg.display_name || pkg.name || pkg.title || pkg.code || rawName;
        session.data.package_display_name = rawName;
        session.data.api_price = apiPrice;
        session.data.charged_price = chargedPrice;
        session.data.markup = session.data.game_markup || 0;
        session.data.service_name = pkg.service || pkg.description || "Direct Top-Up";

        // 1-month Premium virtual package => redirect to admin
        if (pkg.is_virtual && pkg.id === 'premium_1month') {
          await sendOrEdit(ctx,
            `{emoji:WARNING} <b>1-Month Premium</b>\n\nThis plan is available only via manual purchase.\nPlease contact ${ADMIN_USERNAME} to complete your order.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "Chat with Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
                  [{ text: `{emoji:BACK} Back to Telegram`, callback_data: "shop_telegram" }],
                ],
              },
            }
          );
          clearUserSession(userId);
          return;
        }

        // 3/6/12-month Premium plans are delivered automatically by G2Bulk.
        // Only the 1-month virtual plan is redirected to the admin.

        if (session.data.flow_type === "voucher") {
          session.data.player_id = "VOUCHER";
          session.data.nickname = "VOUCHER";
          const summary =
            "━━━━━━━━━━━━━━━━━━━━━━\n" +
            `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
            `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${getProductLogName(session)}\n` +
            `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)}ETB\n` +
            "━━━━━━━━━━━━━━━━━━━━━━";
          session.state = STATE_CONFIRM;
          await sendOrEdit(ctx, summary, { reply_markup: get_confirmation_keyboard() });
          return;
        }

        // For normal game flows, ask for player ID or username
        session.state = STATE_ENTER_UID;
        const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] };
        const prompt = session.data.flow_type === "telegram"
          ? `{emoji:USER} <b>Enter your Telegram username</b> (with @) for <b>${rawName}</b>:\n<i>Your username will be verified.</i>`
          : `{emoji:USER} <b>Enter your player ID</b> for <b>${rawName}</b>:\n<i>Your player ID will be verified before payment.</i>`;
        await sendOrEdit(ctx, prompt, { reply_markup: cancel_kb });
        return;
      }

      // ---- Order confirmation ----
      if (data === "order_confirm") {
        session.state = STATE_PAYMENT_METHOD;
        await sendOrEdit(ctx, `{emoji:WALLET} <b>Choose a payment method</b>`, {
          reply_markup: get_order_payment_keyboard(),
        });
        return;
      }

      if (data.startsWith("pay_method:")) {
        const method = data.split(":")[1];
        session.data.pay_method = method;
        if (method === "wallet") {
          const profile = await db.get_user_profile(userId);
          const balance = profile.balance || 0.0;
          const charged_price = session.data.charged_price || 0.0;
          if (balance < charged_price) {
            await sendOrEdit(ctx, `{emoji:FAIL} <b>Insufficient Balance</b>\nRequired: ${Math.floor(charged_price)}ETB\nYour Balance: ${Math.floor(balance)}ETB`, { reply_markup: get_main_keyboard() });
            clearUserSession(userId);
            return;
          }
          await sendOrEdit(ctx, " Processing order...");
          await place_order_flow(ctx, session, db, api_client, bot, "wallet");
          return;
        } else {
          const methodInfo = PAYMENT_METHODS[method];
          if (!methodInfo) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid payment method.`); return; }
          const charged_price = session.data.charged_price || 0.0;
          let caption, image_to_send;
          if (method === "telebirr") {
            caption =
              `{emoji:PAY} Payment Instructions\n\n` +
              `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
              `{emoji:TELEBIRR} TeleBirr Account ⬇️ \n\n` +
              `📱 Number: ${methodInfo.account}\n` +
              `👤 Name: ${methodInfo.name}\n` +
              `{emoji:MONEY} Amount: ${Math.floor(charged_price)} Birr\n\n` +
              `━━━━━━━━━━━━━━━\n\n` +
              `⏰ Please complete your payment within 15 minutes.\n\n` +
              `⚠️ By Continuing, you agree to our Terms and Conditions.\n\n` +
              `━━━━━━━━━━━━━━━\n\n` +
              `📌 How to Find Your Transaction Number\n\n` +
              `1. Open your Telebirr receipt\n` +
              `2. Look for 'Transaction Number'\n` +
              `3. Copy it carefully\n\n` +
              `📨Now send your Transaction Number or the messsage sent from Telebirr.\n\n` +
              `Example: ABC123456789\n\n` +
              `⚠️ Do NOT send screenshot, send only the Transaction Number.`;
            image_to_send = IMG_TRANSACTION_ID;
          } else if (method === "cbe") {
            caption =
              `{emoji:PAY} Payment Instructions\n\n` +
              `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
              `{emoji:CBE} CBE Account ⬇️ \n\n` +
              `📱 Account: ${methodInfo.account}\n` +
              `👤 Name: ${methodInfo.name}\n` +
              `{emoji:MONEY} Amount: ${Math.floor(charged_price)} Birr\n\n` +
              `━━━━━━━━━━━━━━━\n\n` +
              `⏰ After sending, send your <b>Transaction ID</b> first.\n` +
              `If you have a link that looks like https://mbreceipt.cbe.com.et/... paste the link and send your last 8 digits of your CBE account.`;
            image_to_send = IMG_TRANSACTION_ID;
          } else {
            caption =
              `{emoji:PAY} Payment Instructions\n\n` +
              `{emoji:PREMIUM} ${session.data.package_display_name || session.data.package_name}\n` +
              `{emoji:${method.toUpperCase()}} ${methodInfo.label} Account ⬇️ \n\n` +
              `📱 Account: ${methodInfo.account}\n` +
              `👤 Name: ${methodInfo.name}\n` +
              `{emoji:MONEY} Amount: ${Math.floor(charged_price)} Birr\n\n` +
              `━━━━━━━━━━━━━━━\n\n` +
              `⏰ After sending, please provide the transaction reference number.\n` +
              `Your order will be processed after manual confirmation by admin.`;
            image_to_send = IMG_TRANSACTION_ID;
          }
          // Create the product order as pending immediately, while the bot is waiting
          // for the transaction reference. This makes it visible in Pending Payments
          // before the user submits the reference.
          if (!session.data.pending_order_id) {
            const pendingOrderId = await db.create_order(
              userId,
              session.data.game_name || session.data.service_name || "Product",
              session.data.package_display_name || session.data.package_name || "",
              Number(session.data.api_price || 0),
              Number(charged_price || 0),
              "pending_payment",
              ""
            );
            session.data.pending_order_id = pendingOrderId;
            await db.update_order(pendingOrderId, {
              payment_method: method,
              payment_stage: "waiting_reference",
              game_code: session.data.game_code || session.data.telegram_game_code || "Telegram",
              selected_pkg_id: session.data.selected_pkg_id || "",
              player_id: session.data.player_id || "",
              server_id: session.data.server_id || null,
              flow_type: session.data.flow_type || "game",
              service_name: session.data.service_name || "",
              game_name: session.data.game_name || session.data.service_name || "Product",
              package_display_name: session.data.package_display_name || session.data.package_name || ""
            });
            // ====== CHANGED: Use the new pending format ======
            const maskLogUserId = (value) => {
              const id = String(value || "");
              if (id.length <= 6) return id;
              return `${id.slice(0, 3)}****${id.slice(-3)}`;
            };
            const maskLogOrderCode = (value) => {
              const code = String(value || "");
              if (code.length <= 5) return code;
              return `${code.slice(0, 3)}***${code.slice(-2)}`;
            };
            const logProductName = session.data.package_display_name || session.data.package_name || session.data.game_name || session.data.service_name || "Product";
            const logOrderCode = pendingOrderId || "";
            await report_event(bot,
              `{emoji:PENDING_PAYMENT} <b>New Pending Order!</b>\n\n` +
              `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${logProductName}\n\n` +
              `       {emoji:USER} <b>By:</b> <code>${maskLogUserId(userId)}</code>\n` +
              `       {emoji:ORDERS} <b>Order Code:</b> <code>${maskLogOrderCode(logOrderCode)}</code>\n` +
              `       {emoji:MONEY} <b>Total:</b> ${Number(charged_price || 0).toFixed(2)} ETB\n\n` +
              `{emoji:STATUS} <b>Status:</b> Pending Payment`
            );
            // ====== END OF CHANGE ======
          }
          session.state = STATE_PAYMENT_TXN_ID;
          const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]] };
          await clear_last_photo(ctx, session);
          await sendOrEditPhoto(ctx, image_to_send, caption, { reply_markup: cancel_kb });
          return;
        }
      }

      if (data === "order_cancel") {
        const pendingOrderId = session.data.pending_order_id;
        if (pendingOrderId) {
          try {
            await db.update_order(pendingOrderId, {
              status: "cancelled",
              payment_stage: "cancelled",
              cancelled_at: new Date().toISOString()
            });
            await report_event(bot,
              `{emoji:CANCEL} <b>Pending Order Cancelled</b>\n` +
              `{emoji:ORDERS} Order: <code>${pendingOrderId}</code>\n` +
              `{emoji:USER} User ID: <code>${userId}</code>`
            );
          } catch (e) { logger.warn(`Could not mark order cancelled: ${e.message}`); }
        }
        await clear_last_photo(ctx, session);
        clearUserSession(userId);
        delete verify_attempts[userId];
        await ctx.answerCbQuery("Order cancelled.").catch(() => {});
        await sendMainMenu(ctx, db);
        return;
      }

      if (data === "order_back") {
        await clear_last_photo(ctx, session);
        session.state = STATE_ENTER_UID;
        const package_name = session.data.package_display_name || session.data.package_name || "package";
        const prompt = session.data.flow_type === "telegram"
          ? `{emoji:USER} Enter your Telegram username (with @) for ${package_name}:`
          : `{emoji:USER} Enter your player ID for ${package_name}:`;
        const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] };
        await sendOrEdit(ctx, prompt, { reply_markup: cancel_kb });
        return;
      }

      // ---- Wallet (Deposit) ----
      if (data === "menu_wallet") {
        if (!(await maintenance_check(ctx))) return;
        if (!(await check_channel_membership(ctx))) return;
        await register_user_implicit(ctx, db, bot);
        await clear_last_photo(ctx, session);
        const profile = await db.get_user_profile(userId);
        const balance = profile ? profile.balance || 0 : 0;
        const msg = `{emoji:WALLET} <b>Your Wallet</b>\n\n` +
          `{emoji:MONEY} <b>Balance:</b> ${Math.floor(balance)} ETB\n\n` +
          `Select a deposit method to add funds:`;
        await sendOrEdit(ctx, msg, { reply_markup: get_wallet_keyboard() });
        return;
      }

      if (data.startsWith("dep_method:")) {
        const method = data.split(":")[1];
        session.data.dep_method = method;
        session.state = STATE_DEPOSIT_AMOUNT;
        const methodInfo = PAYMENT_METHODS[method];
        const title = `{emoji:DEPOSIT} <b>Deposit via ${methodInfo.label}</b>`;
        const text =
          `${title}\n\n` +
          `Please enter the amount (in ETB) you wish to deposit.\n` +
          `Minimum: <b>${MIN_DEPOSIT_BIRR} ETB</b>\n` +
          `Maximum: <b>${appSettings.MAX_DEPOSIT_LIMIT} ETB</b>`;
        const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] };
        await sendOrEdit(ctx, text, { reply_markup: cancel_kb });
        return;
      }

      // ---- Orders ----
      if (data === "menu_orders") {
        const orders = await db.get_user_orders(userId, 5);
        let text;
        if (!orders.length) {
          text = `{emoji:ORDERS} <b>No orders yet.</b>`;
        } else {
          text = `{emoji:ORDERS} <b>Last 5 Orders:</b>\n\n`;
          for (const order of orders) {
            text +=
              `{emoji:ORDERS} <b>Order ID:</b> <code>${order.order_id}</code>\n` +
              `{emoji:GAME} <b>Product:</b> ${order.game}\n` +
              `{emoji:MONEY} <b>Package:</b> ${order.package_name}\n` +
              `{emoji:MONEY} <b>Charged:</b> ${Math.floor(order.charged_price)} ETB\n` +
              `{emoji:STATUS} <b>Status:</b> ${order.status}\n` +
              `{emoji:CALENDAR} <b>Date:</b> ${(order.created_at || "").slice(0, 10)}\n` +
              "━━━━━━━━━━━━━━━━━━━━━━\n";
          }
        }
        await sendNewMessage(ctx, text, { reply_markup: { inline_keyboard: [[{ text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" }]] } });
        return;
      }

      // ---- Support ----
      if (data === "menu_support") {
        clearUserSession(userId);
        const help_msg =
          `{emoji:SUPPORT} <b>Support & Help</b>\n\n` +
          "<b> Quick start:</b>\n" +
          "1. Use the <b>inline buttons</b> to navigate.\n" +
          "2. Most flows guide you step by step — just follow the prompts.\n\n" +
          `{emoji:MONEY} <b>Deposit:</b>\n` +
          "1. Tap <b>Wallet</b> then choose a deposit method.\n" +
          "2. Enter the amount (min 50 ETB).\n" +
          "3. Send the money to the provided account.\n" +
          "4. After paying, <b>type the Transaction ID</b> (Telebirr) or <b>Transaction Link</b> (CBE).\n" +
          "5. Once verified, the ETB is added to your balance.\n\n" +
          `{emoji:GAME} <b>Buy Services:</b>\n` +
          "1. Tap <b>Shop</b> and select a service.\n" +
          "2. Choose your package.\n" +
          "3. Enter your player ID or username.\n" +
          "4. Confirm and pay using Wallet or Bank.\n\n" +
          `{emoji:USER} <b>Referral:</b>\n` +
          `Tap Referral in Profile to get your invite link. Each friend earns you ${REFERRAL_REWARD} ETB instantly.\n\n` +
          `Need more help? Contact ${ADMIN_USERNAME}`;
        await sendOrEdit(ctx, help_msg, { reply_markup: get_support_keyboard() });
        return;
      }

      // ---- Admin panel callbacks ----
      if (ADMIN_CHAT_IDS.includes(userId)) {
        // Approve/reject deposit
        if (data.startsWith("admin_approve_dep:")) {
          const deposit_id = data.split(":")[1];
          const success = await db.approve_deposit(deposit_id);
          if (success) {
            const deposit = await db.get_deposit_by_id(deposit_id);
            try { await bot.telegram.sendMessage(deposit.user_id, `✅ Deposit of ${Math.floor(deposit.amount)} ETB approved!`, { parse_mode: "HTML" }); } catch (_) {}
            await sendOrEdit(ctx, `{emoji:SUCCESS} Deposit ${format_deposit_id(deposit_id)} approved.`);
            await report_event(bot, `{emoji:SUCCESS} <b>Deposit Approved</b>\n{emoji:USER} User ID: <code>${deposit.user_id}</code>\n{emoji:MONEY} Amount: ${Math.floor(deposit.amount)} ${deposit.currency || "ETB"}\n{emoji:TELEBIRR} Method: ${deposit.method || "?"}\n Deposit: <code>${format_deposit_id(deposit_id)}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a>`);
            await ctx.answerCbQuery(` Deposit ${format_deposit_id(deposit_id)} approved`, { show_alert: true });
          } else {
            await ctx.answerCbQuery(" Deposit not found or already processed", { show_alert: true });
          }
          return;
        }

        if (data.startsWith("admin_decline_dep:")) {
          const deposit_id = data.split(":")[1];
          pending_decline[`dep_${deposit_id}`] = true;
          await sendOrEdit(ctx, `{emoji:INFO} Reply to this message with the reason for declining deposit ${format_deposit_id(deposit_id)}:`);
          await report_event(bot, `{emoji:CANCEL} <b>Deposit Declined</b> (pending reason)\n Deposit: <code>${format_deposit_id(deposit_id)}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a>`);
          await ctx.answerCbQuery(` Reply with reason to decline deposit ${format_deposit_id(deposit_id)}`, { show_alert: true });
          return;
        }

        // Approve/reject withdrawal
        if (data.startsWith("admin_approve_wth:")) {
          const w_id = data.split(":")[1];
          const success = await db.approve_withdrawal(w_id, "", userId);
          if (success) {
            const w = await db.get_withdrawal_by_id(w_id);
            try { await bot.telegram.sendMessage(w.user_id, `{emoji:SUCCESS} Withdrawal of ${Math.floor(w.amount)} ETB to ${w.account} approved!`, { parse_mode: "HTML" }); } catch (_) {}
            await sendOrEdit(ctx, `{emoji:SUCCESS} Withdrawal ${format_withdrawal_id(w_id)} approved.`);
            await report_event(bot, `{emoji:SUCCESS} <b>Withdrawal Approved</b>\n{emoji:USER} User ID: <code>${w.user_id}</code>\n{emoji:MONEY} Amount: ${Math.floor(w.amount)} ETB\n{emoji:TELEBIRR} Account: ${w.account}\n Withdrawal: <code>${format_withdrawal_id(w_id)}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)`);
            await ctx.answerCbQuery(` Withdrawal ${format_withdrawal_id(w_id)} approved`, { show_alert: true });
          } else {
            await ctx.answerCbQuery(" Withdrawal not found or already processed", { show_alert: true });
          }
          return;
        }

        if (data.startsWith("admin_decline_wth:")) {
          const w_id = data.split(":")[1];
          pending_decline[`wth_${w_id}`] = true;
          await report_event(bot, `{emoji:FAIL} <b>Withdrawal Declined</b> (pending reason)\n Withdrawal: <code>${format_withdrawal_id(w_id)}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)`);
          await sendOrEdit(ctx, `{emoji:INFO} Reply to this message with the reason for declining withdrawal ${format_withdrawal_id(w_id)}:`);
          await ctx.answerCbQuery(` Reply with reason to decline withdrawal ${format_withdrawal_id(w_id)}`, { show_alert: true });
          return;
        }

        // Admin navigation
        if (data === "admin_dashboard") {
          const stats = await db.get_dashboard_stats();
          const dashboard_text =
            `{emoji:INFO} <b>Dashboard</b>\n\n` +
            `{emoji:USER} Total Users: ${stats.total_users}\n` +
            `{emoji:MONEY} Total Deposits: ${stats.total_deposits} (Amount: ${Math.floor(stats.total_deposit_amount)} ETB)\n` +
            `{emoji:CLOCK} Pending Deposits: ${stats.pending_deposits}\n` +
            `{emoji:MONEY} Total Withdrawals: ${stats.total_withdrawals} (Amount: ${Math.floor(stats.total_withdrawal_amount)} ETB)\n` +
            `{emoji:CLOCK} Pending Withdrawals: ${stats.pending_withdrawals}\n` +
            `{emoji:ORDERS} Total Orders: ${stats.total_orders}\n` +
            `{emoji:MONEY} Today's Revenue: ${Math.floor(stats.revenue_today)} ETB\n` +
            `{emoji:INFO} Maintenance: ${appSettings.MAINTENANCE_MODE ? "ON" : "OFF"}`;
          await sendOrEdit(ctx, dashboard_text, { reply_markup: get_admin_keyboard() });
          return;
        }

        if (data === "admin_verified_txns") {
          const txns = await db.get_verified_transactions(30);
          if (!txns.length) {
            await sendOrEdit(ctx, `{emoji:INFO} <b>Verified Transactions</b>\n\nNo verified transactions found.`, { reply_markup: get_admin_keyboard() });
            return;
          }
          let text = `{emoji:SUCCESS} <b>Verified Transactions</b>\n\n`;
          txns.forEach((txn, i) => {
            const ref = String(txn.transaction_id || txn.id || "-");
            const user = String(txn.user_id || "-");
            const amount = Number(txn.amount || 0);
            const method = txn.method ? ` | ${txn.method}` : "";
            const kind = txn.type ? ` | ${txn.type}` : "";
            const date = txn.used_at ? String(txn.used_at).replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "-";
            text += `<b>${i + 1}.</b> <code>${ref}</code>\nUser: <code>${user}</code>\nAmount: <b>${Math.floor(amount)} ETB</b>${method}${kind}\nVerified: ${date}\n\n`;
          });
          await sendOrEdit(ctx, text, { reply_markup: { inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "admin_verified_txns" }], [{ text: "🔙 Back", callback_data: "admin_back" }]] } });
          return;
        }

        if (data === "admin_deposits") {
          const pending = await db.get_pending_deposits();
          if (!pending.length) {
            await sendOrEdit(ctx, `{emoji:INFO} No pending deposits.`, { reply_markup: get_admin_keyboard() });
            return;
          }
          let text = `{emoji:MONEY} <b>Pending Deposits</b>\n\n`;
          for (const dep of pending) {
            text += ` <code>${format_deposit_id(dep.id)}</code> | User: ${dep.user_id}\nAmount: ${Math.floor(dep.amount)} ETB | Method: ${dep.method}\nDate: ${(dep.created_at || "").slice(0, 10)}\n\n`;
          }
          const keyboard = pending.map((dep) => [
            { text: `Approve ${format_deposit_id(dep.id)}`, callback_data: `admin_approve_dep:${dep.id}` },
            { text: `Decline ${format_deposit_id(dep.id)}`, callback_data: `admin_decline_dep:${dep.id}` },
          ]);
          keyboard.push([{ text: "🔙 Back", callback_data: "admin_back" }]);
          await sendOrEdit(ctx, text, { reply_markup: { inline_keyboard: keyboard } });
          return;
        }

        if (data === "admin_withdrawals") {
          const pending = await db.get_pending_withdrawals();
          if (!pending.length) {
            await sendOrEdit(ctx, `{emoji:INFO} No pending withdrawals.`, { reply_markup: get_admin_keyboard() });
            return;
          }
          let text = `{emoji:MONEY} <b>Pending Withdrawals</b>\n\n`;
          for (const w of pending) {
            text += ` <code>${format_withdrawal_id(w.id)}</code> | User: ${w.user_id}\nAmount: ${Math.floor(w.amount)} ETB | Account: ${w.account}\nNickname: ${w.nickname} | Fee: ${Math.floor(w.fee || 0)} ETB\nDate: ${(w.created_at || "").slice(0, 10)}\n\n`;
          }
          const keyboard = pending.map((w) => [
            { text: `Approve ${format_withdrawal_id(w.id)}`, callback_data: `admin_approve_wth:${w.id}` },
            { text: `Decline ${format_withdrawal_id(w.id)}`, callback_data: `admin_decline_wth:${w.id}` },
          ]);
          keyboard.push([{ text: "🔙 Back", callback_data: "admin_back" }]);
          await sendOrEdit(ctx, text, { reply_markup: { inline_keyboard: keyboard } });
          return;
        }

        if (data === "admin_promo") {
          await sendOrEdit(ctx, `{emoji:MONEY} <b>Promo Codes Management</b>`, { reply_markup: get_admin_promo_keyboard() });
          return;
        }

        if (data === "admin_promo_create") {
          session.state = STATE_ADMIN_CREATE_CODE;
          await sendOrEdit(ctx, `{emoji:ADD} <b>Create Promo Code</b>\n\nFormat: <code>amount [max_uses] [code]</code>`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] }
          });
          return;
        }

        if (data === "admin_promo_list") {
          const codes = await db.list_promo_codes();
          let text;
          if (!codes.length) text = `{emoji:INFO} No active promo codes.`;
          else {
            text = `{emoji:MONEY} <b>Active Promo Codes</b>\n\n`;
            for (const c of codes) text += `<code>${c.code}</code>: ${Math.floor(c.amount)} ETB | ${c.used_count}/${c.max_uses} used\n`;
          }
          await sendOrEdit(ctx, text, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] } });
          return;
        }

        if (data === "admin_promo_delete") {
          session.state = STATE_ADMIN_DELETE_CODE;
          await sendOrEdit(ctx, `{emoji:DELETE} <b>Delete Promo Code</b>\n\nReply with the code (or use /delcode):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] }
          });
          return;
        }

        if (data === "admin_broadcast") {
          session.state = STATE_ADMIN_BROADCAST;
          await sendOrEdit(ctx, `{emoji:MEGAPHONE} <b>Broadcast Message</b>\n\nReply with the message you want to send to all users:`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] }
          });
          return;
        }

        if (data === "admin_referral") {
          session.state = STATE_ADMIN_REFERRAL_INPUT;
          await sendOrEdit(ctx, `{emoji:USER} <b>Referral Lookup</b>\n\nEnter the user's Telegram ID:`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] }
          });
          return;
        }

        if (data === "admin_search_by_id") {
          await sendOrEdit(ctx, `{emoji:SEARCH} <b>Search by ID</b>\n\nSelect the type:`, { reply_markup: get_search_by_id_keyboard() });
          return;
        }

        if (data.startsWith("admin_search_id:")) {
          const search_type = data.split(":")[1];
          session.data.admin_search_type = search_type;
          session.state = STATE_ADMIN_SEARCH_BY_ID;
          await sendOrEdit(ctx, `{emoji:SEARCH} <b>Search ${search_type.toUpperCase()}</b>\n\nEnter the ID (any format):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_search_by_id" }]] }
          });
          return;
        }

        if (data === "admin_settings") {
          await sendOrEdit(ctx, `{emoji:SETTINGS} <b>Settings & Tools</b>`, { reply_markup: get_admin_settings_keyboard() });
          return;
        }

        if (data === "admin_user_manage") {
          await sendOrEdit(ctx, `{emoji:USER} <b>User Management</b>`, { reply_markup: get_user_manage_keyboard() });
          return;
        }

        if (data === "admin_ban") {
          session.state = STATE_ADMIN_BAN;
          await sendOrEdit(ctx, `{emoji:BAN} <b>Ban User</b>\n\nEnter the user's Telegram ID:`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_user_manage" }]] }
          });
          return;
        }

        if (data === "admin_unban") {
          session.state = STATE_ADMIN_UNBAN;
          await sendOrEdit(ctx, `{emoji:UNBAN} <b>Unban User</b>\n\nEnter the user's Telegram ID:`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_user_manage" }]] }
          });
          return;
        }

        if (data === "admin_set_balance") {
          session.state = STATE_ADMIN_SETBALANCE;
          await sendOrEdit(ctx, `{emoji:MONEY} <b>Set Balance</b>\n\nEnter: <code>user_id amount</code>`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_user_manage" }]] }
          });
          return;
        }

        // ---- Admin Game Management ----
        if (data === "admin_game_products") {
          let games = [];
          try {
            const gamesRes = await api_client.get_games();
            games = gamesRes && gamesRes.success ? gamesRes.games || gamesRes.data || [] : [];
          } catch (e) { logger.error(`Failed to fetch games for admin: ${e.message}`); }
          session.data.admin_games = games;
          const buttons = [];
          const ffGame = games.find(g => {
            const n = (g.name || "").toLowerCase();
            const c = (g.code || "").toLowerCase();
            return (n.includes("free fire") || n.includes("freefire") || c.includes("free_fire") || c.includes("freefire")) &&
              (n.includes("middle east") || n.includes("me"));
          });
          if (ffGame) {
            const code = ffGame.code;
            const name = ffGame.name || "Free Fire ME";
            buttons.push([
              { text: `🔥 ${name}`, callback_data: `admin_game_select:${code}` },
            ]);
          } else {
            buttons.push([
              { text: "🔥 Free Fire ME (Not found)", callback_data: "admin_back" },
            ]);
          }
          buttons.push([
            { text: `{emoji:GEMINI} Gemini Pro Price`, callback_data: "admin_gemini_price" },
          ]);
          buttons.push([
            { text: `{emoji:CAPCUT} CapCut Pro Price`, callback_data: "admin_capcut_price" },
          ]);
          buttons.push([
            { text: `{emoji:PREMIUM} 1-Month Premium Price`, callback_data: "admin_1month_price" },
          ]);
          buttons.push([
            { text: "Subscription Prices", callback_data: "admin_qamify_prices" },
          ]);
          buttons.push([
            { text: "Global Games Markup", callback_data: "admin_global_markup" },
          ]);
          buttons.push([{ text: "🔙 Back", callback_data: "admin_settings" }]);
          await sendOrEdit(ctx, `{emoji:GAME} <b>Game Products Management</b>\n\nManage Free Fire ME, Gemini Pro, CapCut Pro, and 1-Month Premium prices.`, {
            reply_markup: { inline_keyboard: buttons },
          });
          return;
        }

        // Admin price handlers
        if (data === "admin_gemini_price") {
          session.state = STATE_ADMIN_GEMINI_PRICE;
          const currentPrice = await db.get_product_price_override(`gemini_${GEMINI_PRODUCT_ID}`);
          const currentDisplay = currentPrice !== null ? `${currentPrice} ETB` : '350 ETB';
          await sendOrEdit(ctx, `{emoji:GEMINI} <b>Gemini Pro Price</b>\n\nCurrent override: <b>${currentDisplay}</b>\n\nEnter new price in ETB (enter 0 to remove override):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_game_products" }]] }
          });
          return;
        }

        if (data === "admin_capcut_price") {
          session.state = STATE_ADMIN_CAPCUT_PRICE;
          const currentPrice = await db.get_product_price_override(`capcut_${CAPCUT_PRODUCT_ID}`);
          const currentDisplay = currentPrice !== null ? `${currentPrice} ETB` : '550 ETB';
          await sendOrEdit(ctx, `{emoji:CAPCUT} <b>CapCut Pro Price</b>\n\nCurrent override: <b>${currentDisplay}</b>\n\nEnter new price in ETB (enter 0 to remove override):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_game_products" }]] }
          });
          return;
        }

        if (data === "admin_1month_price") {
          session.state = STATE_ADMIN_1MONTH_PRICE;
          const currentPrice = await db.get_product_price_override('premium_1month');
          const currentDisplay = currentPrice !== null ? `${currentPrice} ETB` : `Default (${PREMIUM_1MONTH.price} ETB)`;
          await sendOrEdit(ctx, `{emoji:PREMIUM} <b>1-Month Premium Price</b>\n\nCurrent override: <b>${currentDisplay}</b>\n\nEnter new price in ETB (enter 0 to remove override):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_game_products" }]] }
          });
          return;
        }

        if (data === "admin_qamify_prices") {
          const keys = ["nordvpn", "notion", "leonardo_ai", "netflix", "amazon_prime", "grok"];
          const buttons = [];
          session.data.admin_qamify_products = {};
          try {
            for (const key of keys) {
              const config = QAMIFY_EXTRA_PRODUCTS[key];
              if (!config) continue;
              let product = null;
              if (config.product_id) product = await qamify_client.get_product(config.product_id);
              if (!product || (product.id === undefined && product.product_id === undefined)) {
                product = await qamify_client.find_product_by_aliases(config.aliases || [config.label]);
              }
              if (!product || (product.id === undefined && product.product_id === undefined)) continue;
              const productId = String(product.id ?? product.product_id);
              // Cache the real catalogue ID so Grok and other dynamically resolved
              // Qamify products always have a concrete product ID available.
              config.product_id = productId;
              const name = product.name || product.title || config.label;
              const apiPrice = parseFloat(product.unit_price ?? product.price ?? product.amount ?? product.cost ?? 0);
              const override = await db.get_product_price_override(`qamify_${productId}`);
              const current = override !== null ? override : Math.ceil(apiPrice * EXCHANGE_RATE);
              session.data.admin_qamify_products[key] = { id: productId, name, api_price: apiPrice };
              buttons.push([{ text: `${getBaseEmoji(config.emoji_key)} ${name} - ${Math.floor(current)} ETB`.trim(), callback_data: `admin_qamify_price:${key}` }]);
            }
          } catch (e) {
            logger.warn(`Failed to load Qamify prices: ${e.message}`);
          }
          buttons.push([{ text: "🔙 Back", callback_data: "admin_game_products" }]);
          await sendOrEdit(ctx, "<b>Subscription Product Prices</b>\n\nSelect a product to change its selling price:", { reply_markup: { inline_keyboard: buttons } });
          return;
        }

        if (data.startsWith("admin_qamify_price:")) {
          const key = data.slice("admin_qamify_price:".length);
          const product = session.data.admin_qamify_products?.[key];
          const config = QAMIFY_EXTRA_PRODUCTS[key];
          if (!product || !config) { await sendOrEdit(ctx, "{emoji:FAIL} Product unavailable."); return; }
          session.data.admin_qamify_price_key = key;
          session.data.admin_qamify_price_product_id = String(product.id);
          session.state = STATE_ADMIN_QAMIFY_PRICE_INPUT;
          const current = await db.get_product_price_override(`qamify_${product.id}`);
          const apiDefault = Math.ceil(Number(product.api_price || 0) * EXCHANGE_RATE);
          const display = current !== null ? `${Math.floor(current)} ETB` : `${apiDefault} ETB (default)`;
          await sendOrEdit(ctx, `${getBaseEmoji(config.emoji_key)} <b>${product.name}</b>\n\nCurrent price: <b>${display}</b>\n\nEnter new selling price in ETB. Enter <code>0</code> to remove the override.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_qamify_prices" }]] } });
          return;
        }

        if (data === "admin_global_markup") {
          session.state = STATE_ADMIN_GLOBAL_MARKUP;
          await sendOrEdit(ctx, `{emoji:MONEY} <b>Global Games Markup</b>\n\nCurrent global markup: <b>${appSettings.DEFAULT_MARKUP_PERCENT}%</b>\n\nEnter new global markup percentage (e.g., 15):`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_game_products" }]] }
          });
          return;
        }

        if (data.startsWith("admin_game_select:")) {
          const code = data.slice("admin_game_select:".length);
          const game = (session.data.admin_games || []).find(g => normalize_game_code(g) === code);
          const name = game ? game_display_name(game) : code;
          session.data.admin_game_code = code;
          session.data.admin_game_name = name;
          const currentMarkup = await db.get_game_markup(code);
          const kb = {
            inline_keyboard: [
              [{ text: "Set Game Markup", callback_data: "admin_game_set_markup" }],
              [{ text: "Set Package Price", callback_data: "admin_game_set_price" }],
              [{ text: "🔙 Back", callback_data: "admin_game_products" }],
            ],
          };
          await sendOrEdit(ctx, `{emoji:GAME} <b>${name}</b>\n\nCurrent markup: <b>${currentMarkup}%</b>\n\nChoose what to manage:`, { reply_markup: kb });
          return;
        }

        if (data === "admin_game_set_markup") {
          session.state = STATE_ADMIN_GAME_MARKUP;
          const code = session.data.admin_game_code;
          const current = await db.get_game_markup(code);
          await sendOrEdit(ctx, `Enter markup percentage for <b>${session.data.admin_game_name}</b>.\n\nCurrent: <b>${current}%</b>\nExample: <code>15</code>`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: `admin_game_select:${code}` }]] }
          });
          return;
        }

        if (data === "admin_game_set_price") {
          const code = session.data.admin_game_code;
          try {
            const res = await api_client.get_game_catalogue(code);
            const packages = res && res.success ? res.catalogues || res.data || [] : [];
            session.data.admin_game_packages = packages;
            const overrides = new Map();
            for (const ov of await db.get_all_product_overrides()) {
              if (ov.game_code === code && ov.price_override != null)
                overrides.set(String(ov.product_id || ov.id), parseFloat(ov.price_override));
            }
            const markup = await db.get_game_markup(code);
            const buttons = [];
            packages.forEach((pkg, idx) => {
              const id = String(pkg.id || pkg.code || pkg.name || idx);
              const base = parseFloat(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
              const cleaned = clean_freefire_package_name(pkg.display_name || pkg.name || pkg.title || id);
              const lowerCleaned = cleaned.toLowerCase();
              const inferredCategory =
                /booyah|membership|weekly|monthly/.test(lowerCleaned) ? "membership" :
                /level/.test(lowerCleaned) ? "levelup" : "diamonds";
              const fixedPrice = getFixedFFPrice(inferredCategory, cleaned);
              const price = overrides.has(id)
                ? overrides.get(id)
                : (fixedPrice !== null ? fixedPrice : api_price_to_birr(base, markup));
              buttons.push([
                { text: `${pkg.display_name || pkg.name || pkg.title || id} - ${Math.floor(price)} ETB`,
                  callback_data: `admin_game_price:${idx}` },
              ]);
            });
            buttons.push([{ text: "🔙 Back", callback_data: `admin_game_select:${code}` }]);
            await sendOrEdit(ctx, `{emoji:MONEY} <b>${session.data.admin_game_name} Packages</b>\n\nSelect a package:`, {
              reply_markup: { inline_keyboard: buttons },
            });
          } catch (e) {
            await sendOrEdit(ctx, `{emoji:FAIL} Failed to load packages.\n\n${e.message}`, {
              reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: `admin_game_select:${code}` }]] }
            });
          }
          return;
        }

        if (data.startsWith("admin_game_price:")) {
          const idx = parseInt(data.split(":")[1], 10);
          const pkg = (session.data.admin_game_packages || [])[idx];
          if (!pkg) { await sendOrEdit(ctx, `{emoji:FAIL} Package unavailable.`); return; }
          session.data.admin_game_price_index = idx;
          session.data.admin_game_price_product_id = String(pkg.id || pkg.code || pkg.name || idx);
          session.state = STATE_ADMIN_GAME_PRICE_INPUT;
          const name = pkg.display_name || pkg.name || pkg.title || "Package";
          await sendOrEdit(ctx, `Enter the selling price in ETB for <b>${name}</b>.\nEnter <code>0</code> to remove the override.`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_game_set_price" }]] }
          });
          return;
        }

        if (data === "admin_set_product_price") {
          const kb = {
            inline_keyboard: [
              [{ text: "⭐️ Telegram Stars", callback_data: "admin_price_type:stars" }],
              [{ text: "💎 Telegram Premium", callback_data: "admin_price_type:premium" }],
              [{ text: "🔙 Back", callback_data: "admin_back" }],
            ],
          };
          await sendOrEdit(ctx, "Select product type to set price:", { reply_markup: kb });
          return;
        }

        if (data.startsWith("admin_price_type:")) {
          const ptype = data.split(":")[1];
          session.data.admin_price_type = ptype;
          let packages;
          if (ptype === "stars") packages = await catalog_service.get_telegram_stars_packages();
          else packages = await catalog_service.get_telegram_premium_plans();
          if (!packages.length) {
            await sendOrEdit(ctx, "No packages found.", { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] } });
            return;
          }
          const kb_buttons = [];
          for (const pkg of packages) {
            const name = pkg.display_name || pkg.name || pkg.title || "Package";
            let price = pkg._override_price;
            if (price === undefined || price === null) {
              const api_price = parseFloat(pkg.unit_price || pkg.price || pkg.amount || 0.0);
              const markup = ptype === "stars" ? await catalog_service.get_telegram_stars_markup() : await catalog_service.get_telegram_premium_markup();
              price = api_price_to_birr(api_price, markup, true);
            }
            const product_id = pkg.id || pkg.code || pkg.name;
            kb_buttons.push([
              { text: `${name} - ${Math.floor(price)} ETB`, callback_data: `admin_price_select:${product_id}` },
            ]);
          }
          kb_buttons.push([{ text: "🔙 Back", callback_data: "admin_back" }]);
          await sendOrEdit(ctx, "Select package to set price:", { reply_markup: { inline_keyboard: kb_buttons } });
          return;
        }

        if (data.startsWith("admin_price_select:")) {
          const product_id = data.split(":")[1];
          session.data.admin_price_product_id = product_id;
          session.state = STATE_ADMIN_SET_PRICE_INPUT;
          await sendOrEdit(ctx, "Enter new price in ETB for this product (or 0 to remove override):", {
            reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_back" }]] }
          });
          return;
        }

        if (data === "admin_toggle_maintenance") {
          appSettings.MAINTENANCE_MODE = !appSettings.MAINTENANCE_MODE;
          await db.save_setting("maintenance_mode", appSettings.MAINTENANCE_MODE ? "1" : "0", appSettings);
          await sendOrEdit(ctx, `{emoji:TOGGLE} Maintenance mode has been ${appSettings.MAINTENANCE_MODE ? "ENABLED" : "DISABLED"}.`, { reply_markup: get_admin_settings_keyboard() });
          return;
        }

        if (data === "admin_toggle_reports") {
          appSettings.REPORT_EVENTS = !appSettings.REPORT_EVENTS;
          await db.save_setting("report_events", appSettings.REPORT_EVENTS ? "1" : "0", appSettings);
          await sendOrEdit(ctx, `{emoji:TOGGLE} Reports have been ${appSettings.REPORT_EVENTS ? "ENABLED" : "DISABLED"}.`, { reply_markup: get_admin_settings_keyboard() });
          return;
        }

        if (data === "admin_stars_markup") {
          session.state = STATE_ADMIN_STARS_MARKUP;
          await sendOrEdit(ctx, `{emoji:STARS} <b>Set Telegram Stars Markup</b>\n\nCurrent: <b>${Math.floor(appSettings.TELEGRAM_STARS_MARKUP)} ETB</b>\nEnter the fixed markup amount in ETB (e.g., 10) that will be added to the base price.`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_settings" }]] }
          });
          catalog_service.clear_cache();
          await catalog_service.get_telegram_catalogue(true);
          return;
        }

        if (data === "admin_premium_markup") {
          session.state = STATE_ADMIN_PREMIUM_MARKUP;
          await sendOrEdit(ctx, `{emoji:PREMIUM} <b>Set Telegram Premium Markup</b>\n\nCurrent: <b>${Math.floor(appSettings.TELEGRAM_PREMIUM_MARKUP)} ETB</b>\nEnter the fixed markup amount in ETB (e.g., 10) that will be added to the base price.`, {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_settings" }]] }
          });
          catalog_service.clear_cache();
          await catalog_service.get_telegram_catalogue(true);
          return;
        }

        if (data === "admin_back") {
          await sendOrEdit(ctx, `{emoji:INFO} <b>Admin Panel</b>`, { reply_markup: get_admin_keyboard() });
          return;
        }

        if (data === "admin_close") {
          clearUserSession(userId);
          await sendOrEdit(ctx, "Admin panel closed.");
          return;
        }
      }

      // Fallback
      await ctx.answerCbQuery("Invalid action.").catch(() => {});

    } catch (err) {
      logger.error("CRASH IN CALLBACK HANDLER: " + err.stack);
      try { await ctx.answerCbQuery(" An error occurred.").catch(() => {}); } catch (e) {}
    }
  });

  // Handle pkg_page navigation separately
  bot.on("callback_query", async (ctx) => {
    if (ctx.callbackQuery.data.startsWith("pkg_page:")) {
      const page = parseInt(ctx.callbackQuery.data.split(":")[1], 10);
      const session = getUserSession(ctx.from.id);
      await render_package_page(ctx, session, page);
      await ctx.answerCbQuery().catch(() => {});
    }
  });

  // ---- Message handler ----
  bot.on("message", async (ctx) => {
    try {
      const text = ctx.message.text ? ctx.message.text.trim() : "";
      const userId = ctx.from.id;
      const session = getUserSession(userId);

      // Admin reply for decline reasons
      if (ctx.message.reply_to_message && ADMIN_CHAT_IDS.includes(userId)) {
        const keys = Object.keys(pending_decline);
        if (keys.length) {
          const key = keys[keys.length - 1];
          const reason = text || "No reason given";
          if (key.startsWith("dep_")) {
            const depId = key.replace("dep_", "");
            const success = await db.reject_deposit(depId, reason);
            if (success) {
              const deposit = await db.get_deposit_by_id(depId);
              try { await bot.telegram.sendMessage(deposit.user_id, `❌ Deposit rejected: ${reason}`, { parse_mode: "HTML" }); } catch (_) {}
              await sendOrEdit(ctx, `{emoji:CANCEL} Deposit rejected.`);
            } else { await sendOrEdit(ctx, "Failed to reject deposit."); }
          } else if (key.startsWith("wth_")) {
            const wId = key.replace("wth_", "");
            const success = await db.reject_withdrawal(wId, reason, userId);
            if (success) {
              const w = await db.get_withdrawal_by_id(wId);
              try { await bot.telegram.sendMessage(w.user_id, `{emoji:FAIL} Withdrawal of ${Math.floor(w.amount)} ETB rejected: ${reason}`, { parse_mode: "HTML" }); } catch (_) {}
              await sendOrEdit(ctx, `{emoji:FAIL} Withdrawal rejected.`);
            } else { await sendOrEdit(ctx, "Failed to reject withdrawal."); }
          }
          delete pending_decline[key];
          return;
        }
      }

      // Admin states
      if (session.state === STATE_ADMIN_BROADCAST) {
        if (["cancel", "back"].includes(text.toLowerCase())) {
          session.state = STATE_ADMIN_MAIN;
          await sendOrEdit(ctx, `{emoji:CANCEL} Cancelled.`, { reply_markup: get_admin_keyboard() });
          return;
        }
        const users = await db.get_all_users();
        let success = 0;
        for (const uid of users) {
          try { await bot.telegram.sendMessage(uid, text); success++; } catch (_) {}
        }
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Broadcast sent to ${success}/${users.length} users.`, { reply_markup: get_admin_keyboard() });
        await report_event(bot, `{emoji:MEGAPHONE} <b>Broadcast Sent</b>\n{emoji:MAIL} Delivered: ${success}/${users.length}\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)\n\n<b>Message:</b>\n${text.slice(0, 600)}`);
        return;
      }

      if (session.state === STATE_ADMIN_CREATE_CODE) {
        const args = text.split(/\s+/);
        const amount = parseFloat(args[0]);
        if (isNaN(amount)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid amount.`); return; }
        const max_uses = args.length > 1 ? parseInt(args[1], 10) : 1;
        const code = args.length > 2 ? args[2].toUpperCase() : uuidv4().slice(0, 8).toUpperCase();
        const success = await db.create_promo_code(code, amount, max_uses);
        session.state = STATE_ADMIN_MAIN;
        if (success) {
          await sendOrEdit(ctx, `{emoji:SUCCESS} Code <b>${code}</b> created for ${Math.floor(amount)} ETB, uses: ${max_uses}`, { reply_markup: get_admin_keyboard() });
          await report_event(bot, `{emoji:MONEY} <b>Promo Code Created</b>\n{emoji:INFO} Code: <code>${code}</code>\n{emoji:MONEY} Amount: ${Math.floor(amount)} ETB\n{emoji:INFO} Max uses: ${max_uses}\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a>`);
        } else { await sendOrEdit(ctx, `{emoji:FAIL} Code already exists.`, { reply_markup: get_admin_keyboard() }); }
        return;
      }

      if (session.state === STATE_ADMIN_DELETE_CODE) {
        const code = text.toUpperCase();
        await db.delete_promo_code(code);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Code <b>${code}</b> deleted.`, { reply_markup: get_admin_keyboard() });
        await report_event(bot, `{emoji:MONEY} <b>Promo Code Deleted</b>\n{emoji:INFO} Code: <code>${code}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a>`);
        return;
      }

      if (session.state === STATE_ADMIN_REFERRAL_INPUT) {
        if (["cancel", "back"].includes(text.toLowerCase())) {
          session.state = STATE_ADMIN_MAIN;
          await sendOrEdit(ctx, `{emoji:CANCEL} Cancelled.`, { reply_markup: get_admin_keyboard() });
          return;
        }
        const targetUid = parseInt(text, 10);
        if (isNaN(targetUid)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid ID.`); return; }
        const stats = await db.get_referral_stats(targetUid);
        const referrals = await db.get_referral_list(targetUid);
        let msg = `{emoji:INFO} <b>Referral Stats for ID <code>${targetUid}</code></b>\n\n`;
        msg += `{emoji:USER} Total invited: <b>${stats.count}</b>\n`;
        msg += `{emoji:MONEY} Rewarded: <b>${stats.total_earned}</b>\n`;
        msg += `{emoji:MONEY} Total earned: <b>${Math.floor(stats.total_earned)} ETB</b>\n\n`;
        if (referrals.length) {
          msg += "<b>Recent invites:</b>\n";
          for (const r of referrals) {
            const status_icon = r.reward_given ? '{emoji:SUCCESS}' : '{emoji:CLOCK}';
            msg += ` ${status_icon} <code>${r.referred_id}</code> (${r.status}) – ${(r.created_at || "").slice(0, 10)}\n`;
          }
        } else { msg += "<i>No invites yet.</i>"; }
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, msg, { reply_markup: get_admin_keyboard() });
        return;
      }

      if (session.state === STATE_ADMIN_BAN) {
        const targetUid = parseInt(text, 10);
        if (isNaN(targetUid)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid ID.`); return; }
        await db.ban_user(targetUid);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:BAN} User <code>${targetUid}</code> banned.`, { reply_markup: get_admin_keyboard() });
        await report_event(bot, `{emoji:BAN} <b>User Banned</b>\n{emoji:USER} User ID: <code>${targetUid}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)`);
        return;
      }

      if (session.state === STATE_ADMIN_UNBAN) {
        const targetUid = parseInt(text, 10);
        if (isNaN(targetUid)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid ID.`); return; }
        await db.unban_user(targetUid);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:UNBAN} User <code>${targetUid}</code> unbanned.`, { reply_markup: get_admin_keyboard() });
        await report_event(bot, `{emoji:UNBAN} <b>User Unbanned</b>\n{emoji:USER} User ID: <code>${targetUid}</code>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)`);
        return;
      }

      if (session.state === STATE_ADMIN_SETBALANCE) {
        const parts = text.split(/\s+/);
        if (parts.length !== 2) { await sendOrEdit(ctx, `{emoji:FAIL} Format: user_id amount`); return; }
        const targetUid = parseInt(parts[0], 10);
        const amount = parseFloat(parts[1]);
        if (isNaN(targetUid) || isNaN(amount)) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid numbers.`); return; }
        await db.set_balance(targetUid, amount);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:MONEY} Balance of <code>${targetUid}</code> set to <b>${Math.floor(amount)} ETB</b>.`, { reply_markup: get_admin_keyboard() });
        await report_event(bot, `{emoji:MONEY} <b>Balance Set by Admin</b>\n{emoji:USER} User ID: <code>${targetUid}</code>\n{emoji:MONEY} New balance: <b>${Math.floor(amount)} ETB</b>\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)`);
        return;
      }

      // Admin price input handlers
      if (session.state === STATE_ADMIN_GEMINI_PRICE) {
        const price = parseFloat(text);
        if (isNaN(price) || price < 0) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid price. Enter 0 or a positive number.`); return; }
        const productId = `gemini_${GEMINI_PRODUCT_ID}`;
        if (price === 0) {
          await db.set_product_price_override(productId, null, 'gemini');
          await sendOrEdit(ctx, `{emoji:SUCCESS} Gemini Pro price override removed.`, { reply_markup: get_admin_keyboard() });
        } else {
          await db.set_product_price_override(productId, price, 'gemini');
          await sendOrEdit(ctx, `{emoji:SUCCESS} Gemini Pro price set to ${price} ETB.`, { reply_markup: get_admin_keyboard() });
        }
        session.state = STATE_ADMIN_MAIN;
        return;
      }

      if (session.state === STATE_ADMIN_CAPCUT_PRICE) {
        const price = parseFloat(text);
        if (isNaN(price) || price < 0) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid price. Enter 0 or a positive number.`); return; }
        const productId = `capcut_${CAPCUT_PRODUCT_ID}`;
        if (price === 0) {
          await db.set_product_price_override(productId, null, 'capcut');
          await sendOrEdit(ctx, `{emoji:SUCCESS} CapCut Pro price override removed.`, { reply_markup: get_admin_keyboard() });
        } else {
          await db.set_product_price_override(productId, price, 'capcut');
          await sendOrEdit(ctx, `{emoji:SUCCESS} CapCut Pro price set to ${price} ETB.`, { reply_markup: get_admin_keyboard() });
        }
        session.state = STATE_ADMIN_MAIN;
        return;
      }

      if (session.state === STATE_ADMIN_1MONTH_PRICE) {
        const price = parseFloat(text);
        if (isNaN(price) || price < 0) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid price. Enter 0 or a positive number.`); return; }
        const productId = 'premium_1month';
        if (price === 0) {
          await db.set_product_price_override(productId, null, 'premium');
          await sendOrEdit(ctx, `{emoji:SUCCESS} 1-Month Premium price override removed.`, { reply_markup: get_admin_keyboard() });
        } else {
          await db.set_product_price_override(productId, price, 'premium');
          await sendOrEdit(ctx, `{emoji:SUCCESS} 1-Month Premium price set to ${price} ETB.`, { reply_markup: get_admin_keyboard() });
        }
        session.state = STATE_ADMIN_MAIN;
        return;
      }

      if (session.state === STATE_ADMIN_QAMIFY_PRICE_INPUT) {
        const newPrice = parseFloat(text);
        if (!Number.isFinite(newPrice) || newPrice < 0) {
          await sendOrEdit(ctx, "{emoji:FAIL} Invalid price. Enter 0 or a positive ETB amount.");
          return;
        }
        const productId = session.data.admin_qamify_price_product_id;
        const key = session.data.admin_qamify_price_key;
        if (!productId || !key) {
          session.state = STATE_ADMIN_MAIN;
          await sendOrEdit(ctx, "{emoji:FAIL} Product price session expired.", { reply_markup: get_admin_keyboard() });
          return;
        }
        if (newPrice === 0) {
          await db.set_product_price_override(`qamify_${productId}`, null, "qamify");
          await sendOrEdit(ctx, "{emoji:SUCCESS} Product price override removed.", { reply_markup: get_admin_keyboard() });
        } else {
          await db.set_product_price_override(`qamify_${productId}`, newPrice, "qamify");
          await sendOrEdit(ctx, `{emoji:SUCCESS} ${QAMIFY_EXTRA_PRODUCTS[key]?.label || "Product"} price set to <b>${Math.floor(newPrice)} ETB</b>.`, { reply_markup: get_admin_keyboard() });
        }
        session.state = STATE_ADMIN_MAIN;
        return;
      }

      // Other admin states (markup, etc.)
      if (session.state === STATE_ADMIN_STARS_MARKUP) {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 0) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid number. Please enter a valid ETB amount (>= 0).`); return; }
        appSettings.TELEGRAM_STARS_MARKUP = amount;
        await db.save_setting("telegram_stars_markup", String(amount), appSettings);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Telegram Stars markup set to <b>${Math.floor(amount)} ETB</b>.`, { reply_markup: get_admin_keyboard() });
        catalog_service.clear_cache();
        await catalog_service.get_telegram_catalogue(true);
        return;
      }

      if (session.state === STATE_ADMIN_PREMIUM_MARKUP) {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 0) { await sendOrEdit(ctx, `{emoji:FAIL} Invalid number. Please enter a valid ETB amount (>= 0).`); return; }
        appSettings.TELEGRAM_PREMIUM_MARKUP = amount;
        await db.save_setting("telegram_premium_markup", String(amount), appSettings);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Telegram Premium markup set to <b>${Math.floor(amount)} ETB</b>.`, { reply_markup: get_admin_keyboard() });
        catalog_service.clear_cache();
        await catalog_service.get_telegram_catalogue(true);
        return;
      }

      if (session.state === STATE_ADMIN_GLOBAL_MARKUP) {
        const amount = parseFloat(text);
        if (!Number.isFinite(amount) || amount < 0) { await sendOrEdit(ctx, "Invalid markup. Enter a number 0 or greater."); return; }
        appSettings.DEFAULT_MARKUP_PERCENT = amount;
        await db.save_setting("DEFAULT_MARKUP_PERCENT", amount, appSettings);
        catalog_service.clear_cache();
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Global Games Markup updated to <b>${amount}%</b>.`, { reply_markup: get_admin_keyboard() });
        return;
      }

      if (session.state === STATE_ADMIN_GAME_MARKUP) {
        const amount = parseFloat(text);
        if (!Number.isFinite(amount) || amount < 0) { await sendOrEdit(ctx, "Invalid markup. Enter a number 0 or greater."); return; }
        await db.set_game_markup(session.data.admin_game_code, amount);
        catalog_service.clear_cache();
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} ${session.data.admin_game_name} markup set to <b>${amount}%</b>.`, { reply_markup: get_admin_keyboard() });
        return;
      }

      if (session.state === STATE_ADMIN_GAME_PRICE_INPUT) {
        const price = parseFloat(text);
        if (!Number.isFinite(price) || price < 0) { await sendOrEdit(ctx, "Invalid price. Enter 0 or a positive ETB amount."); return; }
        await db.set_game_product_price_override(
          session.data.admin_game_code,
          session.data.admin_game_price_product_id,
          price <= 0 ? null : price
        );
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, price <= 0 ? `{emoji:SUCCESS} Game package price override removed.` : `{emoji:SUCCESS} Game package price set to <b>${Math.floor(price)} ETB</b>.`, { reply_markup: get_admin_keyboard() });
        return;
      }

      if (session.state === STATE_ADMIN_SET_PRICE_INPUT) {
        const newPrice = parseFloat(text);
        if (isNaN(newPrice)) { await sendOrEdit(ctx, " Invalid number. Please enter a valid amount (e.g., 150)."); return; }
        const productId = session.data.admin_price_product_id;
        const ptype = session.data.admin_price_type || "stars";
        if (newPrice <= 0) {
          await db.set_product_price_override(productId, null, ptype);
          await sendOrEdit(ctx, " Price override removed for product.");
        } else {
          await db.set_product_price_override(productId, newPrice, ptype);
          await sendOrEdit(ctx, ` Price set to ${Math.floor(newPrice)} ETB for product.`);
        }
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, "Returning to admin panel.", { reply_markup: get_admin_keyboard() });
        catalog_service.clear_cache();
        await catalog_service.get_telegram_catalogue(true);
        return;
      }

      if (session.state === STATE_ADMIN_SEARCH_BY_ID) {
        const search_type = session.data.admin_search_type;
        let result_text = "";
        if (search_type === "order") {
          let order = null;
          if (/^\d+$/.test(text)) order = await db.get_order_by_numeric_id(parseInt(text, 10));
          if (!order) order = await db.get_order_by_id(text);
          if (order) {
            const uname = (await db.get_username(order.telegram_id)) || "Unknown";
            result_text =
              `{emoji:ORDERS} <b>Order Details</b>\n\n` +
              ` Order ID: <code>${order.order_id}</code>\n` +
              `{emoji:USER} User: <code>${order.telegram_id}</code> (@${uname})\n` +
              `{emoji:GAME} Game: ${order.game}\n` +
              `{emoji:ORDERS} Package: ${order.package_name}\n` +
              `{emoji:MONEY} Charged: ${Math.floor(order.charged_price)} ETB\n` +
              `{emoji:STATUS} Status: ${order.status}\n` +
              `{emoji:CALENDAR} Created: ${order.created_at}`;
          } else result_text = `{emoji:FAIL} Order not found.`;
        } else if (search_type === "deposit") {
          let deposit = null;
          if (text.toUpperCase().startsWith("EX")) {
            const parsed = parse_formatted_id(text, "deposit");
            if (parsed) deposit = await db.get_deposit_by_id(parsed);
          }
          if (!deposit && /^\d+$/.test(text)) deposit = await db.get_deposit_by_id(text);
          if (deposit) {
            const uname = (await db.get_username(deposit.user_id)) || "Unknown";
            result_text =
              `{emoji:MONEY} <b>Deposit Details</b>\n\n` +
              ` Deposit ID: <code>${format_deposit_id(deposit.id)}</code>\n` +
              `{emoji:USER} User: <code>${deposit.user_id}</code> (@${uname})\n` +
              `{emoji:MONEY} Amount: ${Math.floor(deposit.amount)} ${deposit.currency}\n` +
              `{emoji:TELEBIRR} Method: ${deposit.method}\n` +
              `{emoji:SUCCESS} Status: ${deposit.status}\n` +
              `{emoji:CALENDAR} Created: ${deposit.created_at}\n` +
              `{emoji:INFO} Admin Note: ${deposit.admin_note || "N/A"}`;
          } else result_text = `{emoji:FAIL} Deposit not found.`;
        } else if (search_type === "withdrawal") {
          let withdrawal = await db.get_withdrawal_by_id(text);
          if (!withdrawal && text.toUpperCase().startsWith("EX")) {
            const parsed = parse_formatted_id(text, "withdrawal");
            if (parsed) withdrawal = await db.get_withdrawal_by_id(parsed);
          }
          if (!withdrawal && /^\d+$/.test(text)) {
            withdrawal = await db.get_withdrawal_by_id(text);
            if (!withdrawal) withdrawal = await db.get_withdrawal_by_id(`WTH-${text}`);
          }
          if (withdrawal && Object.keys(withdrawal).length) {
            const uname = (await db.get_username(withdrawal.user_id)) || "Unknown";
            result_text =
              `{emoji:MONEY} <b>Withdrawal Details</b>\n\n` +
              ` Withdrawal ID: <code>${format_withdrawal_id(withdrawal.id)}</code>\n` +
              `{emoji:USER} User: <code>${withdrawal.user_id}</code> (@${uname})\n` +
              `{emoji:MONEY} Amount: ${Math.floor(withdrawal.amount)} ${withdrawal.currency}\n` +
              `{emoji:TELEBIRR} Account: ${withdrawal.account}\n` +
              `{emoji:USER} Nickname: ${withdrawal.nickname}\n` +
              `{emoji:MONEY} Fee: ${Math.floor(withdrawal.fee || 0)} ETB\n` +
              `{emoji:SUCCESS} Status: ${withdrawal.status}\n` +
              `{emoji:CALENDAR} Created: ${withdrawal.created_at}\n` +
              `{emoji:INFO} Admin Note: ${withdrawal.admin_note || "N/A"}`;
          } else result_text = `{emoji:FAIL} Withdrawal not found.`;
        }
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, result_text, { reply_markup: get_admin_keyboard() });
        return;
      }

      // ---- User states ----
      if (session.state === STATE_PROFILE_REDEEM) {
        if (!(await maintenance_check(ctx))) return;
        if (!(await check_channel_membership(ctx))) return;
        const result = await db.use_promo_code(text, userId);
        clearUserSession(userId);
        if (result === "success") {
          await sendOrEdit(ctx, `{emoji:SUCCESS} Promo code accepted! ETB added to your balance.`, { reply_markup: get_main_keyboard() });
        } else {
          await sendOrEdit(ctx, `{emoji:FAIL} ${result}`, { reply_markup: get_main_keyboard() });
        }
        return;
      }

      if (session.state === STATE_ENTER_UID) {
        if (!(await maintenance_check(ctx))) return;
        const flowType = session.data.flow_type || "telegram";
        let playerId = text.trim();
        if (!playerId || (flowType === "telegram" && !playerId.startsWith("@"))) {
          await sendOrEdit(
            ctx,
            flowType === "telegram" ? `{emoji:WARNING} Invalid username. Must start with @.` : `{emoji:WARNING} Please enter a valid player ID.`
          );
          return;
        }
        session.data.player_id = playerId;
        session.data.nickname = playerId;
        const gameCode = session.data.game_code || session.data.telegram_game_code || "Telegram";
        await sendOrEdit(ctx, flowType === "telegram" ? "Resolving Telegram username..." : "Verifying player ID...");
        let resolvedName = playerId.replace(/^@/, "");
        try {
          const check = await api_client.check_player_id(
            gameCode,
            playerId,
            session.data.server_id || null,
            session.data.charname || null,
          );
          let valid = false;
          if (check) {
            if (check.valid === false || check.valid === "invalid" || check.valid === "false" ||
              check.success === false || check.success === "false" || check.error) {
              valid = false;
            } else if (
              check.valid === true || check.valid === "valid" || check.valid === "true" ||
              check.success === true || check.success === "true" || check.success === "ok"
            ) {
              valid = true;
            } else if (check.name || check.nickname || check.username || check.player_name ||
              (check.user && check.user.name)) {
              valid = true;
            } else if (
              check.success === undefined && check.valid === undefined &&
              check.error === undefined && check.message === undefined &&
              Object.keys(check).length > 0
            ) {
              valid = true;
            }
          }
          if (!valid && flowType !== "gemini" && flowType !== "capcut" && flowType !== "telegram") {
            await sendOrEdit(ctx, `{emoji:FAIL} ${(check && check.message) || "Player ID could not be verified."}\n\nPlease enter a valid player ID.`);
            return;
          }
          if (typeof check === "string") {
            resolvedName = check;
          } else if (typeof check === "object" && check !== null) {
            // G2Bulk may return the resolved Telegram name at different nesting
            // levels (for example data.name, data.user.name, player_name, etc.).
            // Walk the complete response so the Order Summary uses the actual
            // name returned by G2Bulk instead of the entered username.
            const findReturnedName = (obj) => {
              if (!obj || typeof obj !== "object") return null;
              const preferredKeys = [
                "name", "nickname", "player_name", "playerName",
                "display_name", "displayName", "first_name", "firstName"
              ];
              for (const key of preferredKeys) {
                const value = obj[key];
                if (typeof value === "string" && value.trim()) return value.trim();
              }
              if (typeof obj.username === "string" && obj.username.trim()) {
                return obj.username.trim();
              }
              for (const value of Object.values(obj)) {
                if (value && typeof value === "object") {
                  const found = findReturnedName(value);
                  if (found) return found;
                }
              }
              return null;
            };

            const returnedName = findReturnedName(check);
            if (returnedName) {
              resolvedName = returnedName;
            } else {
              const isJustSuccess = Object.keys(check).every(k => ["success", "valid", "status", "code"].includes(k));
              if (isJustSuccess) resolvedName = "Verified";
              else resolvedName = playerId.replace(/^@/, "");
            }
          }
        } catch (e) {
          logger.error(`Player verification failed: ${e.message}`);
          if (flowType !== "gemini" && flowType !== "capcut" && flowType !== "telegram") {
            await sendOrEdit(ctx, `{emoji:FAIL} Player verification failed. Please try again.`);
            return;
          }
        }
        // Telegram Premium summary must always use the values selected before
        // username verification. The Name is the resolved value returned by G2Bulk.
        if (flowType === "telegram" && session.data.telegram_kind === "premium") {
          session.data.game_name = "Telegram Premium";
          session.data.service_name = "Telegram Premium";
          if (!session.data.package_display_name && session.data._premium_months) {
            const m = Number(session.data._premium_months);
            session.data.package_display_name = `${m} ${m === 1 ? "Month" : "Months"}`;
          }
          if (session.data.charged_price == null || Number.isNaN(Number(session.data.charged_price))) {
            const m = Number(session.data._premium_months || 0);
            session.data.charged_price = TELEGRAM_PREMIUM_PRICES[m] ?? 0;
          }
        }
        session.data.nickname = resolvedName;
        const safeName = String(resolvedName).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const summary =
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
          `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${getProductLogName(session)}\n` +
          `{emoji:ORDERS} <b>Service:</b> ${session.data.service_name}\n` +
          `{emoji:USER} <b>Name:</b> ${safeName}\n` +
          `{emoji:USER} <b>Player ID:</b> ${playerId}\n` +
          (session.data.server_name ? `{emoji:GAME} <b>Region:</b> ${session.data.server_name}\n` : "") +
          `{emoji:MONEY} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
          `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)}ETB\n` +
          "━━━━━━━━━━━━━━━━━━━━━━";
        session.state = STATE_CONFIRM;
        await sendOrEdit(ctx, summary, { reply_markup: get_confirmation_keyboard() });
        return;
      }

      if (session.state === STATE_PAYMENT_TXN_ID || session.state === STATE_PAYMENT_CBE_SUFFIX || session.state === STATE_PAYMENT_BOA_SUFFIX) {
        const method = session.data.pay_method;
        const charged_price = session.data.charged_price || 0.0;
        let reference;
        let accountSuffix = null;
        if (session.state === STATE_PAYMENT_CBE_SUFFIX) {
          reference = String(session.data.cbe_reference || "").trim();
          accountSuffix = text.trim();
          if (!/^\d{8}$/.test(accountSuffix)) {
            await sendOrEdit(ctx, `{emoji:FAIL} Please enter exactly the last 8 digits of your CBE account number.`);
            return;
          }
        } else if (session.state === STATE_PAYMENT_BOA_SUFFIX) {
          reference = String(session.data.boa_reference || "").trim();
          accountSuffix = text.trim();
          if (!/^\d{5}$/.test(accountSuffix)) {
            await sendOrEdit(ctx, `{emoji:FAIL} Please enter exactly the last 5 digits of your Bank of Abyssinia account number.`);
            return;
          }
        } else {
          reference = text.trim();
          if (!reference) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter a valid transaction ID.`); return; }
          if (method === "cbe") {
            session.data.cbe_reference = reference;
            session.state = STATE_PAYMENT_CBE_SUFFIX;
            await sendOrEdit(ctx, `{emoji:CBE} <b>CBE account verification</b>\n\nIf you have a link that looks like https://mbreceipt.cbe.com.et/... paste the link and send your last 8 digits of your CBE account.` , { reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]] } });
            return;
          }
          if (method === "boa") {
            session.data.boa_reference = reference;
            session.state = STATE_PAYMENT_BOA_SUFFIX;
            await sendOrEdit(ctx, `{emoji:BOA} <b>Bank of Abyssinia account verification</b>\n\nNow send the <b>last 5 digits</b> of the Bank of Abyssinia account number you paid from.`, { reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]] } });
            return;
          }
        }
        if (await db.is_transaction_used(reference)) {
          await sendOrEdit(ctx, `{emoji:FAIL} This reference has already been used.`, { reply_markup: get_main_keyboard() });
          clearUserSession(userId);
          return;
        }
        const pendingPayment = {
          reference,
          user_id: userId,
          product: session.data.game_name || session.data.service_name || "Product",
          package_name: session.data.package_display_name || session.data.package_name || "",
          amount: charged_price,
          method
        };
        try {
          // The order was already created as pending while waiting for the reference.
          // Now attach the reference instead of creating a duplicate order.
          const pendingOrderId = session.data.pending_order_id;
          if (pendingOrderId) {
            await db.update_order(pendingOrderId, {
              reference,
              payment_method: method,
              payment_stage: "reference_submitted"
            });
          } else {
            session.data.pending_order_id = await db.create_order(
              userId,
              pendingPayment.product,
              pendingPayment.package_name,
              Number(session.data.api_price || 0),
              Number(charged_price || 0),
              "pending_payment",
              reference
            );
          }
          await db.create_pending_payment(pendingPayment);
          const maskLogUserId = (value) => {
            const id = String(value || "");
            if (id.length <= 6) return id;
            return `${id.slice(0, 3)}****${id.slice(-3)}`;
          };
          const maskLogOrderCode = (value) => {
            const code = String(value || "");
            if (code.length <= 5) return code;
            return `${code.slice(0, 3)}***${code.slice(-2)}`;
          };
          const logProductName = pendingPayment.package_name || pendingPayment.product || "Product";
          const logOrderCode = pendingOrderId || reference || "";
          await report_event(bot,
            `{emoji:PENDING_PAYMENT} <b>New Pending Order!</b>\n\n` +
            `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${logProductName}\n\n` +
            `       {emoji:USER} <b>By:</b> <code>${maskLogUserId(userId)}</code>\n` +
            `       {emoji:ORDERS} <b>Order Code:</b> <code>${maskLogOrderCode(logOrderCode)}</code>\n` +
            `       {emoji:MONEY} <b>Total:</b> ${Number(charged_price || 0).toFixed(2)} ETB\n\n` +
            `{emoji:STATUS} <b>Status:</b> Pending Payment`
          );
        } catch (e) { logger.warn(`Could not create pending payment: ${e.message}`); }
        await sendOrEdit(ctx, `{emoji:PENDING_PAYMENT} Verifying your payment...`);
        let result;
        if (["telebirr", "cbe", "boa"].includes(method)) {
          result = await verify_payment(reference, method, charged_price, ["cbe", "boa"].includes(method) ? { accountSuffix } : {});
        } else {
          result = { success: true, data: { amount: charged_price } };
        }
        if (result && result.success) {
          const verified_amount = result.data.amount || charged_price;
          if (verified_amount < charged_price) {
            try { await db.update_pending_payment(reference, "pending", { error: "Underpayment", last_attempt_at: new Date().toISOString() }); } catch (_) {}
            try { await db.update_order(session.data.pending_order_id, { status: "pending_payment", payment_error: "Underpayment" }); } catch (_) {}
            await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment rejected.</b>\n\nPayment amount (${Math.floor(verified_amount)} ETB) is less than the order total (${Math.floor(charged_price)} ETB).\n\nPlease try again.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: `{emoji:CANCEL} Try Again`, callback_data: "retry_payment", style: "danger" }],
                  [{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]
                ]
              }
            });
            return;
          }
          await db.record_transaction_use(reference, userId, verified_amount);
          try { await db.update_pending_payment(reference, "completed", { verified_amount }); } catch (_) {}
          try { await db.update_order(session.data.pending_order_id, { status: "processing", verified_amount }); } catch (_) {}
          await place_order_flow(ctx, session, db, api_client, bot, method, reference, verified_amount);
          return;
        } else {
          if (result && result.payment_too_old) {
            try { await db.update_pending_payment(reference, "rejected", { error: "Payment is older than 15 minutes" }); } catch (_) {}
            try { await db.update_order(session.data.pending_order_id, { status: "pending_payment", payment_error: "Payment is older than 15 minutes" }); } catch (_) {}
            delete verify_attempts[userId];
            await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment rejected.</b>\n\nThe payment is older than 15 minutes.\n\nPlease try again with a new payment/reference.`, {
              reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Try Again`, callback_data: "retry_payment", style: "danger" }]] }
            });
            return;
          }

          const attempts = (verify_attempts[userId] || 0) + 1;
          verify_attempts[userId] = attempts;
          const verificationError = result && result.error ? String(result.error).replace(/qamify/gi, "payment service").replace(/g2bulk/gi, "delivery service").replace(/verify\.et/gi, "verification service") : "Verification failed";
          const apiErrorMsg = result && result.error ? `\n<b>Reason:</b> ${result.error}` : "";

          try {
            await db.update_pending_payment(reference, "pending", {
              error: verificationError,
              last_attempt_at: new Date().toISOString()
            });
          } catch (_) {}
          try {
            await db.update_order(session.data.pending_order_id, {
              status: "pending_payment",
              payment_error: verificationError
            });
          } catch (_) {}

          delete verify_attempts[userId];
          await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment rejected.</b>${apiErrorMsg}\n\nPlease try again.`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: `{emoji:CANCEL} Try Again`, callback_data: "retry_payment", style: "danger" }],
                [{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }]
              ]
            }
          });
          return;
        }
      }

      if (session.state === STATE_DEPOSIT_AMOUNT) {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < MIN_DEPOSIT_BIRR) {
          await sendOrEdit(ctx, `{emoji:FAIL} Minimum deposit is ${MIN_DEPOSIT_BIRR} ETB.`);
          return;
        }
        if (amount > appSettings.MAX_DEPOSIT_LIMIT) {
          await sendOrEdit(ctx, `{emoji:FAIL} Maximum deposit is ${appSettings.MAX_DEPOSIT_LIMIT} ETB.`);
          return;
        }
        session.data.intended_amount = amount;
        const method = session.data.dep_method || "telebirr";
        const methodInfo = PAYMENT_METHODS[method];
        let caption;
        if (method === "telebirr") {
          caption =
            `{emoji:TELEBIRR} <b>Send ${Math.floor(amount)} ETB to:</b>\n` +
            `Name: <b>${methodInfo.name}</b>\n` +
            `Number: <code>${methodInfo.account}</code>\n\n` +
            "After the payment, reply with the <b>Transaction ID</b>.\n" +
            "Example: <code>DG56K96NIK</code>";
        } else if (method === "cbe") {
          caption =
            `{emoji:CBE} <b>Send ${Math.floor(amount)} ETB to:</b>\n` +
            `Name: <b>${methodInfo.name}</b>\n` +
            `Account: <code>${methodInfo.account}</code>\n\n` +
            "After the payment, reply with the <b>Transaction ID</b>.\n" +
            "If you have a link that looks like https://mbreceipt.cbe.com.et/... paste the link and send your last 8 digits of your CBE account.";
        } else if (method === "boa") {
          caption =
            `{emoji:BOA} <b>Send ${Math.floor(amount)} ETB to:</b>\n` +
            `Name: <b>${methodInfo.name}</b>\n` +
            (methodInfo.account ? `Account: <code>${methodInfo.account}</code>\n\n` : "") +
            "After the payment, reply with the <b>Transaction ID</b>.\n" +
            "You will then be asked for the <b>last 5 digits of your Bank of Abyssinia account number</b>.";
        } else {
          caption =
            `{emoji:${method.toUpperCase()}} <b>Send ${Math.floor(amount)} ETB to:</b>\n` +
            `Name: <b>${methodInfo.name}</b>\n` +
            `Account: <code>${methodInfo.account}</code>\n\n` +
            "After the payment, reply with the <b>Transaction ID</b>.\n" +
            "Your deposit will be manually confirmed by admin.";
        }
        const image_to_send = IMG_TRANSACTION_ID;
        session.state = STATE_DEPOSIT_TRANSACTION_ID;
        const cancel_kb = { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] };
        await clear_last_photo(ctx, session);
        await sendOrEditPhoto(ctx, image_to_send, caption, { reply_markup: cancel_kb });
        return;
      }

      if (session.state === STATE_DEPOSIT_TRANSACTION_ID || session.state === STATE_DEPOSIT_CBE_SUFFIX || session.state === STATE_DEPOSIT_BOA_SUFFIX) {
        const method = session.data.dep_method || "telebirr";
        let reference;
        let accountSuffix = null;
        if (session.state === STATE_DEPOSIT_CBE_SUFFIX) {
          reference = String(session.data.cbe_reference || "").trim();
          accountSuffix = text.trim();
          if (!/^\d{8}$/.test(accountSuffix)) {
            await sendOrEdit(ctx, `{emoji:FAIL} Please enter exactly the last 8 digits of your CBE account number.`);
            return;
          }
        } else if (session.state === STATE_DEPOSIT_BOA_SUFFIX) {
          reference = String(session.data.boa_reference || "").trim();
          accountSuffix = text.trim();
          if (!/^\d{5}$/.test(accountSuffix)) {
            await sendOrEdit(ctx, `{emoji:FAIL} Please enter exactly the last 5 digits of your Bank of Abyssinia account number.`);
            return;
          }
        } else {
          reference = text.trim();
          if (!reference) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter a valid transaction ID.`); return; }
          if (method === "cbe") {
            session.data.cbe_reference = reference;
            session.state = STATE_DEPOSIT_CBE_SUFFIX;
            await sendOrEdit(ctx, `{emoji:CBE} <b>CBE account verification</b>\n\nIf you have a link that looks like https://mbreceipt.cbe.com.et/... paste the link and send your last 8 digits of your CBE account.`, { reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] } });
            return;
          }
          if (method === "boa") {
            session.data.boa_reference = reference;
            session.state = STATE_DEPOSIT_BOA_SUFFIX;
            await sendOrEdit(ctx, `{emoji:BOA} <b>Bank of Abyssinia account verification</b>\n\nNow send the <b>last 5 digits</b> of the Bank of Abyssinia account number you paid from.`, { reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action", style: "danger" }]] } });
            return;
          }
        }
        if (await db.is_transaction_used(reference)) {
          await sendOrEdit(ctx, `{emoji:FAIL} This reference has already been used.`);
          clearUserSession(userId);
          return;
        }
        await sendOrEdit(ctx, `{emoji:PENDING_PAYMENT} Verifying your payment...`);
        const intended = session.data.intended_amount;
        let result;
        if (["telebirr", "cbe", "boa"].includes(method)) {
          result = await verify_payment(reference, method, intended, { exactAmount: true, ...(["cbe", "boa"].includes(method) ? { accountSuffix } : {}) });
        } else {
          result = { success: true, data: { amount: intended } };
        }
        if (result && result.success) {
          const amount = result.data.amount || intended;
          if (amount < MIN_DEPOSIT_BIRR) {
            await sendOrEdit(ctx, `{emoji:FAIL} Amount too low.`, { reply_markup: get_main_keyboard() });
            clearUserSession(userId);
            return;
          }
          const deposit_id = await db.create_deposit(userId, method, amount, "ETB", reference);
          if (["telebirr", "cbe", "boa"].includes(method)) {
            await db.approve_deposit(deposit_id, `Auto-approved Ref: ${reference}`);
          } else {
            for (const admin_id of ADMIN_CHAT_IDS) {
              try {
                await bot.telegram.sendMessage(
                  admin_id,
                  `{emoji:MONEY} <b>New Deposit (Manual)</b>\n` +
                  `👤 User: <a href="tg://user?id=${userId}">${ctx.from.first_name || "User"}</a> (ID: <code>${userId}</code>)\n` +
                  `{emoji:MONEY} Amount: <b>${Math.floor(amount)} ETB</b>\n` +
                  ` Method: ${method}\n Ref: <code>${reference}</code>\n` +
                  `📅 ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
                  { parse_mode: "HTML" }
                );
              } catch (_) {}
            }
            await sendOrEdit(ctx, `{emoji:INFO} Deposit request submitted for manual review. You will be notified once approved.`, { reply_markup: get_main_keyboard() });
          }
          await db.record_transaction_use(reference, userId, amount);
          delete verify_attempts[userId];
          if (["telebirr", "cbe", "boa"].includes(method)) {
            await sendOrEdit(ctx, `{emoji:SUCCESS} Payment verified! <b>${Math.floor(amount)} ETB</b> added.`);
          }
          clearUserSession(userId);
          return;
        } else {
          if (result && result.payment_too_old) {
            delete verify_attempts[userId];
            clearUserSession(userId);
            await sendOrEdit(ctx, `{emoji:FAIL} <b>Payment rejected.</b>\n\nThe payment is older than 15 minutes. Please make a new payment and submit a new transaction reference.`, { reply_markup: get_main_keyboard() });
            return;
          }
          if (result && result.server_error) {
            const apiErrorMsg = result.error ? `\n<b>Reason:</b> ${result.error}` : "";

            // If automatic verification is unavailable, create a pending deposit
            // and send it to admins for manual approval. The admin can then
            // approve/decline it using the existing deposit workflow.
            try {
              const pendingDeposit = await db.create_deposit(
                userId,
                method,
                intended,
                "ETB",
                reference
              );

              for (const admin_id of ADMIN_CHAT_IDS) {
                try {
                  await bot.telegram.sendMessage(
                    admin_id,
                    `💰 <b>Manual Deposit Approval Required</b>\n` +
                    `👤 User: <a href="tg://user?id=${userId}">${ctx.from.first_name || "User"}</a> (ID: <code>${userId}</code>)\n` +
                    `💰 Amount: <b>${Math.floor(intended)} ETB</b>\n` +
                    ` Method: ${method}\n` +
                    ` Ref: <code>${reference}</code>\n` +
                    `⚠️ Automatic verification failed because the verification API returned a server error (502).\n` +
                    `📅 ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
                    {
                      parse_mode: "HTML",
                      reply_markup: { inline_keyboard: [
                        [
                          { text: "✅ Approve", callback_data: `admin_approve_dep:${pendingDeposit}` },
                          { text: "❌ Decline", callback_data: `admin_decline_dep:${pendingDeposit}` }
                        ]
                      ] }
                    }
                  );
                } catch (adminErr) {
                  logger.error(`[DEPOSIT] Failed to send manual approval to admin ${admin_id}: ${adminErr.message}`);
                }
              }

              clearUserSession(userId);
              delete verify_attempts[userId];
              await sendOrEdit(ctx, `{emoji:WARNING} The payment API is currently down.${apiErrorMsg}\n\n<b>Your deposit has been sent for manual approval.</b> You will be notified after an admin reviews it.`, {
                reply_markup: get_main_keyboard()
              });
            } catch (manualErr) {
              logger.error(`[DEPOSIT] Failed to create manual deposit after verification API failure | user=${userId} | reference=${reference} | error=${manualErr.stack || manualErr.message}`);
              await sendOrEdit(ctx, `{emoji:WARNING} The payment API is currently down.${apiErrorMsg}\n\nPlease try again in a few minutes.`, {
                reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action" }]] }
              });
            }
            return;
          }
          const attempts = (verify_attempts[userId] || 0) + 1;
          verify_attempts[userId] = attempts;
          const apiErrorMsg = result && result.error ? `\n<b>Reason:</b> ${result.error}` : "";
          if (attempts >= 3) {
            delete verify_attempts[userId];
            clearUserSession(userId);
            await sendOrEdit(ctx, `{emoji:FAIL} Could not verify automatically after 3 tries.${apiErrorMsg}\nPlease double‑check the reference and try again later, or contact support.`, { reply_markup: get_main_keyboard() });
          } else {
            await sendOrEdit(ctx, `{emoji:FAIL} Verification failed.${apiErrorMsg}\n\n${3 - attempts} tries left. Re‑enter the reference.`, {
              reply_markup: { inline_keyboard: [[{ text: `{emoji:CANCEL} Cancel`, callback_data: "cancel_action" }]] }
            });
          }
          return;
        }
      }

      // Cancel if no state
      if (text.toLowerCase() === "cancel" || text.toLowerCase() === "❌ cancel") {
        clearUserSession(userId);
        await sendMainMenu(ctx, db);
        return;
      }

    } catch (err) {
      logger.error("CRASH IN MESSAGE HANDLER: " + err.stack);
      try { await ctx.reply(" An internal error occurred. Please try again."); } catch (e) {}
    }
  });

  // ---- Launch ----
  // Telegram command menu: all main-menu buttons except Bot Logs and Channel.
  await bot.telegram.setMyCommands([
    { command: "start", description: "Open YABTOPUP main menu" },
    { command: "wallet", description: "Open Wallet" },
    { command: "shop", description: "Open Shop" },
    { command: "profile", description: "View My Profile" },
    { command: "orders", description: "View My Orders" },
    { command: "support", description: "Contact support / admin" },
    { command: "pending", description: "View Pending Payments" },
    { command: "terms", description: "View YABTOPUP Rules & Terms" },
    { command: "cancel", description: "Cancel current action" }
  ]).catch(e => logger.warn(`Could not set bot commands: ${e.message}`));

  // ---- Render webhook server ----
  // Render provides RENDER_EXTERNAL_URL automatically. WEBHOOK_URL can also be set manually.
  const app = express();
  const PORT = Number(process.env.PORT || 10000);
  const WEBHOOK_PATH = "/telegram/webhook";
  const baseUrl = String(process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");

  app.get("/", (_req, res) => {
    res.status(200).send("YABTOPUP bot is running.");
  });

  app.get(WEBHOOK_PATH, (_req, res) => {
    res.status(200).send("Telegram webhook endpoint is active.");
  });

  app.post(WEBHOOK_PATH, webhookCallback(bot, "express"));

  let server;
  await new Promise((resolve, reject) => {
    server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`HTTP server listening on port ${PORT}`);
      resolve();
    });
    server.once("error", reject);
  });

  if (!baseUrl) {
    throw new Error("WEBHOOK_URL or RENDER_EXTERNAL_URL is required for Render webhook mode.");
  }

  const webhookUrl = `${baseUrl}${WEBHOOK_PATH}`;
  await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: false });
  logger.info(`Telegram webhook configured: ${webhookUrl}`);

  // Remove unpaid pending orders after 10 minutes. Run every minute so cleanup is automatic.
  const pendingCleanupInterval = setInterval(async () => {
    try {
      const removed = await db.cleanup_expired_pending_payment_orders();
      if (removed) logger.info(`Automatically deleted ${removed} expired pending payment order${removed === 1 ? '' : 's'}.`);
    } catch (e) {
      logger.warn(`Pending payment cleanup failed: ${e.message}`);
    }
  }, 60 * 1000);
  pendingCleanupInterval.unref?.();

  const shutdown = async () => {
    logger.info("Shutting down...");
    clearInterval(pendingCleanupInterval);
    setTimeout(() => process.exit(0), 1000).unref();
    try { await bot.stop(); } catch (e) {}
    try { await server?.close(); } catch (e) {}
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

// ---- Start ----
if (require.main === module) {
  main().catch((err) => {
    logger.error(`Fatal crash: ${err.message}`, err);
    process.exit(1);
  });
}