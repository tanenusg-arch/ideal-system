// ===================================================================
// COMPLETE INDEX.JS – All custom emoji IDs integrated
// ===================================================================
const { Telegraf } = require("telegraf");
const axios = require("axios");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const { Client: PgClient } = require("pg");
require("dotenv").config();

// --------------------------------------------
// Supabase configuration
// --------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// PostgreSQL connection used only for automatic schema setup.
// Password's @ character is URL-encoded as %40.
const DATABASE_URL = process.env.DATABASE_URL;

async function ensureDatabaseSchema() {
  const connectionString = DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for automatic table creation. Add the Supabase PostgreSQL Session Pooler connection string to Render Environment Variables.");
  }

  const client = new PgClient({
    connectionString,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 60000,
  });

  const statements = [
    `CREATE TABLE IF NOT EXISTS public.settings (
      key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '', balance NUMERIC(14,2) NOT NULL DEFAULT 0,
      referral_balance NUMERIC(14,2) NOT NULL DEFAULT 0, is_banned INTEGER NOT NULL DEFAULT 0,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.admin_codes (
      code TEXT PRIMARY KEY, reward_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
      id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL REFERENCES public.admin_codes(code) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(code, user_id))`,
    `CREATE TABLE IF NOT EXISTS public.referrals (
      id BIGSERIAL PRIMARY KEY, referrer_id TEXT NOT NULL, referred_id TEXT NOT NULL UNIQUE,
      reward NUMERIC(14,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.orders (
      id TEXT PRIMARY KEY, order_id TEXT, numeric_id BIGINT UNIQUE, telegram_id TEXT NOT NULL,
      game TEXT NOT NULL DEFAULT '', package_name TEXT NOT NULL DEFAULT '',
      api_price NUMERIC(14,2) NOT NULL DEFAULT 0, charged_price NUMERIC(14,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_payment', reference TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ,
      data JSONB NOT NULL DEFAULT '{}'::jsonb)`,
    `CREATE TABLE IF NOT EXISTS public.pending_payments (
      id TEXT PRIMARY KEY, user_id TEXT, amount NUMERIC(14,2), status TEXT NOT NULL DEFAULT 'pending',
      data JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.transactions (
      transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), extra JSONB NOT NULL DEFAULT '{}'::jsonb)`,
    `CREATE TABLE IF NOT EXISTS public.game_overrides (
      game_code TEXT PRIMARY KEY, markup_percentage NUMERIC(8,2))`,
    `CREATE TABLE IF NOT EXISTS public.product_overrides (
      id TEXT PRIMARY KEY, game_code TEXT NOT NULL, product_id TEXT NOT NULL,
      price_override NUMERIC(14,2), type TEXT NOT NULL DEFAULT 'game')`,
    `CREATE TABLE IF NOT EXISTS public.numeric_counters (
      counter_name TEXT PRIMARY KEY, last_value BIGINT NOT NULL DEFAULT 0)`,
    // Add any missing columns when a table already exists from an older bot version.
    `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS value JSONB NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS balance NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS referral_balance NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS is_banned INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE public.admin_codes ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS max_uses INTEGER NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS uses INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referrer_id TEXT, ADD COLUMN IF NOT EXISTS referred_id TEXT, ADD COLUMN IF NOT EXISTS reward NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT, ADD COLUMN IF NOT EXISTS numeric_id BIGINT, ADD COLUMN IF NOT EXISTS telegram_id TEXT, ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS package_name TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS api_price NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS charged_price NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_payment', ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb`,
    `ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS user_id TEXT, ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2), ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending', ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id TEXT, ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb`,
    `ALTER TABLE public.game_overrides ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(8,2)`,
    `ALTER TABLE public.product_overrides ADD COLUMN IF NOT EXISTS game_code TEXT, ADD COLUMN IF NOT EXISTS product_id TEXT, ADD COLUMN IF NOT EXISTS price_override NUMERIC(14,2), ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'game'`,
    `CREATE INDEX IF NOT EXISTS idx_orders_telegram_created ON public.orders(telegram_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_used_at ON public.transactions(used_at DESC)`,
    `CREATE OR REPLACE FUNCTION public.next_numeric_id(counter_name TEXT)
      RETURNS BIGINT LANGUAGE plpgsql AS $$
      #variable_conflict use_column
      DECLARE next_id BIGINT;
      BEGIN INSERT INTO public.numeric_counters(counter_name,last_value) VALUES (next_numeric_id.counter_name,1)
      ON CONFLICT(counter_name) DO UPDATE SET last_value=public.numeric_counters.last_value+1
      RETURNING last_value INTO next_id; RETURN next_id; END; $$`,
    `CREATE OR REPLACE FUNCTION public.adjust_referral_balance(p_user_id TEXT, p_delta NUMERIC)
      RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN
      UPDATE public.users SET referral_balance=referral_balance+COALESCE(p_delta,0), updated_at=NOW() WHERE id=p_user_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'User % does not exist', p_user_id; END IF;
      END; $$`,
    `CREATE OR REPLACE FUNCTION public.use_promo_code_atomic(p_code TEXT, p_user_id TEXT)
      RETURNS TEXT LANGUAGE plpgsql AS $$ DECLARE promo public.admin_codes%ROWTYPE;
      BEGIN
        SELECT * INTO promo FROM public.admin_codes WHERE code=UPPER(TRIM(p_code)) FOR UPDATE;
        IF NOT FOUND THEN RETURN 'Invalid promo code.'; END IF;
        IF promo.uses >= promo.max_uses THEN RETURN 'This promo code has reached its usage limit.'; END IF;
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_user_id) THEN RETURN 'User account not found.'; END IF;
        IF EXISTS (SELECT 1 FROM public.promo_code_redemptions WHERE code=promo.code AND user_id=p_user_id) THEN RETURN 'You have already used this promo code.'; END IF;
        INSERT INTO public.promo_code_redemptions(code,user_id) VALUES (promo.code,p_user_id);
        UPDATE public.admin_codes SET uses=uses+1 WHERE code=promo.code;
        UPDATE public.users SET balance=balance+promo.reward_amount, updated_at=NOW() WHERE id=p_user_id;
        RETURN 'success';
      END; $$`,
    `ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.game_overrides ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.product_overrides ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.numeric_counters ENABLE ROW LEVEL SECURITY`,
    `REVOKE ALL ON TABLE public.settings, public.users, public.admin_codes, public.promo_code_redemptions, public.referrals, public.orders, public.pending_payments, public.transactions, public.game_overrides, public.product_overrides, public.numeric_counters FROM anon, authenticated`,
    `GRANT ALL ON TABLE public.settings, public.users, public.admin_codes, public.promo_code_redemptions, public.referrals, public.orders, public.pending_payments, public.transactions, public.game_overrides, public.product_overrides, public.numeric_counters TO service_role`,
    `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role`,
    `REVOKE EXECUTE ON FUNCTION public.next_numeric_id(TEXT), public.adjust_referral_balance(TEXT, NUMERIC), public.use_promo_code_atomic(TEXT, TEXT) FROM PUBLIC, anon, authenticated`,
    `GRANT EXECUTE ON FUNCTION public.next_numeric_id(TEXT), public.adjust_referral_balance(TEXT, NUMERIC), public.use_promo_code_atomic(TEXT, TEXT) TO service_role`
  ];

  await client.connect();
  try {
    await client.query("BEGIN");
    for (const sql of statements) await client.query(sql);
    await client.query("COMMIT");
    logger.info("Database schema bootstrap completed (tables, indexes and RPC functions checked/created).");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(`Automatic database schema setup failed: ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}


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
const BOT_TOKEN = process.env.BOT_TOKEN;
const G2BULK_API_KEY = process.env.G2BULK_API_KEY;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required in .env / Render environment variables.");
if (!G2BULK_API_KEY) throw new Error("G2BULK_API_KEY is required in .env / Render environment variables.");
const G2BULK_BASE_URL = (process.env.G2BULK_BASE_URL || "https://api.g2bulk.com/v1").replace(/\/+$/, "");

const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // Automatically delete unpaid pending orders after 10 minutes

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_CHAT_ID = (process.env.ADMIN_CHAT_IDS || "").split(",").map(x => x.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
// Public links shown by the main-menu navigation buttons. Replace these placeholders.
const CHANNEL_LINK = process.env.CHANNEL_LINK || "";
const CACHE_TTL = 600;
const PROOF_CHANNEL_ID = Number(process.env.PROOF_CHANNEL_ID || 0);
const REPORT_CHANNEL_ID = PROOF_CHANNEL_ID;
const EXCHANGE_RATE = Number(process.env.EXCHANGE_RATE || 193);

// Helper to normalise a name: uppercase, trim, collapse spaces
// Canonicalize payment references so the same payment cannot be reused by
// changing case/spacing or submitting its Verify.ET receipt URL instead of
// the transaction ID. Example:
// https://transactioninfo.ethiotelecom.et/receipt/DIM61XSJKK -> DIM61XSJKK
function normalizeTransactionReference(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (_) {}

  const receiptMatch = decoded.match(
    /https?:\/\/transactioninfo\.ethiotelecom\.et\/receipt\/([^/?#\s]+)/i
  );
  if (receiptMatch) {
    return String(receiptMatch[1]).replace(/[.)]+$/, "").trim().toUpperCase();
  }

  return decoded.replace(/\s+/g, "").trim().toUpperCase();
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
  SPOTIFY: "5931768393223901245",
  SUPPORT: "5258337316715373336",
  SHOP: "5447319442562251569",
  PAY: "5348191451341668809",
  ORDERS: "5447421246172069841",
  WARNING: "5447381715293074599",
  BACK: "5445365692004071819",
  REFERRAL: "5260450573768990626",
  REDEEM: "5418010521309815154",
  TELEGRAM: "5866355487255039002",         // replaced
  CAPCUT: "5474521476197536994",           // new
  FREE_FIRE: "5872968405451020096",        // new
  GAME: "5884479287171485878",              // product label custom emoji
  PUBG: "5807693556910919020",
  PUBG_UC: "5231323093410002895",
  PUBG_WOW: "5377336227533969892",
  PUBG_PACKS: "5440539497383087970",
  PUBG_ELITEPASS: "6091607503815056167",
  PUBG_OTHER: "5397916757333654639",
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
  ROBLOX: "5359341525744523862",
  COD: "5841504634681691626",
  TIKTOK_COIN: "5778587959410301447",
  TELEGRAM_STARS: "6028338546736107668",
  TELEGRAM_PREMIUM: "5875180111744995604",
  // YAB TOPUP wordmark custom emoji IDs supplied by the user
  BRAND_Y: "6034838163694817707",
  BRAND_A: "6035155544598122286",
  BRAND_B: "6034966561742130141",
  BRAND_T: "6035129113369382057",
  BRAND_O: "6035094538882648655",
  BRAND_P: "6035317104087928229",
  BRAND_U: "6034857521112419666",
};

// Base emoji characters (used as fallback in text)
const EMOJI_BASE = {
  PROFILE: "👤",
  WALLET: "👛",
  ADMIN: "⚙️",
  CONFIRM: "✅",
  STATUS: "📌",
  CANCEL: "❌",
  SUCCESS: "✅",
  GEMINI: "🤖",
  NETFLIX: "📺",
  NORDVPN: "🛡️",
  NOTION: "📝",
  AMAZON_PRIME: "▶️",
  LEONARDO_AI: "🎨",
  GROK: "🤖",
  SPOTIFY: "🎵",
  SUPPORT: "🎧",
  SHOP: "🛍️",
  PAY: "💳",
  ORDERS: "🛒",
  WARNING: "⚠️",
  BACK: "🔙",
  REFERRAL: "🤝",
  REDEEM: "🎁",
  TELEGRAM: "📱",
  GAME: "🎮",
  PUBG: "🎮",
  PUBG_UC: "🎮",
  PUBG_WOW: "🪙",
  PUBG_PACKS: "📦",
  PUBG_ELITEPASS: "🎫",
  PUBG_OTHER: "📦",
  MONEY: "💰",           // new
  USER: "👤",
  CALENDAR: "📅",        // new
  HOME: "🏠",
  START_HAND: "👋",
  START_CART: "🛒",
  START_DOWN: "👇",
  BRAND_Y: "Y",
  BRAND_A: "A",
  BRAND_B: "B",
  BRAND_T: "T",
  BRAND_O: "O",
  BRAND_P: "P",
  BRAND_U: "U",
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
  ROBLOX: "🎮",
  COD: "🎮",
  TIKTOK_COIN: "🪙",
  TELEGRAM_STARS: "⭐",
  TELEGRAM_PREMIUM: "💎",
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

    // Broadcast messages can arrive here with Telegram custom-emoji HTML
    // already embedded in the button text. That HTML is valid for message
    // text, but NOT for an inline button label, so Telegram would display
    // the raw <tg-emoji ...> tag. Convert it to the button's native
    // icon_custom_emoji_id field instead.
    text = text.replace(/<tg-emoji\s+emoji-id=["'](\d+)["'][^>]*>([\s\S]*?)<\/tg-emoji>/gi, (full, id) => {
      if (!customId) customId = String(id);
      return "";
    });

    text = text.replace(/\{emoji:([A-Z_]+)\}/gi, (full, key) => {
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

    // Keep normal Unicode emojis. Telegram inline buttons support regular emoji
    // natively; only mapped/custom emojis are converted to icon_custom_emoji_id.
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
// These are the default Free Fire selling prices. Admin package overrides
// take precedence over these defaults. If a package is not listed here,
// the bot falls back to the game markup until an admin sets a package price.
// --------------------------------------------
const FIXED_FF_DIAMOND_PRICES = {
  "110": 195,
  "220": 395,
  "330": 585,
  "440": 780,
  "550": 970,
  "660": 1170,
  "770": 1365,
  "814": 1450,
  "990": 1755,
  "1000": 1765,
  "2000": 3300,
  "3000": 5000,
  "4000": 6800,
  "5000": 9000,
  "6000": 10000,
};

// Keep these maps defined so the Free Fire price resolver never crashes.
// Packages not listed here use the normal game markup or an admin override.
const FIXED_FF_LEVELUP_PRICES = {
  "Level 6": 90,
  "Level 10": 145,
  "Level 15": 150,
  "Level 20": 150,
  "Level 25": 180,
  "Level 30": 215,
};

const FIXED_FF_MEMBERSHIP_PRICES = {
  Weekly: 450,
  Monthly: 2150,
  Super: 2600,
  "Booyah Pass": 600,
};

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
    if (l === "super" || l.includes("super membership")) return FIXED_FF_MEMBERSHIP_PRICES.Super;
    if (l.includes("booyah")) return FIXED_FF_MEMBERSHIP_PRICES["Booyah Pass"];
  }
  return null;
}

// --------------------------------------------
// Payment Methods (UPDATED)
// --------------------------------------------

// ---------------- Tikur Pay (hosted checkout for orders) ----------------
const TIKUR_PAY_BASE_URL = (process.env.TIKUR_PAY_BASE_URL || "https://tikurpays.et").replace(/\/+$/, "");
const TIKUR_PAY_API_KEY = process.env.TIKUR_PAY_API_KEY || "";
// Keep in step with PENDING_PAYMENT_TIMEOUT_MS, after which unpaid pending orders are cleaned up.
const TIKUR_SESSION_MINUTES = Number(process.env.TIKUR_SESSION_MINUTES || 10);
// paymentNumber -> { userId, orderId, snapshot, messageText, keyboard } (in-memory; the order row is the restart fallback)
const tikurPending = new Map();
const tikurChecking = new Set();

async function tikur_create_session(amount, description) {
  const res = await axios.post(
    `${TIKUR_PAY_BASE_URL}/api/checkout/create`,
    { amount, currency: "ETB", description: String(description || "Order").slice(0, 120), expiresInMinutes: TIKUR_SESSION_MINUTES },
    { headers: { "Content-Type": "application/json", "x-api-key": TIKUR_PAY_API_KEY }, timeout: 20000, validateStatus: () => true }
  );
  const d = res.data || {};
  const url = d.checkout_url || d.direct_checkout_url;
  if ((res.status === 200 || res.status === 201) && d.success !== false && url && d.payment_number) {
    return { payment_number: String(d.payment_number), checkout_url: url, expires_at: d.expires_at || null };
  }
  const reason = res.status === 402 ? "Tikur Pay credits exhausted" : res.status === 401 ? "Tikur Pay API key rejected" : (d.error || d.message || `HTTP ${res.status}`);
  throw new Error(String(reason));
}

async function tikur_get_status(paymentNumber) {
  try {
    const res = await axios.get(
      `${TIKUR_PAY_BASE_URL}/api/checkout/status/${encodeURIComponent(paymentNumber)}`,
      { headers: { Accept: "application/json", "x-api-key": TIKUR_PAY_API_KEY }, timeout: 20000, validateStatus: () => true }
    );
    return tikur_interpret(res);
  } catch (e) {
    return { state: "error", reason: e.message };
  }
}

// completed -> deliver | pending -> keep waiting | failed -> fail the order | error -> try again later
function tikur_interpret(res) {
  if (res.status === 404) return { state: "failed", reason: "payment not found / expired" };
  if (res.status >= 400 || !res.data || typeof res.data !== "object") return { state: "error", reason: `HTTP ${res.status}` };
  const d = res.data;
  const st = String(d.status || "").toLowerCase();
  if (["completed", "paid", "success", "successful", "verified", "yes"].includes(st)) return { state: "completed", data: d };
  if (["pending", "processing", "waiting", "created", "open", "active"].includes(st)) return { state: "pending", data: d };
  return { state: "failed", reason: st || "unknown status", data: d };
}

// Re-show the payment screen (Pay Now / Check Status) for a pending Tikur Pay order.
async function show_tikur_payment(ctx, order) {
  const pn = String(order.tikur_payment_number || order.reference || "");
  if (!pn) return false;
  const entry = tikurPending.get(pn);
  if (entry) { await sendOrEdit(ctx, entry.messageText, { reply_markup: entry.keyboard }); return true; }
  const amount = Number(order.charged_price || 0);
  const messageText =
    `{emoji:PAY} <b>Payment</b>\n\n` +
    `{emoji:ORDERS} ${order.package_display_name || order.package_name || order.game || "Order"}\n` +
    `{emoji:MONEY} <b>Amount:</b> ${amount % 1 === 0 ? amount : amount.toFixed(2)} ETB\n\n` +
    `1️⃣ Tap <b>Pay Now</b> and complete the payment.\n` +
    `2️⃣ Come back here and tap <b>Check Status</b>.`;
  const keyboard = { inline_keyboard: [
    [{ text: "💳 Pay Now", url: `${TIKUR_PAY_BASE_URL}/checkout/${encodeURIComponent(pn)}`, style: "primary" }],
    [{ text: "🔄 Check Status", callback_data: `tikur_check:${pn}`, style: "primary" }],
    [{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }],
  ] };
  await sendOrEdit(ctx, messageText, { reply_markup: keyboard });
  return true;
}


// --------------------------------------------
// Helper functions (unchanged)
// --------------------------------------------
function api_price_to_birr(api_price, markup_amount = 0.0, is_telegram = false) {
  return is_telegram ? api_price * 1.0 + markup_amount : api_price * EXCHANGE_RATE + markup_amount;
}


function clean_freefire_package_name(rawName) {
  if (!rawName) return 'Package';
  let cleaned = String(rawName);
  cleaned = cleaned.replace(/\s*[-–]\s*[\d.]+(\s*\$)?/gi, '');
  cleaned = cleaned.replace(/\s*\([\d.]+\s*\$\)/gi, '');
  cleaned = cleaned.trim();

  const lower = cleaned.toLowerCase();
  if (lower.includes('booyah')) return 'Booyah Pass';
  if (/\bsuper\b/.test(lower)) return 'Super';
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

// --------------------------------------------
// Inline keyboards (updated with custom emoji base characters)
// --------------------------------------------

// Admin-managed navigation buttons. Settings are stored in Supabase appSettings.
const MANAGED_BUTTONS = {
  menu_shop: { group: "Main menu", defaultLabel: `${getBaseEmoji('SHOP')} Shop`, groupKey: "MAIN" },
  menu_profile: { group: "Main menu", defaultLabel: `${getBaseEmoji('PROFILE')} My Profile`, groupKey: "MAIN" },
  menu_orders: { group: "Main menu", defaultLabel: `${getBaseEmoji('ORDERS')} My Orders`, groupKey: "MAIN" },
  menu_support: { group: "Main menu", defaultLabel: `${getBaseEmoji('SUPPORT')} Support`, groupKey: "MAIN" },
  menu_pending_payments: { group: "Main menu", defaultLabel: `${getBaseEmoji('PENDING_PAYMENT')} Pending Payment`, groupKey: "MAIN" },
  menu_channel: { group: "Main menu", defaultLabel: "Channel", groupKey: "MAIN" },
  shop_pubg: { group: "Shop", defaultLabel: `${getBaseEmoji('PUBG')} PUBG Mobile`, groupKey: "SHOP" },
  shop_freefire: { group: "Shop", defaultLabel: `${getBaseEmoji('FREE_FIRE')} Free Fire`, groupKey: "SHOP" },
  shop_manual: { group: "Shop", defaultLabel: `${getBaseEmoji('ROBLOX')} Roblox`, groupKey: "SHOP" },
  shop_manual_cod: { group: "Shop", defaultLabel: `${getBaseEmoji('COD')} Call of Duty`, groupKey: "SHOP" },
  shop_telegram_stars: { group: "Shop", defaultLabel: `${getBaseEmoji('TELEGRAM_STARS')} Telegram Stars`, groupKey: "SHOP" },
  shop_telegram_premium: { group: "Shop", defaultLabel: `${getBaseEmoji('TELEGRAM_PREMIUM')} Telegram Premium`, groupKey: "SHOP" },
  shop_tiktok: { group: "Shop", defaultLabel: `${getBaseEmoji('TIKTOK_COIN')} TikTok Coin`, groupKey: "SHOP" }
};
function managedButtonConfig(id) {
  const all = appSettings.MANAGED_BUTTONS || {};
  return all[id] || {};
}
function managedButton(id, fallback) {
  const cfg = managedButtonConfig(id);
  if (cfg.hidden) return null;
  return { ...fallback, text: cfg.label || fallback.text };
}
function applyManagedButtons(markup) {
  if (!markup?.inline_keyboard) return markup;
  const rows = [];
  for (const row of markup.inline_keyboard) {
    const next = [];
    for (const original of row) {
      let id = original.callback_data;
      if (original.url === CHANNEL_LINK) id = "menu_channel";
      if (id === "shop_manual:roblox") id = "shop_manual";
      if (id === "shop_manual:cod") id = "shop_manual_cod";
      if (id === "shop_telegram:stars") id = "shop_telegram_stars";
      if (id === "shop_telegram:premium") id = "shop_telegram_premium";
      if (id === "shop_manual:tiktok") id = "shop_tiktok";
      const item = id && MANAGED_BUTTONS[id] ? managedButton(id, original) : original;
      if (item) next.push(item);
    }
    if (next.length) rows.push(next);
  }
  const custom = Array.isArray(appSettings.CUSTOM_MENU_BUTTONS) ? appSettings.CUSTOM_MENU_BUTTONS : [];
  if (markup === MAIN_MENU_MARKUP_SENTINEL) {} // no-op; custom buttons are appended below by main keyboard builder.
  return { ...markup, inline_keyboard: rows };
}
function getButtonManagerKeyboard() {
  const rows = Object.entries(MANAGED_BUTTONS).map(([id, info]) => {
    const cfg = managedButtonConfig(id);
    const status = cfg.hidden ? "OFF" : "ON";
    const label = (cfg.label || info.defaultLabel).replace(/\{emoji:[A-Z_]+\}/g, "").trim();
    return [{ text: `${status} · ${label}`.slice(0, 60), callback_data: `admin_btn_select:${id}` }];
  });
  for (const b of (appSettings.CUSTOM_MENU_BUTTONS || [])) {
    rows.push([{ text: `🗑️ Delete: ${String(b.label || "Custom button").slice(0, 35)}`, callback_data: `admin_custom_delete:${b.id}` }]);
  }
  rows.push([{ text: "➕ Add custom URL button", callback_data: "admin_btn_add" }]);
  rows.push([{ text: "🔙 Back", callback_data: "admin_settings" }]);
  return { inline_keyboard: rows };
}
function getButtonEditKeyboard(id) {
  return { inline_keyboard: [
    [{ text: "✏️ Change label", callback_data: `admin_btn_label:${id}` }],
    [{ text: managedButtonConfig(id).hidden ? "Show button" : "Hide button", callback_data: `admin_btn_toggle:${id}` }],
    [{ text: "Reset label", callback_data: `admin_btn_reset:${id}` }],
    [{ text: "🔙 Back", callback_data: "admin_buttons" }]
  ] };
}

function get_main_keyboard() {
  const keyboard = applyManagedButtons({
    inline_keyboard: [
      [
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
        { text: "Channel", url: CHANNEL_LINK, style: "primary", icon_custom_emoji_id: "5458603970916270333" },
      ],
    ],
  });
  for (const b of (appSettings.CUSTOM_MENU_BUTTONS || []).filter(x => x.enabled !== false)) {
    keyboard.inline_keyboard.push([{ text: b.label, url: b.url }]);
  }
  return keyboard;
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
  return applyManagedButtons({
    inline_keyboard: [
      [
        { text: `${getBaseEmoji('PUBG')} PUBG Mobile`, callback_data: "shop_pubg", style: "primary" },
        { text: `${getBaseEmoji('FREE_FIRE')} Free Fire`, callback_data: "shop_freefire", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('ROBLOX')} Roblox`, callback_data: "shop_manual:roblox", style: "primary" },
        { text: `${getBaseEmoji('COD')} Call of Duty`, callback_data: "shop_manual:cod", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('TELEGRAM_STARS')} Telegram Stars`, callback_data: "shop_telegram:stars", style: "primary" },
        { text: `${getBaseEmoji('TELEGRAM_PREMIUM')} Telegram Premium`, callback_data: "shop_telegram:premium", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('TIKTOK_COIN')} TikTok Coin`, callback_data: "shop_manual:tiktok", style: "primary" },
      ],
      [
        { text: `${getBaseEmoji('BACK')} Back to Main`, callback_data: "back_to_main" },
      ],
    ],
  });
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
      [{ text: `${getBaseEmoji('FF_LEVELUP')} Level Up Packages`, callback_data: "ff_sub:levelup", style: "primary" }],
      [{ text: `${getBaseEmoji('FF_MEMBERSHIP')} Memberships & Booyah Pass`, callback_data: "ff_sub:membership", style: "primary" }],
      [{ text: "🎟️ Vouchers", callback_data: "ff_sub:vouchers", style: "primary" }],
      [{ text: `${getBaseEmoji('BACK')} Back to Shop`, callback_data: "shop_back" }],
    ],
  };
}

function get_pubg_sub_keyboard() {
  return {
    inline_keyboard: [
      [{ text: " Auto", callback_data: "pubg_mode:auto", style: "primary" }, { text: " Manual", callback_data: "pubg_mode:manual", style: "primary" }],
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
        { text: "🎟️ Promo Codes", callback_data: "admin_promo" },
        { text: "👥 Users", callback_data: "admin_user_manage" },
      ],
      [
        { text: "🎁 Voucher", callback_data: "admin_voucher" },
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
      ],
      [
        { text: "Manual Products", callback_data: "admin_manual_products" },
      [{ text: "🧩 Manage Menu Buttons", callback_data: "admin_buttons" }],
      ],
      [
        { text: "⭐ Telegram Stars Prices", callback_data: "admin_telegram_prices:stars" },
        { text: "💎 Telegram Premium Prices", callback_data: "admin_telegram_prices:premium" },
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
const STATE_MANUAL_ID = "manual_id";
const STATE_MANUAL_NAME = "manual_name";
const STATE_MANUAL_EMAIL = "manual_email";
const STATE_MANUAL_PASSWORD = "manual_password";
const STATE_CONFIRM = "confirm";
const STATE_PAYMENT_METHOD = "pay_method";
const STATE_PROFILE_REDEEM = "profile_redeem";
const STATE_ADMIN_MAIN = "admin_main";
const STATE_ADMIN_CREATE_CODE = "admin_create_code";
const STATE_ADMIN_DELETE_CODE = "admin_delete_code";
const STATE_ADMIN_BROADCAST = "admin_broadcast";
const STATE_ADMIN_REFERRAL_INPUT = "admin_refer_input";
const STATE_ADMIN_BAN = "admin_ban";
const STATE_ADMIN_UNBAN = "admin_unban";
const STATE_ADMIN_SEARCH_BY_ID = "admin_search_by_id";
const STATE_ADMIN_GAME_MARKUP = "admin_game_markup";
const STATE_ADMIN_GAME_PRICE_INPUT = "admin_game_price_input";
const STATE_ADMIN_GLOBAL_MARKUP = "admin_global_markup";
const STATE_ADMIN_VOUCHER_PRICE = "admin_voucher_price";
const STATE_ADMIN_VOUCHER_STOCK = "admin_voucher_stock";
const STATE_VOUCHER_QTY = "voucher_qty";
const STATE_SHOP = "shop";
const STATE_ADMIN_MANUAL_PRICE = "admin_manual_price";
const STATE_ADMIN_TELEGRAM_PRICE = "admin_telegram_price";
const STATE_ADMIN_BUTTON_LABEL = "admin_button_label";
const STATE_ADMIN_BUTTON_ADD = "admin_button_add";

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

    // G2Bulk GET /v1/games is public. No API key/auth headers are sent here.
    const url = `${this.base_url}/games`;
    try {
      const response = await axios({
        method: "GET",
        url,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        timeout: 30000,
      });
      const data = response.data;
      if (data && (data.success || Array.isArray(data.games) || Array.isArray(data.data))) {
        this._cache["games"] = { ts: now, data };
      }
      logger.info(`[G2Bulk] GET /games (public) -> HTTP ${response.status}`);
      return data;
    } catch (e) {
      logger.error(`API Error on public /games: ${e.message}`);
      if (e.response && e.response.data) return e.response.data;
      return { success: false, message: e.message };
    }
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
// Verify payment (FIXED: robust parsing of top-level fields)
// --------------------------------------------
// --------------------------------------------
// FirestoreDatabase class
// --------------------------------------------
class FirestoreDatabase {
  constructor() { this.db = supabase; }

  _clean(row) {
    if (!row) return null;
    const { data, ...base } = row;
    return { ...(data || {}), ...base, order_id: base.order_id || base.id };
  }

  async _one(table, column, value) {
    const { data, error } = await this.db.from(table).select('*').eq(column, value).maybeSingle();
    if (error) throw error;
    return data;
  }

  async load_settings(appSettingsObj) {
    const row = await this._one('settings', 'key', 'appSettings');
    if (row) Object.assign(appSettingsObj, row.value || {});
    else {
      const { error } = await this.db.from('settings').insert({ key: 'appSettings', value: appSettingsObj });
      if (error) throw error;
    }
  }

  async save_setting(key, value, appSettingsObj) {
    appSettingsObj[key] = value;
    const { error } = await this.db.from('settings').upsert({ key: 'appSettings', value: appSettingsObj, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async register_user(userId, username, first_name, last_name) {
    const id = String(userId);
    const existing = await this._one('users', 'id', id);
    if (existing) return false;
    const { error } = await this.db.from('users').insert({ id, username: username || '', first_name: first_name || '', last_name: last_name || '', balance: 0, referral_balance: 0, is_banned: 0, registered_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  }

  async is_banned(userId) { const d = await this._one('users', 'id', String(userId)); return !!d && d.is_banned === 1; }
  async ban_user(userId) { const { error } = await this.db.from('users').update({ is_banned: 1 }).eq('id', String(userId)); if (error) throw error; return true; }
  async unban_user(userId) { const { error } = await this.db.from('users').update({ is_banned: 0 }).eq('id', String(userId)); if (error) throw error; return true; }
  async get_user_profile(userId) { return await this._one('users', 'id', String(userId)); }

  async get_all_users() {
    const { data, error } = await this.db.from('users').select('id');
    if (error) throw error;
    return (data || []).map(x => String(x.id)).filter(Boolean);
  }



  async get_username(userId) {
    const d = await this._one('users', 'id', String(userId));
    return d ? (d.username || d.first_name || String(userId)) : String(userId);
  }

  async create_promo_code(code, amount, max_uses) {
    const { error } = await this.db.from('admin_codes').upsert({ code, reward_amount: Number(amount), max_uses: Number(max_uses), uses: 0, created_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  }
  async list_promo_codes() { const { data, error } = await this.db.from('admin_codes').select('*'); if (error) throw error; return data || []; }
  async delete_promo_code(code) { const { error } = await this.db.from('admin_codes').delete().eq('code', code); if (error) throw error; return true; }
  async use_promo_code(code, userId) {
    const { data, error } = await this.db.rpc('use_promo_code_atomic', { p_code: String(code), p_user_id: String(userId) });
    if (error) throw error;
    return data;
  }

  async create_referral(referrer_id, referred_id, reward) {
    const rid = String(referred_id);
    const existing = await this._one('referrals', 'referred_id', rid);
    if (existing) return;
    const { error } = await this.db.from('referrals').insert({ referrer_id: String(referrer_id), referred_id: rid, reward: Number(reward), created_at: new Date().toISOString() });
    if (error) throw error;
    const { error: balError } = await this.db.rpc('adjust_referral_balance', { p_user_id: String(referrer_id), p_delta: Number(reward) });
    if (balError) throw balError;
  }

  async get_referral_stats(userId) {
    const { data, error } = await this.db.from('referrals').select('reward').eq('referrer_id', String(userId));
    if (error) throw error;
    return { count: (data || []).length, total_earned: (data || []).reduce((n, x) => n + Number(x.reward || 0), 0) };
  }
  async get_referral_list(userId) {
    const { data, error } = await this.db.from('referrals').select('referred_id,reward').eq('referrer_id', String(userId));
    if (error) throw error;
    return (data || []).map(x => ({ referred_user_id: x.referred_id, reward: Number(x.reward || 0) }));
  }

  async get_next_numeric_id(collectionName) {
    const { data, error } = await this.db.rpc('next_numeric_id', { counter_name: collectionName });
    if (error) throw error;
    return Number(data);
  }

  async create_order(userId, game, package_name, api_price, charged_price, status, reference) {
    const numId = await this.get_next_numeric_id('orders');
    const orderId = `ORD-${100000 + numId}`;
    const { error } = await this.db.from('orders').insert({ id: orderId, order_id: orderId, numeric_id: numId, telegram_id: String(userId), game, package_name, api_price: Number(api_price || 0), charged_price: Number(charged_price || 0), status, reference: reference || '', created_at: new Date().toISOString() });
    if (error) throw error;
    return orderId;
  }

  async get_user_orders(userId, limitCount = 5) {
    const { data, error } = await this.db.from('orders').select('*').eq('telegram_id', String(userId)).order('created_at', { ascending: false }).limit(limitCount);
    if (error) throw error;
    return (data || []).map(x => this._clean(x));
  }

  async update_order(order_id, updates = {}) {
    if (!order_id) throw new Error('Missing order ID');
    const current = await this._one('orders', 'id', String(order_id));
    if (!current) throw new Error(`Order not found: ${order_id}`);
    const known = new Set(['id','order_id','numeric_id','telegram_id','game','package_name','api_price','charged_price','status','reference','created_at','updated_at','data']);
    const extra = { ...(current.data || {}) };
    for (const [k,v] of Object.entries(updates || {})) if (!known.has(k)) extra[k] = v;
    const patch = { updated_at: new Date().toISOString(), data: extra };
    for (const [k,v] of Object.entries(updates || {})) if (known.has(k) && k !== 'id' && k !== 'order_id' && k !== 'numeric_id' && k !== 'telegram_id' && k !== 'created_at' && k !== 'data') patch[k] = v;
    const { error } = await this.db.from('orders').update(patch).eq('id', String(order_id));
    if (error) throw error;
    return String(order_id);
  }

  async get_user_pending_payment_orders(userId, limitCount = 10) {
    await this.cleanup_expired_pending_payment_orders(userId);
    const { data, error } = await this.db.from('orders').select('*').eq('telegram_id', String(userId)).eq('status', 'pending_payment').order('created_at', { ascending: false }).limit(limitCount);
    if (error) throw error;
    return (data || []).map(x => this._clean(x));
  }
  async delete_order(order_id) { if (!order_id) return; const { error } = await this.db.from('orders').delete().eq('id', String(order_id)); if (error) throw error; }
  async delete_pending_payment(reference) { if (!reference) return; const { error } = await this.db.from('pending_payments').delete().eq('id', encodeURIComponent(String(reference))); if (error) throw error; }

  async cleanup_expired_pending_payment_orders(userId = null) {
    let q = this.db.from('orders').select('id,reference,created_at,data').eq('status', 'pending_payment');
    if (userId != null) q = q.eq('telegram_id', String(userId));
    const { data, error } = await q;
    if (error) throw error;
    const cutoff = Date.now() - PENDING_PAYMENT_TIMEOUT_MS;
    let count = 0;
    for (const row of data || []) {
      const created = Date.parse(row.created_at || '');
      if (!Number.isFinite(created) || created <= cutoff) {
        try { await this.delete_order(row.id); } catch (e) { logger.warn(`Could not delete expired order ${row.id}: ${e.message}`); }
        if (row.reference) try { await this.delete_pending_payment(row.reference); } catch (e) { logger.warn(`Could not delete expired pending payment ${row.reference}: ${e.message}`); }
        count++;
      }
    }
    return count;
  }

  async cancel_all_pending_payment_orders(userId) {
    const { data, error } = await this.db.from('orders').select('id,reference').eq('telegram_id', String(userId)).eq('status', 'pending_payment');
    if (error) throw error;
    let count = 0;
    for (const row of data || []) { try { await this.delete_order(row.id); } catch (e) { logger.warn(`Could not cancel order ${row.id}: ${e.message}`); continue; } if (row.reference) try { await this.delete_pending_payment(row.reference); } catch (e) {} count++; }
    return count;
  }

  async get_order_by_id(order_id) { return this._clean(await this._one('orders', 'id', String(order_id))); }
  async find_order_by_reference(reference) {
    const { data, error } = await this.db.from('orders').select('*').eq('reference', String(reference)).limit(1);
    if (error) throw error;
    return this._clean((data || [])[0] || null);
  }
  async get_order_by_numeric_id(numeric_id) {
    const { data, error } = await this.db.from('orders').select('*').eq('numeric_id', Number(numeric_id)).limit(1);
    if (error) throw error;
    return data && data[0] ? this._clean(data[0]) : null;
  }







  // Atomic claim: INSERT + the database UNIQUE constraint decides the winner.
  // Never use upsert here because a second verifier must not overwrite the
  // first user's transaction claim.
  async claim_transaction_use(txn_id, user_id, amount, extra = {}) {
    const canonical = normalizeTransactionReference(txn_id);
    if (!canonical) throw new Error('Missing transaction reference.');

    const { data, error } = await this.db.from('transactions').insert({
      transaction_id: canonical,
      user_id: String(user_id),
      amount: Number(amount || 0),
      used_at: new Date().toISOString(),
      extra: extra || {}
    }).select('transaction_id').maybeSingle();

    if (!error) return { claimed: true, transaction_id: canonical, data };
    if (String(error.code || '') === '23505') {
      return { claimed: false, duplicate: true, transaction_id: canonical };
    }
    throw error;
  }

  async get_verified_transactions(limitCount = 30) { const { data, error } = await this.db.from('transactions').select('*').order('used_at', { ascending: false }).limit(limitCount); if (error) throw error; return data || []; }


  async get_dashboard_stats() {
    const stats = { total_users: 0, total_orders: 0, revenue_today: 0 };
    try {
      const [{ count: uc }, { count: oc }] = await Promise.all([
        this.db.from('users').select('*', { count: 'exact', head: true }),
        this.db.from('orders').select('*', { count: 'exact', head: true })
      ]);
      stats.total_users = uc || 0; stats.total_orders = oc || 0;
      const today = new Date().toISOString().slice(0,10);
      const { data: orders } = await this.db.from('orders').select('created_at,charged_price,api_price,status').eq('status','completed');
      (orders || []).forEach(o => { if (o.created_at && String(o.created_at).startsWith(today)) stats.revenue_today += Number(o.charged_price || 0) - Number(o.api_price || 0); });
    } catch (e) { logger.error(`Dashboard stats error: ${e.message}`); }
    return stats;
  }

  async get_game_markup(game_code) { const d = await this._one('game_overrides','game_code',String(game_code)); return d && d.markup_percentage !== null ? Number(d.markup_percentage) : (global.appSettings ? global.appSettings.DEFAULT_MARKUP_PERCENT : 15.0); }
  async set_game_markup(game_code, markup_percent) { const { error } = await this.db.from('game_overrides').upsert({ game_code: String(game_code), markup_percentage: Number(markup_percent) }); if (error) throw error; }
  async set_game_product_price_override(game_code, product_id, price) { const id = `${game_code}__${product_id}`; if (price === null) { const { error } = await this.db.from('product_overrides').delete().eq('id',id); if(error) throw error; } else { const { error } = await this.db.from('product_overrides').upsert({ id, game_code: String(game_code), product_id: String(product_id), price_override: Number(price), type:'game' }); if(error) throw error; } }
  async get_all_product_overrides() { const { data, error } = await this.db.from('product_overrides').select('*'); if(error) throw error; return data || []; }
}

// --------------------------------------------
// Manual products (admin-controlled)
// --------------------------------------------
const DEFAULT_MANUAL_PRODUCTS = {
  roblox: { enabled:true, name:"Roblox Robux", emoji:"ROBLOX", packages:[
    {id:"40",name:"40 Robux",price:150},{id:"80",name:"80 Robux",price:250},{id:"400",name:"400 Robux",price:1100},{id:"800",name:"800 Robux",price:2100},
    {id:"1700",name:"1700 Robux",price:4350},{id:"4500",name:"4500 Robux",price:9500},{id:"10000",name:"10,000 Robux",price:17200},{id:"22500",name:"22,500 Robux",price:32200}
  ]},
  cod: { enabled:true, name:"Call of Duty", emoji:"COD", packages:[
    {id:"80",name:"80 CP",price:250},{id:"420",name:"420+ CP",price:1100},{id:"880",name:"880+ CP",price:2200},{id:"2400",name:"2400+ CP",price:5000},{id:"5000",name:"5000+ CP",price:10500},{id:"10800",name:"10800+ CP",price:20500}
  ]},
  tiktok: { enabled:true, name:"TikTok Coin", emoji:"TIKTOK_COIN", packages:[
    {id:"30",name:"30 Coins",price:120},{id:"50",name:"50 Coins",price:150},{id:"60",name:"60 Coins",price:180},{id:"70",name:"70 Coins",price:200},{id:"100",name:"100 Coins",price:300},{id:"150",name:"150 Coins",price:400},{id:"200",name:"200 Coins",price:500},{id:"250",name:"250 Coins",price:600},{id:"300",name:"300 Coins",price:700},{id:"350",name:"350 Coins",price:800},{id:"400",name:"400 Coins",price:900},{id:"500",name:"500 Coins",price:1100},{id:"700",name:"700 Coins",price:1600},{id:"1000",name:"1,000 Coins",price:2200},{id:"2000",name:"2,000 Coins",price:4300},{id:"3000",name:"3,000 Coins",price:6200},{id:"5000",name:"5,000 Coins",price:10100},{id:"7000",name:"7,000 Coins",price:14200},{id:"10000",name:"10,000 Coins",price:20000}
  ]},
  pubg_manual: { enabled:true, name:"PUBG MOBILE UC Manual", emoji:"PUBG_UC", packages:[
    {id:"30UC",name:"30UC",price:150},{id:"60UC",name:"60UC",price:190},{id:"90UC",name:"90UC",price:310},{id:"120UC",name:"120UC",price:380},{id:"180UC",name:"180UC",price:560},{id:"210UC",name:"210UC",price:650},{id:"240UC",name:"240UC",price:750},{id:"336UC",name:"336UC",price:880},{id:"366UC",name:"366UC",price:1000},{id:"396UC",name:"396UC",price:1100},{id:"426UC",name:"426UC",price:1150},{id:"456UC",name:"456UC",price:1300},{id:"486UC",name:"486UC",price:1400},{id:"516UC",name:"516UC",price:1500},{id:"672UC",name:"672UC",price:1750},{id:"732UC",name:"732UC",price:1950},{id:"792UC",name:"792UC",price:2150},{id:"822UC",name:"822UC",price:2250},{id:"1038UC",name:"1038UC",price:2700},{id:"1128UC",name:"1128UC",price:3000},{id:"1464UC",name:"1464UC",price:3850},{id:"1800UC",name:"1800UC",price:4450},{id:"2125UC",name:"2125UC",price:5400},{id:"3850UC",name:"3850UC",price:8700},{id:"8100UC",name:"8100UC",price:17400}
  ]},
};
function getManualProducts() {
  const stored=appSettings.MANUAL_PRODUCTS;
  if(!stored || typeof stored!=="object") appSettings.MANUAL_PRODUCTS=JSON.parse(JSON.stringify(DEFAULT_MANUAL_PRODUCTS));
  else for(const [key,def] of Object.entries(DEFAULT_MANUAL_PRODUCTS)){ if(!stored[key]) stored[key]=JSON.parse(JSON.stringify(def)); if(!Array.isArray(stored[key].packages)) stored[key].packages=JSON.parse(JSON.stringify(def.packages)); if(!stored[key].name) stored[key].name=def.name; if(!stored[key].emoji) stored[key].emoji=def.emoji; if(stored[key].enabled===undefined) stored[key].enabled=true; }
  // Free Fire memberships and level-up packages are G2Bulk auto products now,
  // never expose stale legacy copies through the manual-order system.
  delete appSettings.MANUAL_PRODUCTS.ff_membership;
  delete appSettings.MANUAL_PRODUCTS.ff_levelup;
  return appSettings.MANUAL_PRODUCTS;
}
function getManualProduct(key){return getManualProducts()[key]||null;}
function isManualFlow(session){return ["manual","manual_pubg"].includes(session?.data?.flow_type);}
function manualOrderText(product, amount, txnId, details = null) {
  return `Hey NATAN i wanted to buy ${product} and I've paid ${Math.floor(Number(amount)||0)} with this ${txnId} txn id. Can you complete my order please?`;
}

// Prepare the direct-message URL ahead of time. Telegram will open the chat and
// pre-fill this text when the user activates the URL; the bot cannot send it as
// the user. Keeping the URL in the session lets us reveal the exact prepared
// destination only after payment verification succeeds.
function manualOrderUrl(product, amount, txnId) {
  const text = manualOrderText(product, amount, txnId);
  return `https://t.me/natan1000?text=${encodeURIComponent(text)}`;
}

function manualOrderKeyboard(product, amount, txnId, preparedUrl = null) {
  const url = preparedUrl || manualOrderUrl(product, amount, txnId);
  return { inline_keyboard: [[{ text: "💬 Open NATAN DM", url }]] };
}

// --------------------------------------------
// Telegram catalogue helpers (mirrors the working bot flow)
// --------------------------------------------
const FIXED_STARS_PRICES = {
  50: 250,
  100: 400,
  250: 900,
  350: 1300,
  500: 1700,
  750: 2550,
  1000: 3500,
  1500: 4800,
  2500: 7900,
};

const TELEGRAM_PREMIUM_PRICES = {
  1: 800,
  3: 2900,
  6: 3900,
  12: 6300,
};

function parseTelegramPackageName(name) {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return null;

  // G2Bulk may return names such as:
  // "50 Stars", "Telegram Stars 50", "50 Telegram Stars", "50 star" or "1k Stars".
  const star = s.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s*)(k|m)?(?:\s*)(?:telegram\s*)?stars?\b/i)
    || s.match(/(?:^|\s)(?:telegram\s*)?stars?\s*(\d+(?:[.,]\d+)?)(k|m)?(?:\s|$)/i);
  if (star) {
    let amount = Number(star[1].replace(/,/g, ''));
    const suffix = String(star[2] || '').toLowerCase();
    if (suffix === 'k') amount *= 1000;
    else if (suffix === 'm') amount *= 1000000;
    if (Number.isFinite(amount)) return { type: 'stars', amount };
  }

  // Premium: "1 Month Premium", "Premium 3 Months", "Telegram Premium 1M", "1 Year Premium".
  const prem = s.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(month|months|year|yr|m|y)\s*(?:telegram\s*)?premium\b/i)
    || s.match(/(?:^|\s)(?:telegram\s*)?premium\s*(\d+(?:[.,]\d+)?)\s*(month|months|year|yr|m|y)\b/i);
  if (prem) {
    let months = Number(prem[1].replace(/,/g, ''));
    const unit = String(prem[2] || '').toLowerCase();
    if (unit === 'year' || unit === 'yr' || unit === 'y') months *= 12;
    if (Number.isFinite(months)) return { type: 'premium', months };
  }

  return null;
}

function identifyTelegramPackage(pkg) {
  const fields = [pkg?.display_name, pkg?.name, pkg?.title, pkg?.catalogue_name, pkg?.package_name, pkg?.description]
    .filter(v => v !== undefined && v !== null).map(String);
  for (const field of fields) {
    const parsed = parseTelegramPackageName(field);
    if (parsed) return parsed;
  }
  const starAmount = Number(pkg?.stars ?? pkg?.star_amount ?? pkg?.quantity ?? pkg?.amount_stars);
  if (Number.isFinite(starAmount) && starAmount > 0 && /star/i.test(fields.join(' '))) return { type: 'stars', amount: starAmount };
  const months = Number(pkg?.months ?? pkg?.duration_months ?? pkg?.premium_months);
  if (Number.isFinite(months) && months > 0 && /premium/i.test(fields.join(' '))) return { type: 'premium', months };
  return null;
}

let appSettings = {
  DEFAULT_MARKUP_PERCENT: 15.0,
  MAINTENANCE_MODE: false,
  REPORT_EVENTS: true,
  TELEGRAM_STARS_MARKUP: 0,
  TELEGRAM_PREMIUM_MARKUP: 0,
  TELEGRAM_STARS_PRICES: JSON.parse(JSON.stringify(FIXED_STARS_PRICES)),
  TELEGRAM_PREMIUM_PRICES: JSON.parse(JSON.stringify(TELEGRAM_PREMIUM_PRICES)),
  MANUAL_PRODUCTS: JSON.parse(JSON.stringify(DEFAULT_MANUAL_PRODUCTS)),
};

function getTelegramStarsPrices() {
  if (!appSettings.TELEGRAM_STARS_PRICES || typeof appSettings.TELEGRAM_STARS_PRICES !== "object") {
    appSettings.TELEGRAM_STARS_PRICES = JSON.parse(JSON.stringify(FIXED_STARS_PRICES));
  }
  for (const [amount, price] of Object.entries(FIXED_STARS_PRICES)) {
    if (appSettings.TELEGRAM_STARS_PRICES[amount] === undefined) appSettings.TELEGRAM_STARS_PRICES[amount] = price;
  }
  return appSettings.TELEGRAM_STARS_PRICES;
}

function getTelegramPremiumPrices() {
  if (!appSettings.TELEGRAM_PREMIUM_PRICES || typeof appSettings.TELEGRAM_PREMIUM_PRICES !== "object") {
    appSettings.TELEGRAM_PREMIUM_PRICES = JSON.parse(JSON.stringify(TELEGRAM_PREMIUM_PRICES));
  }
  for (const [months, price] of Object.entries(TELEGRAM_PREMIUM_PRICES)) {
    if (appSettings.TELEGRAM_PREMIUM_PRICES[months] === undefined) appSettings.TELEGRAM_PREMIUM_PRICES[months] = price;
  }
  return appSettings.TELEGRAM_PREMIUM_PRICES;
}

// This follows the working bot's important approach:
// 1) GET /v1/games and find the single Telegram game.
// 2) GET /v1/games/{TelegramGameCode}/catalogue.
// 3) Filter that catalogue into Stars or Premium by package name.
// It does NOT try to find a separate "Stars" or "Premium" game.
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

    const gamesRes = await this.api_client.get_games();
    const games = Array.isArray(gamesRes)
      ? gamesRes
      : (gamesRes?.games || gamesRes?.data || gamesRes?.result || []);

    // The working bot searches for Telegram itself, not for a separate Stars/Premium game.
    const telegramGame = games.find(g => {
      const name = String(g?.name || g?.title || g?.game_name || '').toLowerCase();
      const code = String(g?.code || g?.game_code || g?.slug || '').toLowerCase();
      return name.includes('telegram') || code.includes('telegram');
    });

    const telegramCode = telegramGame
      ? String(telegramGame.code || telegramGame.game_code || telegramGame.slug || telegramGame.name)
      : 'Telegram';

    const catRes = await this.api_client.get_game_catalogue(telegramCode);
    const catalogues = Array.isArray(catRes)
      ? catRes
      : (catRes?.catalogues || catRes?.data || catRes?.result || []);

    if (!Array.isArray(catalogues) || !catalogues.length) {
      const message = catRes?.message || 'No Telegram catalogue returned by G2Bulk.';
      throw new Error(message);
    }

    // Preserve database price overrides exactly like the working bot.
    const overrides = new Map();
    try {
      for (const ov of await this.db.get_all_product_overrides()) {
        if (ov.price_override !== undefined && ov.price_override !== null) {
          overrides.set(String(ov.product_id || ov.id), Number(ov.price_override));
        }
      }
    } catch (e) {
      logger.warn(`Could not load Telegram price overrides: ${e.message}`);
    }

    const mapped = catalogues.map(pkg => {
      const productId = pkg.id || pkg.code || pkg.name;
      const override = overrides.get(String(productId));
      return { ...pkg, _game_code: telegramCode, _override_price: override };
    });

    this._telegram_cache = mapped;
    this._telegram_ts = now;
    return mapped;
  }

  async get_telegram_stars_packages(force = false) {
    const packages = await this.get_telegram_catalogue(force);
    return packages.filter(pkg => {
      const raw = pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || '';
      const parsed = parseTelegramPackageName(raw);
      return parsed?.type === 'stars';
    });
  }

  async get_telegram_premium_plans(force = false) {
    const packages = await this.get_telegram_catalogue(force);
    return packages.filter(pkg => {
      const raw = pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || '';
      const parsed = parseTelegramPackageName(raw);
      return parsed?.type === 'premium';
    });
  }

  async get_telegram_stars_markup() {
    return Number(appSettings.TELEGRAM_STARS_MARKUP || 0);
  }

  async get_telegram_premium_markup() {
    return Number(appSettings.TELEGRAM_PREMIUM_MARKUP || 0);
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

  // Protect custom emoji HTML tags that came directly from Telegram message
  // entities. Telegram sends Premium/custom emoji as normal text PLUS a
  // custom_emoji entity, so the entity must be preserved when broadcasting.
  const protectedEmojiTags = [];
  value = value.replace(/<tg-emoji\s+emoji-id=["']\d+["'][^>]*>[^<]*<\/tg-emoji>/g, (tag) => {
    const token = `__TELEGRAM_CUSTOM_EMOJI_${protectedEmojiTags.length}__`;
    protectedEmojiTags.push([token, tag]);
    return token;
  });
  const makeToken = (key) => {
    const customId = getCustomEmojiId(key);
    if (!customId) return "";
    const token = `__CUSTOM_EMOJI_${tokenIndex++}__`;
    const fallback = EMOJI_BASE[key] || "·";
    tokenMap.set(token, `<tg-emoji emoji-id="${customId}">${fallback}</tg-emoji>`);
    return token;
  };

  // Convert explicit placeholders first.
  value = value.replace(/\{emoji:([A-Z_]+)\}/gi, (full, key) => makeToken(key));

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
  for (const [token, tag] of protectedEmojiTags) value = value.split(token).join(tag);
  return value;
}

// Preserve Premium/custom emoji entities from an admin's Telegram message.
// Telegram does not include the custom emoji ID in message.text itself.
function prepareBroadcastText(messageOrText) {
  if (typeof messageOrText === "string") return messageOrText;
  const text = String(messageOrText?.text ?? "");
  const entities = Array.isArray(messageOrText?.entities) ? messageOrText.entities : [];
  const customEntities = entities
    .filter(e => e && e.type === "custom_emoji" && Number.isInteger(e.offset) && Number.isInteger(e.length) && e.custom_emoji_id)
    .sort((a, b) => b.offset - a.offset);

  let value = text;
  for (const entity of customEntities) {
    const start = entity.offset;
    const end = entity.offset + entity.length;
    const selected = value.slice(start, end);
    if (!selected) continue;
    value = value.slice(0, start) +
      `<tg-emoji emoji-id="${String(entity.custom_emoji_id)}">${selected}</tg-emoji>` +
      value.slice(end);
  }
  return value;
}

async function sendOrEditPhoto(ctx, photoUrl, rawCaption, extra = {}) {
  const session = getUserSession(ctx.from.id);
  const processedMarkup = processKeyboardCustomEmojis(extra.reply_markup);
  const htmlCaption = buildMessageWithCustomEmojis(rawCaption);

  // Telegram can reject a caption containing a malformed/unsupported custom
  // emoji entity with ENTITY_TEXT_INVALID. Payment instructions must never
  // crash the callback, so retry without custom-emoji HTML and finally as
  // plain text if Telegram rejects the HTML itself.
  const stripCustomEmojiHtml = (value) => String(value || '')
    .replace(/<tg-emoji\s+emoji-id=["']\d+["'][^>]*>([\s\S]*?)<\/tg-emoji>/gi, '$1');
  const stripHtml = (value) => stripCustomEmojiHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  const attempts = [
    { caption: htmlCaption, options: { parse_mode: 'HTML', reply_markup: processedMarkup } },
    { caption: stripCustomEmojiHtml(rawCaption), options: { parse_mode: 'HTML', reply_markup: processedMarkup } },
    { caption: stripHtml(rawCaption), options: { reply_markup: processedMarkup } },
  ];

  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
          await ctx.editMessageMedia(
            { type: 'photo', media: photoUrl, caption: attempt.caption, ...(attempt.options.parse_mode ? { parse_mode: attempt.options.parse_mode } : {}) },
            { reply_markup: attempt.options.reply_markup },
          );
          session.data.last_photo_msg_id = ctx.callbackQuery.message.message_id;
          return;
        } catch (e) {
          lastError = e;
          // If editing failed, the callback message may be text or an old
          // media type. Try sending a fresh photo below.
        }
      }

      await clear_last_photo(ctx, session);
      const msg = await ctx.replyWithPhoto(photoUrl, { caption: attempt.caption, ...attempt.options });
      session.data.last_photo_msg_id = msg.message_id;
      return;
    } catch (e) {
      lastError = e;
      const description = String(e?.response?.description || e?.description || e?.message || '');
      logger.warn(`[PAYMENT] sendOrEditPhoto attempt ${i + 1} failed: ${description}`);
    }
  }

  // Last-resort text fallback. Do not throw the original Telegram entity error
  // back into the callback handler.
  try {
    await sendOrEdit(ctx, stripHtml(rawCaption), { reply_markup: processedMarkup });
    return;
  } catch (fallbackError) {
    logger.error(`[PAYMENT] sendOrEditPhoto final text fallback failed: ${fallbackError?.message || fallbackError}`);
  }

  if (lastError) throw lastError;
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
  const logText = String(text || "");
  const allowed =
    /<b>Pending Product Payment<\/b>/i.test(logText) ||
    /<b>Pending Product Order<\/b>/i.test(logText) ||
    /<b>Pending Payment<\/b>/i.test(logText) ||
    /<b>New Order Placed<\/b>/i.test(logText) ||
    /<b>New Purchase<\/b>/i.test(logText) ||
    /<b>New Pending Order!<\/b>/i.test(logText);

  if (!allowed) return false;

  const options = { parse_mode: "HTML" };
  if (reply_markup) options.reply_markup = processKeyboardCustomEmojis(reply_markup);

  try {
    await bot.telegram.sendMessage(
      REPORT_CHANNEL_ID,
      buildMessageWithCustomEmojis(logText),
      options
    );
    logger.info(`Group log sent successfully to ${REPORT_CHANNEL_ID}`);
    return true;
  } catch (e) {
    logger.warn(`Custom-emoji group log failed for ${REPORT_CHANNEL_ID}: ${e.message}`);

    // Fallback: Telegram can reject custom-emoji HTML because of an invalid
    // emoji/entity. Send the same log with custom-emoji placeholders replaced
    // by their normal Unicode equivalents so the log is still delivered.
    try {
      let fallbackText = logText.replace(/\{emoji:([A-Z_]+)\}/gi, (full, key) => EMOJI_BASE[key] || "");
      fallbackText = fallbackText.replace(/<tg-emoji\s+emoji-id=["']\d+["'][^>]*>([\s\S]*?)<\/tg-emoji>/gi, "$1");
      const fallbackOptions = { parse_mode: "HTML" };
      if (reply_markup) fallbackOptions.reply_markup = processKeyboardCustomEmojis(reply_markup);
      await bot.telegram.sendMessage(REPORT_CHANNEL_ID, fallbackText, fallbackOptions);
      logger.info(`Group log fallback sent successfully to ${REPORT_CHANNEL_ID}`);
      return true;
    } catch (fallbackError) {
      logger.warn(`HTML fallback failed for ${REPORT_CHANNEL_ID}: ${fallbackError.message}`);

      // Final fallback: send completely plain text. This avoids every possible
      // Telegram HTML/entity parsing failure while preserving the log content.
      try {
        let plainText = logText
          .replace(/\{emoji:([A-Z_]+)\}/gi, (full, key) => EMOJI_BASE[key] || '')
          .replace(/<tg-emoji\s+emoji-id=["']\d+["'][^>]*>([\s\S]*?)<\/tg-emoji>/gi, '$1')
          .replace(/<[^>]*>/g, '');
        await bot.telegram.sendMessage(REPORT_CHANNEL_ID, plainText);
        logger.info(`Plain-text group log fallback sent successfully to ${REPORT_CHANNEL_ID}`);
        return true;
      } catch (plainError) {
        logger.error(`FAILED to send group log to ${REPORT_CHANNEL_ID}: ${plainError.message}`);
        return false;
      }
    }
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

function pubgPackageDisplayName(pkg) {
  // G2Bulk can expose PUBG UC using several fields. Prefer the explicit
  // display/name fields, but extract the actual UC amount rather than the
  // catalogue/index number. This prevents buttons such as "1", "2", ...
  // when the provider package is actually "60 UC", "120 UC", etc.
  const fields = [pkg?.display_name, pkg?.name, pkg?.title, pkg?.catalogue_name, pkg?.code]
    .map(v => String(v ?? "").trim())
    .filter(Boolean);
  const raw = fields[0] || "Package";

  for (const value of fields) {
    const uc = value.match(/(?:^|[^0-9])([0-9][0-9,]*)\s*UC(?:$|[^A-Za-z])/i);
    if (uc) return uc[1].replace(/,/g, "");
  }

  // Some catalogue responses are numeric strings for the UC amount itself.
  if (/^\d[\d,]*$/.test(raw)) return raw.replace(/,/g, "");

  return raw
    .replace(/\s*\([^)]*discounted[^)]*\)/ig, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pubgPackageCategory(pkg) {
  const raw = [pkg?.display_name, pkg?.name, pkg?.title, pkg?.catalogue_name, pkg?.code]
    .map(v => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const lower = raw.toLowerCase();
  const cleaned = pubgPackageDisplayName(pkg);

  // Keep these categories mutually exclusive. Check the named products
  // before generic "pass"/"pack" matching.
  if (/prime\s*plus|prime\+/.test(lower)) return "prime_plus";
  if (/\bprime\b/.test(lower)) return "prime";
  if (/elite\s*pass|elitepass/.test(lower)) return "elitepass";
  if (/wow\s*coin/.test(lower)) return "wow";
  if (/\buc\b/.test(lower) || /^\d+$/.test(cleaned)) return "uc";
  if (/\bpack(s)?\b/.test(lower)) return "packs";
  return "other";
}

function pubgCategoryLabel(category) {
  return ({
    uc: "UC",
    wow: "WOW Coin",
    elitepass: "Elite Pass",
    prime: "Prime",
    prime_plus: "Prime Plus",
    packs: "Packs",
    other: "Others"
  })[category] || "Others";
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
  const selectedId = String(data.selected_pkg_id || '').trim();
  const fields = [
    data.game_name,
    data.service_name,
    data.package_display_name,
    data.package_name,
    data.product_name,
  ].map(v => String(v || '').trim().toLowerCase()).filter(Boolean);

  // Resolve the actual flow before checking product names.
  const flow = String(data.flow_type || '').toLowerCase();
  if (flow === 'freefire') return 'FREE_FIRE';
  if (fields.some(value => value.includes('grok'))) return 'GROK';
  if (fields.some(value => value.includes('pubg') || value.includes('wow coin') || value.includes('uc'))) return 'PUBG';
  if (fields.some(value => value.includes('free fire') || value === 'ff')) return 'FREE_FIRE';
  return 'GAME';
}

function getProductLogName(session) {
  return session?.data?.package_display_name || session?.data?.package_name || session?.data?.game_name || session?.data?.service_name || "Product";
}

// --------------------------------------------
// Main function (place_order_flow)
// --------------------------------------------
// Message shown when a customer has paid but the delivery provider (G2Bulk) could not complete the order.
function orderFailedMessage(reference) {
  const ref = reference || "-";
  return (
    `{emoji:FAIL} <b>Order could not be completed / ትዕዛዙ አልተጠናቀቀም</b>\n\n` +
    `🇬🇧 Sorry, we couldn't complete your order. Your payment was received and is safe. ` +
    `If you want a refund, please ask the admin ${ADMIN_USERNAME} and send them your payment number: <code>${ref}</code>\n\n` +
    `🇪🇹 ይቅርታ፣ ትዕዛዝዎን ማጠናቀቅ አልቻልንም። ክፍያዎ ደርሶናል፤ ደህንነቱም የተጠበቀ ነው። ` +
    `ገንዘብዎ እንዲመለስልዎ ከፈለጉ እባክዎ አድሚኑን ${ADMIN_USERNAME} ይጠይቁ፤ የክፍያ ቁጥርዎንም ይላኩ፦ <code>${ref}</code>`
  );
}

async function place_order_flow(ctx, session, db, api_client, bot, method, reference = null, verified_amount = null) {
  const user = ctx.from;
  const package_id = session.data.selected_pkg_id;
  const game_code = session.data.game_code || session.data.telegram_game_code || "Telegram";
  const player_id = session.data.player_id;
  const server_id = session.data.server_id || null;
  const charged_price = session.data.charged_price;
  const api_price = session.data.api_price;

  let extra = "";
  try {
    let api_res;
    if (session.data.flow_type === "voucher") {
      const denom=String(session.data.voucher_denom||package_id); const qty=Math.max(1,Number(session.data.voucher_quantity)||1); const item=(appSettings.VOUCHER_STOCK||{})[denom]||{}; const codes=Array.isArray(item.codes)?item.codes.slice():[];
      if(codes.length<qty) throw new Error("Voucher stock is no longer sufficient.");
      const delivered=codes.splice(0,qty); appSettings.VOUCHER_STOCK[denom]={...(item||{}),codes}; await db.save_setting("VOUCHER_STOCK",appSettings.VOUCHER_STOCK,appSettings);
      api_res={success:true, voucher_codes:delivered}; session.data.delivered_vouchers=delivered;
    } else {
      api_res = await api_client.place_order(game_code, package_id, player_id, server_id, "127.0.0.1");
    }
    const success = (typeof isproviderDeliveryResponse !== "undefined" && isproviderDeliveryResponse) || (api_res &&
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
      if (session.data.flow_type === "voucher" && Array.isArray(session.data.delivered_vouchers)) {
        extra = `\n\n<b>Your voucher code${session.data.delivered_vouchers.length > 1 ? "s" : ""}:</b>\n${session.data.delivered_vouchers.map(c=>`<code>${String(c).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code>`).join("\n")}`;
      }
      // Escape provider-supplied delivery text before putting it into Telegram
      // HTML. provider credentials may contain &, <, >, or other characters.
      const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      // Delivery was normalized above for every provider product.
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
        if (session.data.flow_type === "freefire") return "freefire";
        return "shop";
      })();
      const purchaseProductLink = session.data.product_link ||
        (purchaseBotUsername ? `https://t.me/${purchaseBotUsername}?start=${encodeURIComponent(purchaseProductToken)}` : "");
      const purchaseMarkup = purchaseProductLink ? {
        inline_keyboard: [[{ text: `{emoji:${purchaseEmojiKey}} ${purchaseProductName}`, url: purchaseProductLink }]]
      } : undefined;

      const purchaseDate = new Date().toLocaleString("en-GB", {
        timeZone: "Africa/Addis_Ababa",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });

      const maskedOrderId = String(orderId).replace(/^(ORD\d{2})\d+(\d)$/, "$1****$2");

      const purchaseLogText =
        `{emoji:STATUS}<b>New Purchase!</b>\n\n` +
        `Product: {emoji:${purchaseEmojiKey}} ${purchaseProductName}\n\n` +
        `　　　{emoji:USER} By: <code>${String(user.id).slice(0, 2)}****${String(user.id).slice(-3)}</code>\n` +
        `　　　{emoji:ORDERS}Order No: <code>${maskedOrderId}</code>\n\n` +
        `{emoji:CALENDAR}Date : ${purchaseDate}`;

      // Use the same clean successful-purchase format everywhere.
      await report_event(bot, purchaseLogText, purchaseMarkup);
      try {
        await bot.telegram.sendMessage(
          PROOF_CHANNEL_ID,
          buildMessageWithCustomEmojis(purchaseLogText),
          { parse_mode: "HTML", reply_markup: processKeyboardCustomEmojis(purchaseMarkup || {}) }
        );
      } catch (_) {}
    } else {
      const err_msg = api_res && (api_res.message || api_res.error || "Unknown error from provider.");
      try { if (session.data.pending_order_id) await db.update_order(session.data.pending_order_id, { status: "failed", payment_stage: "refund_pending", payment_error: String(err_msg) }); } catch (_) {}
      await sendOrEdit(ctx, orderFailedMessage(reference), { reply_markup: get_main_keyboard() });
      await report_event(bot,
        `{emoji:FAIL} <b>Order Failed</b>\n` +
        `{emoji:USER} User: <a href="tg://user?id=${user.id}">${user.first_name || "User"}</a> (ID: <code>${user.id}</code>)\n` +
        `{emoji:${getProductEmojiKey(session)}} Product: ${getProductLogName(session)}\n` +
        `{emoji:ORDERS} Package: ${session.data.package_display_name || session.data.package_name}\n` +
        `{emoji:FAIL} Error: ${err_msg}\n` +
        `{emoji:MONEY} <b>Refund needed:</b> ${Math.floor(charged_price || 0)} ETB (payment <code>${reference || "-"}</code>)`
      );
    }
  } catch (e) {
    try { if (session.data.pending_order_id) await db.update_order(session.data.pending_order_id, { status: "failed", payment_stage: "refund_pending", payment_error: String(e.message) }); } catch (_) {}
    await sendOrEdit(ctx, orderFailedMessage(reference), { reply_markup: get_main_keyboard() });
    await report_event(bot, `{emoji:FAIL} <b>Order system error – refund needed</b>\nUser: <code>${user.id}</code>\nAmount: ${Math.floor(charged_price || 0)} ETB\nPayment: <code>${reference || "-"}</code>\nError: ${e.message}`);
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
  // Use the exact custom emoji IDs supplied for the YAB TOPUP wordmark.
  // Each fallback character matches its corresponding custom emoji entity.
  const brandName =
    "{emoji:BRAND_Y}{emoji:BRAND_A}{emoji:BRAND_B} " +
    "{emoji:BRAND_T}{emoji:BRAND_O}{emoji:BRAND_P}{emoji:BRAND_U}{emoji:BRAND_P}";
  const caption =
    `{emoji:HOME} <b>Welcome, ${brandName}!</b> {emoji:START_HAND}\n\n` +
    `Your trusted top-up {emoji:CONFIRM} shop{emoji:START_CART} for Telegram, TikTok, Gemini, CapCut, Free Fire and premium subscriptions.\n\n` +
    `Use the buttons{emoji:START_DOWN} below to shop, manage your wallet, view orders or get support.`;
  if (messageIdToEdit) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        messageIdToEdit,
        null,
        caption,
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
  await ctx.reply(caption, {
    parse_mode: "HTML",
    reply_markup: processKeyboardCustomEmojis(get_main_keyboard()),
  });
}

// --------------------------------------------
// Package page render helper
// --------------------------------------------
function getPubgCategoryEmojiKey(category) {
  return ({
    uc: "PUBG_UC",
    wow: "PUBG_WOW",
    packs: "PUBG_PACKS",
    elitepass: "PUBG_ELITEPASS",
    other: "PUBG_OTHER",
  })[String(category || "").toLowerCase()] || "PUBG";
}

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
  const required = ["BOT_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "G2BULK_API_KEY"];
  const missing = required.filter(key => !process.env[key] || !String(process.env[key]).trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  await ensureDatabaseSchema();
  const db = new FirestoreDatabase();
  await db.load_settings(appSettings);
  logger.info("Initial settings loaded from Supabase.");

  const api_client = new G2BulkAPIClient(G2BULK_BASE_URL, G2BULK_API_KEY, CACHE_TTL);
  const catalog_service = new CatalogService(api_client, db);
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
  bot.command("shop", async (ctx) => {
    if (!(await maintenance_check(ctx))) return;
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

  bot.command("log", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;

    // Admin test command: create a successful-purchase log using a random
    // product from the bot's currently supported products.
    const logProducts = [
      { name: "Free Fire Diamonds", emoji: "FREE_FIRE" },
      { name: "PUBG Mobile UC", emoji: "PUBG" },
      { name: "PUBG Mobile WOW Coin", emoji: "PUBG" },
      { name: "PUBG Mobile Pack", emoji: "PUBG" }
    ];

    const selected = logProducts[Math.floor(Math.random() * logProducts.length)];
    const randomOrderNo = `ORD${Math.floor(100000 + Math.random() * 900000)}`;

    const logDate = new Date().toLocaleString("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const idText = String(ctx.from.id);
    const maskedId = idText.length > 5 ? `${idText.slice(0, 2)}****${idText.slice(-3)}` : idText;
    const maskedRandomOrderNo = String(randomOrderNo).replace(/^(ORD\d{2})\d+(\d)$/, "$1****$2");
    const trialPurchaseLog =
      `{emoji:STATUS}<b>New Purchase!</b>\n\n` +
      `Product: {emoji:${selected.emoji}} ${selected.name}\n\n` +
      `　 　{emoji:USER}By: <code>${maskedId}</code>\n` +
      `　　 {emoji:ORDERS}Order No: <code>${maskedRandomOrderNo}</code>\n\n` +
      `{emoji:CALENDAR}Date : ${logDate}`;

    let logged = false;
    let lastLogError = "";

    // Try the exact custom-emoji version first.
    try {
      await bot.telegram.sendMessage(
        REPORT_CHANNEL_ID,
        buildMessageWithCustomEmojis(trialPurchaseLog),
        { parse_mode: "HTML" }
      );
      logged = true;
    } catch (e) {
      lastLogError = String(e?.message || e);
      logger.warn(`DIRECT /log custom-emoji send failed to ${REPORT_CHANNEL_ID}: ${lastLogError}`);
    }

    // If Telegram rejects the custom emoji/entity markup, send a plain-text
    // version. This avoids ALL Telegram entity parsing errors.
    if (!logged) {
      try {
        let plainLog = trialPurchaseLog
          .replace(/\{emoji:([A-Z_]+)\}/gi, (full, key) => EMOJI_BASE[key] || "")
          .replace(/<[^>]+>/g, "");
        await bot.telegram.sendMessage(REPORT_CHANNEL_ID, plainLog);
        logged = true;
      } catch (e) {
        lastLogError = String(e?.message || e);
        logger.error(`DIRECT /log plain-text send failed to ${REPORT_CHANNEL_ID}: ${lastLogError}`);
      }
    }

    if (logged) {
      await ctx.reply("Successful purchase log sent.");
    } else {
      await ctx.reply(`Failed to send purchase log to ${REPORT_CHANNEL_ID}.\n\nTelegram error: ${lastLogError}`);
    }
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
      `{emoji:WARNING} <b>ETHIO STORE— RULES &amp; TERMS</b> {emoji:WARNING}\n` +
      `By using YABTOPUP, you automatically agree to the following Terms &amp; Conditions\n\n` +
      `{emoji:WARNING} <b>AGE REQUIREMENT</b>\n` +
      `Users must be 18+ to use our services. If you are under 18, do not send money without permission from a parent/guardian. Unauthorized transactions may lead to legal action.\n\n` +
      `{emoji:GEMINI_DESC} <b>AUTO PRODUCTS</b>\n` +
      `{emoji:FREE_FIRE} Free Fire and {emoji:PUBG} PUBG Mobile are AUTO. After payment, your selected product will be delivered automatically.\n\n` +
      `{emoji:CANCEL} Fake receipts / fake payments are strictly prohibited. Users who submit fake receipts will be permanently banned from the Bot.\n\n` +
      `{emoji:GEMINI_DESC} <b>PAYMENT &amp; RESPONSIBILITY</b>\n` +
      `Check the product, account details and price carefully before making payment. Customers are responsible for incorrect information.\n\n` +
      `{emoji:WARNING} No refunds after an order has been completed.\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `{emoji:GAME} <b>AUTO:</b> Free Fire • PUBG Mobile\n\n` +
      `{emoji:SUPPORT} <b>Support:</b> ${ADMIN_USERNAME}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `{emoji:WARNING} <b>PLEASE READ THE RULES BEFORE ORDERING</b>`;
    await sendOrEdit(ctx, terms, { reply_markup: get_main_keyboard() });
  });

  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    if (!(await maintenance_check(ctx))) return;
        if (await db.is_banned(user.id)) {
      await sendOrEdit(ctx, `{emoji:FAIL} You are banned.`);
      return;
    }
    await register_user_implicit(ctx, db, bot);
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const payload = parts[1] || "";

    if (payload.startsWith("ref")) {
      try {
        const referrer_id = parseInt(payload.slice(3), 10);
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

    // Short product deep-links: /start gemini, /start capcut, etc.
    // The old product_* format remains supported for backwards compatibility.
    const productRoutes = {
      freefire: "shop_freefire",
      pubg: "shop_pubg",
    };

    const normalizedPayload = payload.startsWith("product_") ? payload.slice(8) : payload;
    const route = productRoutes[normalizedPayload];
    if (route) {
      const syntheticUpdate = {
        update_id: Date.now(),
        callback_query: {
          id: `deeplink_${Date.now()}_${user.id}`,
          from: user,
          chat_instance: String(user.id),
          data: route,
          message: {
            message_id: ctx.message.message_id,
            date: ctx.message.date || Math.floor(Date.now() / 1000),
            chat: ctx.chat,
            from: {
              id: ctx.botInfo?.id || 0,
              is_bot: true,
              first_name: ctx.botInfo?.first_name || "Bot",
              username: ctx.botInfo?.username || ""
            },
            text: ctx.message.text || ""
          }
        }
      };
      try {
        await bot.handleUpdate(syntheticUpdate);
        return;
      } catch (e) {
        logger.warn(`Product deep-link routing failed for ${payload}: ${e.message}`);
      }
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

  // Broadcast parser: the admin controls the message and any custom emoji.
  // Nothing is added automatically. Use placeholders such as {emoji:PREMIUM}
  // only when you explicitly want them.
  function parseBroadcast(rawText) {
    const lines = String(rawText || "").split(/\r?\n/);
    const buttonRows = [];
    const messageLines = [];

    for (const line of lines) {
      const match = line.match(/^\s*button\s*:\s*(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/i);
      if (match) {
        if (buttonRows.length < 8) {
          buttonRows.push([{ text: match[1].trim(), url: match[2].trim(), style: "primary" }]);
        }
      } else {
        messageLines.push(line);
      }
    }

    return {
      message: messageLines.join("\n").trim(),
      reply_markup: buttonRows.length ? { inline_keyboard: buttonRows } : undefined
    };
  }

  async function sendBroadcast(rawInput) {
    const rawText = prepareBroadcastText(rawInput);
    const parsed = parseBroadcast(rawText);
    if (!parsed.message) throw new Error("Broadcast message is empty.");

    const users = [...new Set((await db.get_all_users()).map(v => String(v).trim()).filter(v => /^-?\d+$/.test(v)))];
    // IMPORTANT: only use the emoji/button content the admin explicitly typed.
    const processedText = buildMessageWithCustomEmojis(parsed.message);
    const extra = { parse_mode: "HTML" };
    if (parsed.reply_markup) extra.reply_markup = processKeyboardCustomEmojis(parsed.reply_markup);

    let success = 0;
    let failed = 0;
    const failures = {};

    const recordFailure = (uid, err) => {
      const msg = String(err?.response?.description || err?.description || err?.message || err || "Unknown error");
      const key = msg.slice(0, 140);
      failures[key] = (failures[key] || 0) + 1;
      logger.warn(`Broadcast failed for user ${uid}: ${msg}`);
    };

    async function deliver(uid) {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await bot.telegram.sendMessage(uid, processedText, extra);
          return true;
        } catch (e) {
          const code = e?.response?.error_code;
          if (code === 429) {
            const retryAfter = Number(e?.response?.parameters?.retry_after || 2);
            await new Promise(resolve => setTimeout(resolve, Math.min(Math.max(retryAfter, 1), 10) * 1000));
            continue;
          }
          recordFailure(uid, e);
          return false;
        }
      }
      recordFailure(uid, new Error("Telegram rate limit retry exhausted"));
      return false;
    }

    // Send sequentially. It is slower, but avoids Telegram flood-limit bursts.
    for (const uid of users) {
      if (await deliver(uid)) success++;
      else failed++;
      await new Promise(resolve => setTimeout(resolve, 45));
    }

    return { success, failed, total: users.length, failures };
  }

  bot.command("broadcast", async (ctx) => {
    if (!ADMIN_CHAT_IDS.includes(ctx.from.id)) return;
    const text = ctx.message.text.replace(/^\/broadcast\s*/, "").trim();
    if (!text) {
      await sendOrEdit(ctx, "Usage: /broadcast <message>");
      return;
    }

    try {
      const message = ctx.message;
      const commandMatch = String(message.text || "").match(/^\/broadcast(?:@\w+)?\s*/i);
      const commandLength = commandMatch ? commandMatch[0].length : 0;
      const adjustedEntities = (message.entities || [])
        .filter(e => e.type === "custom_emoji" && e.offset + e.length > commandLength)
        .map(e => ({ ...e, offset: Math.max(0, e.offset - commandLength) }));
      const broadcastInput = {
        text: String(message.text || "").slice(commandLength),
        entities: adjustedEntities
      };
      const result = await sendBroadcast(broadcastInput);
      await sendOrEdit(ctx, `{emoji:SUCCESS} Broadcast sent to ${result.success}/${result.total} users.\nFailed: ${result.failed}`);
    } catch (e) {
      logger.error(`Broadcast error: ${e.message}`);
      await sendOrEdit(ctx, `{emoji:FAIL} Broadcast failed: ${e.message}`);
    }
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
      let data = ctx.callbackQuery.data;
      const userId = ctx.from.id;
      const session = getUserSession(userId);
      // tikur_check answers its own query so it can show a popup (pending / error messages).
      if (!String(data).startsWith("tikur_check:")) await ctx.answerCbQuery().catch(() => {});
      if (await db.is_banned(userId)) {
        await sendOrEdit(ctx, `{emoji:FAIL} You are banned.`);
        return;
      }

      // Cancel / back
      if (data === "cancel_action") {
        await clear_last_photo(ctx, session);
        clearUserSession(userId);
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
        if (!order || String(order.telegram_id) !== String(userId) || order.status !== "pending_payment" || order.payment_method !== "tikurpay" || !(await show_tikur_payment(ctx, order))) {
          clearUserSession(userId);
          await sendOrEdit(ctx, `{emoji:CANCEL} <b>Payment session unavailable.</b>\n\nPlease create a new order.`, { reply_markup: get_main_keyboard() });
        }
        return;
      }

      if (data.startsWith("resume_order:")) {
        const orderId = data.slice("resume_order:".length);
        const order = await db.get_order_by_id(orderId);
        if (!order || String(order.telegram_id) !== String(userId) || order.status !== "pending_payment" || order.payment_method !== "tikurpay" || !(await show_tikur_payment(ctx, order))) {
          await sendOrEdit(ctx, `{emoji:FAIL} This pending order is no longer available. Please create a new order.`, { reply_markup: get_main_keyboard() });
        }
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

      if (data.startsWith("shop_telegram:")) {
        const kind = data.split(":")[1] === "premium" ? "premium" : "stars";
        await clear_last_photo(ctx, session);
        session.data.telegram_kind = kind;
        session.data.game_name = kind === "stars" ? "Telegram Stars" : "Telegram Premium";
        session.data.flow_type = "telegram";
        session.data.game_code = "Telegram";

        await sendOrEdit(ctx,
          `${kind === "stars" ? getBaseEmoji('TELEGRAM_STARS') : getBaseEmoji('TELEGRAM_PREMIUM')} <b>${session.data.game_name}</b>\n\nLoading packages...`
        );

        try {
          // IMPORTANT: use the same working flow as the reference bot.
          // G2Bulk has one Telegram game catalogue containing both Stars and Premium.
          let packages;
          if (kind === "stars") {
            packages = await catalog_service.get_telegram_stars_packages(true);
          } else {
            packages = await catalog_service.get_telegram_premium_plans(true);
          }

          if (!packages.length) {
            throw new Error(`No Telegram ${kind === "stars" ? "Stars" : "Premium"} packages were found in the Telegram catalogue.`);
          }

          packages = sort_telegram_packages(packages);
          session.data.active_packages = packages;
          session.data.telegram_game_code = packages[0]._game_code || "Telegram";
          session.data.game_code = session.data.telegram_game_code;
          session.data.telegram_markup = kind === "stars"
            ? await catalog_service.get_telegram_stars_markup()
            : await catalog_service.get_telegram_premium_markup();
          session.data.game_markup = session.data.telegram_markup;
          session.data.package_raw_names = {};

          const buttons = [];
          for (let idx = 0; idx < packages.length; idx++) {
            const pkg = packages[idx];
            const originalName = String(pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || pkg.package_name || "Package");
            const parsed = identifyTelegramPackage(pkg);
            let rawName = originalName;
            let chargedPrice;

            if (kind === "stars") {
              const amount = parsed?.type === "stars" ? Number(parsed.amount) : null;
              const adminPrice = amount !== null ? Number(getTelegramStarsPrices()[String(amount)]) : NaN;
              // Admin panel price is authoritative. G2Bulk price is only a fallback
              // when the package cannot be mapped to a configured Stars amount.
              if (amount !== null && Number.isFinite(adminPrice) && adminPrice > 0) {
                chargedPrice = adminPrice;
                rawName = `${amount} stars`;
              } else if (pkg._override_price !== undefined && pkg._override_price !== null) {
                chargedPrice = Number(pkg._override_price);
              } else {
                const apiPrice = Number(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
                chargedPrice = api_price_to_birr(apiPrice, session.data.telegram_markup || 0, true);
              }
            } else {
              const months = parsed?.type === "premium" ? Number(parsed.months) : null;
              const adminPrice = months !== null ? Number(getTelegramPremiumPrices()[String(months)]) : NaN;
              if (months !== null && Number.isFinite(adminPrice) && adminPrice > 0) {
                chargedPrice = adminPrice;
                rawName = `${months} ${months === 1 ? "Month" : "Months"}`;
              } else if (pkg._override_price !== undefined && pkg._override_price !== null) {
                chargedPrice = Number(pkg._override_price);
              } else {
                const apiPrice = Number(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
                chargedPrice = api_price_to_birr(apiPrice, session.data.telegram_markup || 0, true);
              }
            }

            if (!Number.isFinite(Number(chargedPrice)) || Number(chargedPrice) <= 0) continue;
            session.data.package_raw_names[String(idx)] = rawName;
            session.data[`pkg_price_${idx}`] = Number(chargedPrice);
            buttons.push({
              text: `${kind === "stars" ? getBaseEmoji('TELEGRAM_STARS') : getBaseEmoji('TELEGRAM_PREMIUM')}${rawName} - ${Math.floor(Number(chargedPrice))} ETB`.trim(),
              callback_data: `pkg_game:${idx}`,
              style: "primary",
            });
          }

          if (!buttons.length) throw new Error("Telegram catalogue packages were returned, but none had a usable price.");

          session.data.pkg_back = "shop_back";
          // Telegram Premium: 1 per row. Telegram Stars remains 2 per row.
          session.data.isOnePerRow = kind === "premium";
          session.data.isPaginated = false;
          session.data.pkg_buttons = buttons;
          await render_package_page(ctx, session, 0);
        } catch (e) {
          logger.error(`Error fetching Telegram ${kind} packages: ${e.stack || e.message}`);
          await sendOrEdit(ctx,
            `{emoji:FAIL} Failed to load Telegram ${kind === "stars" ? "Stars" : "Premium"} packages.\n\n${e.message}`,
            { reply_markup: { inline_keyboard: [[{ text: `${getBaseEmoji('BACK')} Back`, callback_data: "shop_back" }]] } }
          );
        }
        return;
      }

      if (data.startsWith("shop_manual:")) {
        const key = data.split(":")[1];
        const product = getManualProduct(key);
        if (!product || !product.enabled) {
          await sendOrEdit(ctx, `{emoji:FAIL} This product is currently unavailable.`, { reply_markup: get_main_keyboard() });
          return;
        }
        const buttons = (product.packages || []).map((pkg, idx) => ({
          text: `${getBaseEmoji(product.emoji)}${pkg.name} - ${Math.floor(Number(pkg.price)||0)} ETB`.trim(),
          callback_data: `manual_pkg:${key}:${idx}`,
          style: "primary"
        }));
        // Manual product layout: Roblox and TikTok use 2 per row.
        const twoPerRow = key === "roblox" || key === "tiktok";
        const rows = [];
        if (twoPerRow) {
          for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
        } else {
          for (const button of buttons) rows.push([button]);
        }
        rows.push([{ text:`${getBaseEmoji('BACK')} Back to Shop`, callback_data:"shop_back" }]);
        session.data.manual_product_key=key;
        session.data.manual_product_name=product.name;
        await sendOrEdit(ctx, `${getBaseEmoji(product.emoji)} <b>${product.name}</b>\n\nSelect the package you want:`, { reply_markup:{inline_keyboard:rows} });
        return;
      }

      if (data.startsWith("manual_pkg:")) {
        const parts=data.split(":"); const key=parts[1]; const idx=parseInt(parts[2],10);
        const product=getManualProduct(key); const pkg=product && product.packages ? product.packages[idx] : null;
        if(!product || !product.enabled || !pkg){ await sendOrEdit(ctx, `{emoji:FAIL} Package unavailable.`, {reply_markup:get_main_keyboard()}); return; }
        session.data.flow_type="manual";
        session.data.manual_product_key=key;
        session.data.manual_product_name=product.name;
        session.data.game_name=product.name;
        session.data.package_name=pkg.name;
        session.data.package_display_name=pkg.name;
        session.data.selected_pkg_id=String(pkg.id);
        session.data.charged_price=Number(pkg.price);
        session.data.api_price=Number(pkg.price);
        session.data.service_name="Manual Order";
        session.data.manual_details={};
        if (key === "cod") {
          session.state=STATE_MANUAL_EMAIL;
          await sendOrEdit(ctx, `{emoji:USER} <b>Enter your Call of Duty email</b>:`, {reply_markup:{inline_keyboard:[[ {text:`${getBaseEmoji('CANCEL')} Cancel`,callback_data:"cancel_action"} ]]}});
        } else if (key === "roblox" || key === "tiktok") {
          session.state=STATE_MANUAL_ID;
          await sendOrEdit(ctx, `{emoji:USER} <b>Enter your ${key === "roblox" ? "Roblox" : "TikTok"} username</b>:`, {reply_markup:{inline_keyboard:[[ {text:`${getBaseEmoji('CANCEL')} Cancel`,callback_data:"cancel_action"} ]]}});
        } else {
          session.state=STATE_CONFIRM;
        }
        return;
      }

      if (data === "shop_pubg") {
        try { const gr=await api_client.get_games(); const gs=gr&&gr.success?(gr.games||gr.data||[]):[]; const pg=gs.find(g=>normalize_game_name(g).toLowerCase().includes("pubg")||normalize_game_code(g).toLowerCase().includes("pubg")); if(pg) session.data.pubg_game_code=normalize_game_code(pg); } catch(_) {}
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, `${getBaseEmoji('PUBG')} <b>PUBG Mobile</b>\n\nSelect a category:`, { reply_markup: get_pubg_sub_keyboard() });
        return;
      }

      if (data === "pubg_mode:auto") {
        await sendOrEdit(ctx, `${getBaseEmoji('PUBG')} <b>PUBG Mobile Auto</b>\n\nSelect a category:`, {reply_markup:{inline_keyboard:[
          [{text:`${getBaseEmoji('PUBG_UC')} UC`,callback_data:"pubg_auto:uc",style:"primary"},{text:`${getBaseEmoji('PUBG_WOW')} WOW Coin`,callback_data:"pubg_auto:wow",style:"primary"}],
          [{text:`${getBaseEmoji('PUBG')} Prime`,callback_data:"pubg_auto:prime",style:"primary"},{text:`${getBaseEmoji('PUBG')} Prime Plus`,callback_data:"pubg_auto:prime_plus",style:"primary"}],
          [{text:`${getBaseEmoji('PUBG_ELITEPASS')} Elite Pass`,callback_data:"pubg_auto:elitepass",style:"primary"},{text:`${getBaseEmoji('PUBG_PACKS')} Packs`,callback_data:"pubg_auto:packs",style:"primary"}],
          [{text:`${getBaseEmoji('PUBG_OTHER')} Others`,callback_data:"pubg_auto:other",style:"primary"}],
          [{text:`${getBaseEmoji('BACK')} Back`,callback_data:"shop_pubg"}]
        ]}}); return;
      }
      if (data === "pubg_mode:manual") {
        const product=getManualProduct("pubg_manual");
        if(!product || !product.enabled){await sendOrEdit(ctx, `{emoji:FAIL} Manual PUBG products are currently unavailable.`, {reply_markup:{inline_keyboard:[[ {text:`${getBaseEmoji('BACK')} Back`,callback_data:"shop_pubg"} ]]}});return;}
        const buttons=(product.packages||[]).map((p,i)=>({text:`${p.name} - ${Math.floor(Number(p.price)||0)} ETB`,callback_data:`pubg_manual_pkg:${i}`,style:"primary"}));
        session.data.manual_product_key="pubg_manual"; session.data.manual_product_name=product.name; session.data.service_name="Manual PUBG";
        session.data.active_packages=product.packages.map((p,i)=>({id:String(p.id),name:p.name,display_name:p.name,price:Number(p.price)||0}));
        session.data.pkg_buttons=buttons; session.data.pkg_back="shop_pubg"; session.data.isOnePerRow=false; session.data.isPaginated=false;
        await render_package_page(ctx,session,0); return;
      }
      if (data.startsWith("pubg_auto:")) {
        const category=data.split(":")[1];
        // Continue through the existing G2Bulk catalogue flow.
        data=`pubg_sub:${category}`;
      }

      if (data.startsWith("pubg_sub:")) {
        const category = data.split(":")[1];
        let games = session.data.available_games || [];
        try {
          const gamesRes = await api_client.get_games();
          if (gamesRes && (gamesRes.success || gamesRes.games || gamesRes.data)) games = gamesRes.games || gamesRes.data || gamesRes.result || [];
        } catch (e) { logger.warn(`Failed to refresh games for PUBG: ${e.message}`); }
        const pubg = games.find(g => {
          const n = normalize_game_name(g).toLowerCase();
          const c = normalize_game_code(g).toLowerCase();
          return n.includes("pubg") || c.includes("pubg");
        });
        if (!pubg) {
          await sendOrEdit(ctx, `{emoji:FAIL} PUBG Mobile is currently unavailable.`, { reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] } });
          return;
        }
        const gameCode = normalize_game_code(pubg);
        const gameName = normalize_game_name(pubg);
        session.data.available_games = games;
        session.data.game_code = gameCode;
        session.data.game_name = gameName;
        session.data.flow_type = "pubg";
        await sendOrEdit(ctx, `${getBaseEmoji('PUBG')} <b>${gameName}</b>\n\nLoading ${pubgCategoryLabel(category)} packages...`);
        try {
          const res = await api_client.get_game_catalogue(gameCode);
          if (!res || !res.success) throw new Error((res && res.message) || "No catalogue returned");
          let packages = (res.catalogues || res.data || []).filter(pkg => pubgPackageCategory(pkg) === category);
          if (!packages.length) throw new Error(`No ${pubgCategoryLabel(category)} packages are currently available.`);
          const markup = await db.get_game_markup(gameCode);
          const overrides = new Map();
          for (const ov of await db.get_all_product_overrides()) {
            if (ov.game_code === gameCode && ov.price_override != null) overrides.set(String(ov.product_id || ov.id), Number(ov.price_override));
          }
          packages.sort((a,b) => {
            const an = pubgPackageDisplayName(a), bn = pubgPackageDisplayName(b);
            const av = /^\d+$/.test(an) ? Number(an) : Number.POSITIVE_INFINITY;
            const bv = /^\d+$/.test(bn) ? Number(bn) : Number.POSITIVE_INFINITY;
            if (av !== bv) return av - bv;
            return Number(a.unit_price ?? a.price ?? a.amount ?? a.cost ?? 0) - Number(b.unit_price ?? b.price ?? b.amount ?? b.cost ?? 0);
          });
          session.data.active_packages = packages;
          session.data.game_markup = markup;
          session.data.package_raw_names = {};
          // render_package_page() expects each item in pkg_buttons to be a
          // single InlineKeyboardButton object. Do NOT wrap these buttons in
          // another array here, otherwise Telegram receives a nested array
          // where an InlineKeyboardButton is required and returns:
          // "Text buttons are not allowed in the inline keyboard".
          const buttons = packages.map((pkg, idx) => {
            const id = String(pkg.id || pkg.code || pkg.name || idx);
            const rawName = pubgPackageDisplayName(pkg);
            const base = Number(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
            const charged = overrides.has(id) ? overrides.get(id) : api_price_to_birr(base, markup);
            session.data.package_raw_names[String(idx)] = rawName;
            session.data[`pkg_price_${idx}`] = charged;
            return { text: `${getBaseEmoji(getPubgCategoryEmojiKey(category))}${rawName} - ${Math.floor(charged)} ETB`.trim(), callback_data: `pkg_game:${idx}`, style: "primary" };
          });
          // render_package_page() adds the single Back button itself. Do not
          // put Back inside pkg_buttons, otherwise users get duplicate Back
          // buttons. PUBG package lists also do not need a useless Next/
          // Previous row, so render the complete category in one message.
          session.data.pkg_back = "shop_pubg";
          session.data.isOnePerRow = String(category).toLowerCase() !== "uc";
          session.data.isPaginated = false;
          session.data.pkg_buttons = buttons;
          await render_package_page(ctx, session, 0);
        } catch (e) {
          logger.error(`Error fetching PUBG ${category} packages: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Failed to load PUBG ${pubgCategoryLabel(category)} packages.\n\n${e.message}`, { reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back`, callback_data: "shop_pubg" }]] } });
        }
        return;
      }

      if (data === "shop_freefire") {
        try { const gr=await api_client.get_games(); const gs=gr&&gr.success?(gr.games||gr.data||[]):[]; const fg=gs.find(g=>{const n=normalize_game_name(g).toLowerCase(),c=normalize_game_code(g).toLowerCase(); return (n.includes("free fire")||n.includes("freefire")||c.includes("free_fire")||c.includes("freefire")) && (n.includes("middle east")||n.includes("middleeast")||c.includes("middle_east")||c.includes("middleeast")||c.endsWith("_me")||c.endsWith("-me")||c==="freefire_me");}); if(fg) session.data.ff_game_code=normalize_game_code(fg); } catch(_) {}
        await sendOrEdit(ctx, `{emoji:GAME} <b>Free Fire Middle East</b>\n\nChoose a package category. Products are fetched from G2Bulk and processed automatically:`, { reply_markup: get_freefire_sub_keyboard() });
        return;
      }

      if (data.startsWith("ff_auto:")) { data=`ff_sub:${data.split(":")[1]}`; }
      if (data === "ff_sub:vouchers") {
        const stock=appSettings.VOUCHER_STOCK || {};
        const denoms=["110","231","583","1188","2420"];
        const rows=[];
        for(const d of denoms){ const item=stock[d]||{}; const count=Array.isArray(item.codes)?item.codes.length:0; const price=Number(item.price)||0; if(count>0 && price>0) rows.push([{text:`🎟️ ${d} Diamonds - ${Math.floor(price)} ETB`,callback_data:`voucher_buy:${d}`,style:"primary"}]); }
        if(!rows.length) rows.push([{text:"No vouchers currently in stock",callback_data:"shop_freefire"}]);
        rows.push([{text:`${getBaseEmoji('BACK')} Back`,callback_data:"shop_freefire"}]);
        await sendOrEdit(ctx, `{emoji:FREE_FIRE} <b>Free Fire Vouchers</b>\n\nSelect denomination:`, {reply_markup:{inline_keyboard:rows}}); return;
      }
      if (data.startsWith("voucher_buy:")) {
        const denom=data.split(":")[1]; const item=(appSettings.VOUCHER_STOCK||{})[denom]||{}; const count=Array.isArray(item.codes)?item.codes.length:0; const price=Number(item.price)||0;
        if(count<1 || price<=0){await sendOrEdit(ctx, `{emoji:FAIL} This voucher is currently unavailable.`);return;}
        session.data.flow_type="voucher"; session.data.game_name="Free Fire Voucher"; session.data.service_name="Free Fire Voucher"; session.data.package_name=`${denom} Diamonds Voucher`; session.data.package_display_name=`${denom} Diamonds Voucher`; session.data.selected_pkg_id=denom; session.data.api_price=price; session.data.charged_price=price; session.data.voucher_denom=denom; session.state=STATE_VOUCHER_QTY;
        await sendOrEdit(ctx, `{emoji:USER} <b>How many ${denom} Diamonds vouchers?</b>\n\nPrice: <b>${Math.floor(price)} ETB each</b>\nStock: <b>${count}</b>`, {reply_markup:{inline_keyboard:[[ {text:`${getBaseEmoji('CANCEL')} Cancel`,callback_data:"cancel_action"} ]]}}); return;
      }
      // ---- Free Fire sub-category handling ----
      if (data.startsWith("ff_sub:")) {
        const category = data.split(":")[1];
        let games = session.data.available_games || [];
        try {
          const gamesRes = await api_client.get_games();
          if (gamesRes && (gamesRes.success || gamesRes.games || gamesRes.data)) games = gamesRes.games || gamesRes.data || gamesRes.result || [];
        } catch (e) { logger.warn(`Failed to refresh games: ${e.message}`); }
        session.data.available_games = games;
        const ffGame = games.find(g => {
          const n = normalize_game_name(g).toLowerCase();
          const c = normalize_game_code(g).toLowerCase();
          const isFreeFire = n.includes("free fire") || n.includes("freefire") || c.includes("free_fire") || c.includes("freefire");
          const isMiddleEast = n.includes("middle east") || n.includes("middleeast") || c.includes("middle_east") || c.includes("middleeast") || c.endsWith("_me") || c.endsWith("-me") || c === "freefire_me";
          return isFreeFire && isMiddleEast;
        });
        if (!ffGame) {
          await sendOrEdit(ctx, `{emoji:FAIL} Free Fire Middle East is currently unavailable.`, {
            reply_markup: { inline_keyboard: [[{ text: `{emoji:BACK} Back to Shop`, callback_data: "shop_back" }]] }
          });
          return;
        }
        const gameCode = normalize_game_code(ffGame);
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
              const isMembership = name.includes("membership") || name.includes("booyah") || name.includes("pass") || /^(weekly|monthly|super)$/.test(name.trim());
              return isMembership && !name.includes("level up") && !name.includes("levelup");
            } else if (category === "levelup") {
              return name.includes("level up") || name.includes("levelup");
            }
            return false;
          });
          
          // Do not require every package to have a hard-coded fixed price.
          // Fixed prices are used when present; otherwise the normal game
          // markup is used, and admins can set an individual override from
          // Admin -> Settings / Markup -> Game Prices -> Free Fire.
          if (!packages.length) throw new Error(`No ${category} packages available.`);
          packages = sort_game_packages(gameCode, packages);
          if (category === "membership") {
            const order = (n) => {
              const l = String(n).toLowerCase();
              return l.includes("weekly") ? 0 : l.includes("monthly") ? 1 : l === "super" ? 2 : l.includes("booyah") ? 3 : 99;
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
        let chargedPrice = session.data[`pkg_price_${idx}`] ??
          api_price_to_birr(apiPrice, session.data.game_markup || 0);
        const telegramParsed = session.data.flow_type === "telegram" ? identifyTelegramPackage(pkg) : null;
        if (telegramParsed?.type === "stars") {
          const adminPrice = Number(getTelegramStarsPrices()[String(telegramParsed.amount)]);
          if (Number.isFinite(adminPrice) && adminPrice > 0) chargedPrice = adminPrice;
        } else if (telegramParsed?.type === "premium") {
          const adminPrice = Number(getTelegramPremiumPrices()[String(telegramParsed.months)]);
          if (Number.isFinite(adminPrice) && adminPrice > 0) chargedPrice = adminPrice;
        }
        session.data.selected_pkg_id = pkg.id || pkg.code || rawName;
        session.data.package_name = pkg.catalogue_name || pkg.display_name || pkg.name || pkg.title || pkg.code || rawName;
        session.data.package_display_name = rawName;
        session.data.api_price = apiPrice;
        session.data.charged_price = chargedPrice;
        session.data.markup = session.data.game_markup || 0;
        session.data.service_name = pkg.service || pkg.description || "Direct Top-Up";

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

        if (session.data.flow_type === "manual") {
          session.state = STATE_CONFIRM;
          const summary = "━━━━━━━━━━━━━━━━━━━━━━\n" +
            `{emoji:ORDERS} <b>Order Summary</b>\n\n` +
            `{emoji:${session.data.manual_product_key ? getManualProduct(session.data.manual_product_key)?.emoji || "GAME" : "GAME"}} <b>Product:</b> ${getProductLogName(session)}\n` +
            `{emoji:ORDERS} <b>Package:</b> ${session.data.package_display_name || session.data.package_name}\n` +
            `{emoji:MONEY} <b>Price:</b> ${Math.floor(session.data.charged_price)} ETB\n` +
            "━━━━━━━━━━━━━━━━━━━━━━";
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
        if (!TIKUR_PAY_API_KEY) {
          logger.error("TIKUR_PAY_API_KEY is not set; cannot create checkout sessions.");
          await sendOrEdit(ctx, `{emoji:FAIL} Payments are temporarily unavailable. Please try again later.`, { reply_markup: get_main_keyboard() });
          clearUserSession(userId);
          return;
        }
        const charged_price = Math.round(Number(session.data.charged_price || 0) * 100) / 100;
        if (!(charged_price > 0)) {
          await sendOrEdit(ctx, `{emoji:FAIL} The order price is invalid. Please start the order again.`, { reply_markup: get_main_keyboard() });
          clearUserSession(userId);
          return;
        }
        const productName = session.data.manual_product_name || session.data.game_name || session.data.service_name || "Product";
        const packageName = session.data.package_display_name || session.data.package_name || "";

        // Pressing Confirm twice must not create a second checkout session.
        const existingPn = session.data.tikur_payment_number;
        if (existingPn && tikurPending.has(existingPn)) {
          const ex = tikurPending.get(existingPn);
          await sendOrEdit(ctx, ex.messageText, { reply_markup: ex.keyboard });
          return;
        }

        await sendOrEdit(ctx, `{emoji:PAY} Creating your payment link...`);
        let tikur;
        try {
          tikur = await tikur_create_session(charged_price, `${productName} - ${packageName}`.trim());
        } catch (e) {
          logger.error(`Tikur Pay create failed: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Could not create the payment link. Please try again in a moment.`, {
            reply_markup: { inline_keyboard: [
              [{ text: `{emoji:BACK} Try Again`, callback_data: "order_confirm", style: "primary" }],
              [{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }],
            ] }
          });
          return;
        }

        // Snapshot of everything needed to deliver the order later (survives a bot restart).
        const SKIP_KEYS = /^(active_packages|pkg_buttons|pkg_buttons_all|region_games|package_raw_names|pubg_cat_index|pkg_price_\d+|game_markup)$/;
        const snapshot = {};
        for (const [k, v] of Object.entries(session.data)) { if (!SKIP_KEYS.test(k)) snapshot[k] = v; }
        const safeSnapshot = JSON.parse(JSON.stringify(snapshot));

        // The Tikur payment number is stored as the order reference so it can be looked up later.
        const pendingOrderId = await db.create_order(
          userId, productName, packageName,
          Number(session.data.api_price || 0), charged_price, "pending_payment", tikur.payment_number
        );
        session.data.pending_order_id = pendingOrderId;
        session.data.tikur_payment_number = tikur.payment_number;
        safeSnapshot.pending_order_id = pendingOrderId;
        safeSnapshot.tikur_payment_number = tikur.payment_number;
        await db.update_order(pendingOrderId, {
          payment_method: "tikurpay",
          payment_stage: "awaiting_payment",
          tikur_payment_number: tikur.payment_number,
          game_code: session.data.game_code || session.data.telegram_game_code || "Telegram",
          selected_pkg_id: session.data.selected_pkg_id || "",
          player_id: session.data.player_id || "",
          server_id: session.data.server_id || null,
          flow_type: session.data.flow_type || "game",
          service_name: session.data.service_name || "",
          game_name: productName,
          package_display_name: packageName,
          session_data: safeSnapshot,
        });

        const messageText =
          `{emoji:PAY} <b>Payment</b>\n\n` +
          `{emoji:${getProductEmojiKey(session)}} <b>${packageName || productName}</b>\n` +
          `{emoji:MONEY} <b>Amount:</b> ${charged_price % 1 === 0 ? charged_price : charged_price.toFixed(2)} ETB\n\n` +
          `1️⃣ Tap <b>Pay Now</b> and complete the payment.\n` +
          `2️⃣ Come back here and tap <b>Check Status</b>.\n\n` +
          `⏰ This payment link expires in ${TIKUR_SESSION_MINUTES} minutes.`;
        const keyboard = { inline_keyboard: [
          [{ text: "💳 Pay Now", url: tikur.checkout_url, style: "primary" }],
          [{ text: "🔄 Check Status", callback_data: `tikur_check:${tikur.payment_number}`, style: "primary" }],
          [{ text: `{emoji:CANCEL} Cancel`, callback_data: "order_cancel", style: "danger" }],
        ] };
        tikurPending.set(tikur.payment_number, { userId, orderId: pendingOrderId, snapshot: safeSnapshot, messageText, keyboard });
        session.state = STATE_PAYMENT_METHOD; // waiting for the user to pay; no text input expected

        const maskLogUserId = (v) => { const id = String(v || ""); return id.length <= 6 ? id : `${id.slice(0, 3)}****${id.slice(-3)}`; };
        const maskLogOrderCode = (v) => { const c = String(v || ""); return c.length <= 5 ? c : `${c.slice(0, 3)}***${c.slice(-2)}`; };
        await report_event(bot,
          `{emoji:PENDING_PAYMENT} <b>New Pending Order!</b>\n\n` +
          `{emoji:${getProductEmojiKey(session)}} <b>Product:</b> ${packageName || productName}\n\n` +
          `{emoji:USER} <b>By:</b> <code>${maskLogUserId(userId)}</code>\n` +
          `{emoji:ORDERS} <b>Order Code:</b> <code>${maskLogOrderCode(pendingOrderId)}</code>\n` +
          `{emoji:MONEY} <b>Total:</b> ${charged_price.toFixed(2)} ETB\n\n` +
          `{emoji:STATUS} <b>Status:</b> Pending Payment`
        );
        await clear_last_photo(ctx, session);
        await sendOrEdit(ctx, messageText, { reply_markup: keyboard });
        return;
      }

      // Old payment-method buttons (from messages sent before Tikur Pay) are no longer valid.
      if (data.startsWith("pay_method:")) {
        await sendOrEdit(ctx, `{emoji:FAIL} This payment option is no longer available. Please start your order again.`, { reply_markup: get_main_keyboard() });
        clearUserSession(userId);
        return;
      }

      // ---- Tikur Pay: user taps "Check Status" after paying ----
      if (data.startsWith("tikur_check:")) {
        const pn = data.slice("tikur_check:".length);
        if (tikurChecking.has(pn)) { await ctx.answerCbQuery("Checking... please wait.").catch(() => {}); return; }
        tikurChecking.add(pn);
        try {
          let entry = tikurPending.get(pn) || null;
          if (!entry) {
            let orderDoc = null;
            try { orderDoc = await db.find_order_by_reference(pn); } catch (_) {}
            if (orderDoc) entry = { userId: Number(orderDoc.telegram_id), orderId: orderDoc.order_id, snapshot: orderDoc.session_data || null };
          }
          if (!entry || String(entry.userId) !== String(userId)) {
            await ctx.answerCbQuery("This order is no longer available.", { show_alert: true }).catch(() => {});
            return;
          }

          const result = await tikur_get_status(pn);

          if (result.state === "pending") {
            await ctx.answerCbQuery("⏳ Payment not received yet. Complete the payment with Pay Now, then tap Check Status again.", { show_alert: true }).catch(() => {});
            return;
          }
          if (result.state === "error") {
            logger.warn(`Tikur status check error for ${pn}: ${result.reason}`);
            await ctx.answerCbQuery("Couldn't check the payment right now. Please try again in a moment.", { show_alert: true }).catch(() => {});
            return;
          }
          await ctx.answerCbQuery().catch(() => {});

          if (result.state === "failed") {
            try { await db.update_order(entry.orderId, { status: "failed", payment_stage: "failed", payment_error: String(result.reason || "payment failed") }); } catch (_) {}
            tikurPending.delete(pn);
            await clear_last_photo(ctx, session);
            clearUserSession(userId);
            await sendOrEdit(ctx, `{emoji:FAIL} <b>Payment failed</b>\n\nYour payment was not completed or the link expired, so the order was cancelled. Nothing was delivered.`, { reply_markup: get_main_keyboard() });
            return;
          }

          // ---- completed ----
          if (!entry.snapshot) {
            await sendOrEdit(ctx, `{emoji:FAIL} Your payment was received but the order details were lost. Please contact ${ADMIN_USERNAME} with payment number <code>${pn}</code>.`, { reply_markup: get_main_keyboard() });
            await report_event(bot, `{emoji:FAIL} <b>Paid order without details</b>\nUser: <code>${userId}</code>\nTikur payment: <code>${pn}</code>`);
            return;
          }
          if (session.data.tikur_payment_number !== pn) {
            // Session was lost (e.g. bot restarted): rebuild it from the saved snapshot.
            Object.assign(session.data, entry.snapshot, { pending_order_id: entry.orderId, tikur_payment_number: pn });
          }
          const charged_price = Number(session.data.charged_price || 0);
          const paidAmount = Number(result.data && result.data.amount);
          if (Number.isFinite(paidAmount) && paidAmount + 0.01 < charged_price) {
            try { await db.update_order(entry.orderId, { status: "pending_payment", payment_error: `Underpayment: ${paidAmount} < ${charged_price}` }); } catch (_) {}
            await sendOrEdit(ctx, `{emoji:FAIL} The paid amount (${paidAmount} ETB) is lower than the order price (${charged_price} ETB). Please contact ${ADMIN_USERNAME} with payment number <code>${pn}</code>.`, { reply_markup: get_main_keyboard() });
            await report_event(bot, `{emoji:FAIL} <b>Underpayment</b>\nUser: <code>${userId}</code>\nTikur payment: <code>${pn}</code>\nPaid: ${paidAmount} / Price: ${charged_price}`);
            return;
          }
          const claim = await db.claim_transaction_use(pn, userId, charged_price, {
            type: isManualFlow(session) ? "manual_order" : "product_order",
            payment_method: "tikurpay",
            canonical_transaction_id: pn
          });
          if (!claim.claimed) {
            await sendOrEdit(ctx, `{emoji:FAIL} This payment has already been used.`, { reply_markup: get_main_keyboard() });
            tikurPending.delete(pn);
            clearUserSession(userId);
            return;
          }
          tikurPending.delete(pn);

          if (isManualFlow(session)) {
            // Manual products: after payment, hand the customer the prepared DM link.
            const product = session.data.manual_product_name || session.data.game_name || "Manual Product";
            const packageName = session.data.package_display_name || session.data.package_name || "";
            try { await db.update_order(entry.orderId, { status: "manual_pending", payment_stage: "verified", verified_amount: charged_price, flow_type: "manual", manual_product: product }); } catch (_) {}
            await sendOrEdit(ctx, `{emoji:SUCCESS} Payment confirmed.\n\nYour prepared direct-message link is ready. Tap it to open the chat with the order text already filled in.`, {
              reply_markup: manualOrderKeyboard(`${product} - ${packageName}`, charged_price, pn)
            });
            clearUserSession(userId);
            return;
          }

          try { await db.update_order(entry.orderId, { status: "processing", payment_stage: "paid", verified_amount: charged_price }); } catch (_) {}
          await sendOrEdit(ctx, ` Payment confirmed. Processing your order...`);
          await place_order_flow(ctx, session, db, api_client, bot, "tikurpay", pn, charged_price);
          return;
        } finally {
          tikurChecking.delete(pn);
        }
      }

      if (data === "order_cancel") {
        const pendingOrderId = session.data.pending_order_id;
        if (session.data.tikur_payment_number) {
          const _pn = session.data.tikur_payment_number;
          tikurPending.delete(_pn);
          axios.delete(`${TIKUR_PAY_BASE_URL}/api/checkout/session/${encodeURIComponent(_pn)}`,
            { headers: { "x-api-key": TIKUR_PAY_API_KEY }, timeout: 10000, validateStatus: () => true }).catch(() => {});
        }
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

      // ---- Wallet removed ----
      if (data === "menu_wallet" || data.startsWith("dep_method:")) {
        await sendOrEdit(ctx, `{emoji:FAIL} The wallet is no longer available. You can pay for orders directly when you check out.`, { reply_markup: get_main_keyboard() });
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
          `{emoji:GAME} <b>Buy Services:</b>\n` +
          "1. Tap <b>Shop</b> and select a service.\n" +
          "2. Choose your package.\n" +
          "3. Enter your player ID or username.\n" +
          "4. Confirm, tap <b>Pay Now</b> to pay, then tap <b>Check Status</b>.\n\n" +
          `{emoji:USER} <b>Referral:</b>\n` +
          `Tap Referral in Profile to get your invite link. Each friend earns you ${REFERRAL_REWARD} ETB instantly.\n\n` +
          `Need more help? Contact ${ADMIN_USERNAME}`;
        await sendOrEdit(ctx, help_msg, { reply_markup: get_support_keyboard() });
        return;
      }

      // ---- Admin panel callbacks ----
      if (ADMIN_CHAT_IDS.includes(userId)) {
        // Admin navigation
        if (data === "admin_dashboard") {
          const stats = await db.get_dashboard_stats();
          const dashboard_text =
            `{emoji:INFO} <b>Dashboard</b>\n\n` +
            `{emoji:USER} Total Users: ${stats.total_users}\n` +
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

        if (data === "admin_buttons") {
          await sendOrEdit(ctx, "🧩 <b>Menu Button Manager</b>\n\nSelect a button to change its label or show/hide it. Hidden buttons are removed from the customer menu.", { reply_markup: getButtonManagerKeyboard() });
          return;
        }
        if (data.startsWith("admin_btn_select:")) {
          const id = data.split(":")[1];
          const info = MANAGED_BUTTONS[id];
          if (!info) return;
          await sendOrEdit(ctx, `<b>${info.group} button</b>\nCurrent label: <code>${managedButtonConfig(id).label || info.defaultLabel.replace(/\{emoji:[A-Z_]+\}/g, "")}</code>\nStatus: ${managedButtonConfig(id).hidden ? "Hidden" : "Visible"}`, { reply_markup: getButtonEditKeyboard(id) });
          return;
        }
        if (data.startsWith("admin_btn_toggle:")) {
          const id = data.split(":")[1];
          if (!MANAGED_BUTTONS[id]) return;
          appSettings.MANAGED_BUTTONS ||= {};
          appSettings.MANAGED_BUTTONS[id] = { ...appSettings.MANAGED_BUTTONS[id], hidden: !appSettings.MANAGED_BUTTONS[id]?.hidden };
          await db.save_setting("managed_buttons", appSettings.MANAGED_BUTTONS, appSettings);
          await sendOrEdit(ctx, `Button ${appSettings.MANAGED_BUTTONS[id].hidden ? "hidden" : "shown"}.`, { reply_markup: getButtonEditKeyboard(id) });
          return;
        }
        if (data.startsWith("admin_btn_label:")) {
          const id = data.split(":")[1];
          if (!MANAGED_BUTTONS[id]) return;
          session.state = STATE_ADMIN_BUTTON_LABEL;
          session.data.button_id = id;
          await sendOrEdit(ctx, "Send the new button label. You can include normal emoji.");
          return;
        }
        if (data.startsWith("admin_btn_reset:")) {
          const id = data.split(":")[1];
          if (!MANAGED_BUTTONS[id]) return;
          appSettings.MANAGED_BUTTONS ||= {};
          delete appSettings.MANAGED_BUTTONS[id];
          await db.save_setting("managed_buttons", appSettings.MANAGED_BUTTONS, appSettings);
          await sendOrEdit(ctx, "Button label reset to default.", { reply_markup: getButtonEditKeyboard(id) });
          return;
        }
        if (data.startsWith("admin_custom_delete:")) {
          const id = data.slice("admin_custom_delete:".length);
          appSettings.CUSTOM_MENU_BUTTONS = (appSettings.CUSTOM_MENU_BUTTONS || []).filter(b => String(b.id) !== id);
          await db.save_setting("custom_menu_buttons", appSettings.CUSTOM_MENU_BUTTONS, appSettings);
          await sendOrEdit(ctx, "Custom menu button deleted.", { reply_markup: getButtonManagerKeyboard() });
          return;
        }
        if (data === "admin_btn_add") {
          session.state = STATE_ADMIN_BUTTON_ADD;
          await sendOrEdit(ctx, "Send the custom button as two lines:\n<code>Button label\nhttps://example.com</code>\nSend <code>cancel</code> to stop.");
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

        // ---- Telegram Stars / Premium price management ----
        if (data.startsWith("admin_telegram_prices:")) {
          const kind = data.split(":")[1];
          session.data.admin_telegram_price_kind = kind;
          try {
            let packages = kind === "stars"
              ? await catalog_service.get_telegram_stars_packages(true)
              : await catalog_service.get_telegram_premium_plans(true);
            packages = sort_telegram_packages(packages);
            if (!packages.length) throw new Error(`No Telegram ${kind === "stars" ? "Stars" : "Premium"} packages were found.`);
            session.data.admin_telegram_packages = packages;
            const prices = kind === "stars" ? getTelegramStarsPrices() : getTelegramPremiumPrices();
            const buttons = packages.map((pkg, idx) => {
              const raw = String(pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || `Package ${idx + 1}`);
              const parsed = parseTelegramPackageName(raw);
              const key = kind === "stars" ? String(parsed?.amount || "") : String(parsed?.months || "");
              const defaultPrice = kind === "stars" ? FIXED_STARS_PRICES[Number(key)] : TELEGRAM_PREMIUM_PRICES[Number(key)];
              const price = Number(prices[key] ?? defaultPrice ?? 0);
              const label = kind === "stars"
                ? `${parsed?.amount || raw} stars`
                : `${parsed?.months || raw} ${Number(parsed?.months) === 1 ? "Month" : "Months"} Premium`;
              return [{ text: `${label} - ${Math.floor(price)} ETB`, callback_data: `admin_telegram_price:${idx}` }];
            });
            buttons.push([{ text: "🔙 Back", callback_data: "admin_settings" }]);
            await sendOrEdit(ctx, `${kind === "stars" ? "⭐" : "💎"} <b>Telegram ${kind === "stars" ? "Stars" : "Premium"} Prices</b>\n\nSelect a package to change its selling price.`, { reply_markup: { inline_keyboard: buttons } });
          } catch (e) {
            await sendOrEdit(ctx, `{emoji:FAIL} Failed to load Telegram prices.\n\n${e.message}`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_settings" }]] } });
          }
          return;
        }

        if (data.startsWith("admin_telegram_price:")) {
          const idx = parseInt(data.split(":")[1], 10);
          const pkg = (session.data.admin_telegram_packages || [])[idx];
          const kind = session.data.admin_telegram_price_kind;
          if (!pkg || !kind) { await sendOrEdit(ctx, "Price session expired."); return; }
          const raw = String(pkg.display_name || pkg.name || pkg.title || pkg.catalogue_name || "Package");
          const parsed = parseTelegramPackageName(raw);
          const key = kind === "stars" ? String(parsed?.amount || "") : String(parsed?.months || "");
          if (!key) { await sendOrEdit(ctx, "Could not identify this Telegram package."); return; }
          session.data.admin_telegram_price_key = key;
          session.state = STATE_ADMIN_TELEGRAM_PRICE;
          const prices = kind === "stars" ? getTelegramStarsPrices() : getTelegramPremiumPrices();
          const fallback = kind === "stars" ? FIXED_STARS_PRICES[Number(key)] : TELEGRAM_PREMIUM_PRICES[Number(key)];
          const current = Number(prices[key] ?? fallback ?? 0);
          const label = kind === "stars" ? `${key} Stars` : `${key} Month${Number(key) === 1 ? "" : "s"} Telegram Premium`;
          await sendOrEdit(ctx, `Enter the selling price in ETB for <b>${label}</b>.\n\nCurrent: <b>${Math.floor(current)} ETB</b>\nEnter <code>0</code> to restore the default price.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: `admin_telegram_prices:${kind}` }]] } });
          return;
        }

        // ---- Admin Manual Product Management ----
        if (data === "admin_manual_products") {
          const products=getManualProducts();
          const labels={roblox:"Roblox Robux",cod:"Call of Duty",tiktok:"TikTok Coin",pubg_manual:"PUBG MOBILE UC Manual"};
          const kb=Object.keys(labels).map(key=>[{text:`${products[key].enabled?"ON":"OFF"} ${labels[key]}`,callback_data:`admin_manual_select:${key}`}]);
          kb.push([{text:"🔙 Back",callback_data:"admin_settings"}]);
          await sendOrEdit(ctx, `{emoji:GAME} <b>Manual Products</b>\n\nSelect a product to edit its packages, prices or availability.`, {reply_markup:{inline_keyboard:kb}});
          return;
        }
        if (data.startsWith("admin_manual_select:")) {
          const key=data.split(":")[1]; const product=getManualProduct(key);
          if(!product){await sendOrEdit(ctx,"Product not found.");return;}
          session.data.admin_manual_key=key;
          const kb=[[{text:product.enabled?"Disable Product":"Enable Product",callback_data:"admin_manual_toggle"}]];
          for(let i=0;i<product.packages.length;i++) kb.push([{text:`${product.packages[i].name} - ${Math.floor(Number(product.packages[i].price))} ETB`,callback_data:`admin_manual_price:${i}`}]);
          kb.push([{text:"🔙 Back",callback_data:"admin_manual_products"}]);
          await sendOrEdit(ctx, `{emoji:${product.emoji}} <b>${product.name}</b>\n\nTap a package to change its selling price.`, {reply_markup:{inline_keyboard:kb}});
          return;
        }
        if (data === "admin_manual_toggle") {
          const key=session.data.admin_manual_key; const product=getManualProduct(key);
          if(!product){await sendOrEdit(ctx,"Product session expired.");return;}
          product.enabled=!product.enabled;
          await db.save_setting("MANUAL_PRODUCTS",getManualProducts(),appSettings);
          await sendOrEdit(ctx, `{emoji:SUCCESS} ${product.name} is now <b>${product.enabled?"enabled":"disabled"}</b>.`, {reply_markup:{inline_keyboard:[[{text:"🔙 Back",callback_data:`admin_manual_select:${key}`}]]}});
          return;
        }
        if (data.startsWith("admin_manual_price:")) {
          const key=session.data.admin_manual_key; const product=getManualProduct(key); const idx=parseInt(data.split(":")[1],10);
          if(!product || !product.packages[idx]){await sendOrEdit(ctx,"Package not found.");return;}
          session.data.admin_manual_package_index=idx; session.state=STATE_ADMIN_MANUAL_PRICE;
          await sendOrEdit(ctx, `Enter the new ETB price for <b>${product.packages[idx].name}</b>.\nEnter <code>0</code> to disable this package.`, {reply_markup:{inline_keyboard:[[{text:"🔙 Back",callback_data:`admin_manual_select:${key}`}]]}});
          return;
        }

        // ---- Admin Voucher Management ----
        if (data === "admin_voucher") {
          const stock=appSettings.VOUCHER_STOCK||{}; const denoms=["110","231","583","1188","2420"];
          const kb=denoms.map(d=>{const x=stock[d]||{}; return [{text:`${d} Diamonds | ${Math.floor(Number(x.price)||0)} ETB | ${Array.isArray(x.codes)?x.codes.length:0} stock`,callback_data:`admin_voucher_select:${d}`}];});
          kb.push([{text:"🔙 Back",callback_data:"admin_back"}]);
          await sendOrEdit(ctx, `{emoji:GAME} <b>Free Fire Voucher Stock</b>\n\nSelect a denomination:`, {reply_markup:{inline_keyboard:kb}}); return;
        }
        if (data.startsWith("admin_voucher_select:")) {
          const denom=data.split(":")[1]; session.data.admin_voucher_denom=denom; const x=(appSettings.VOUCHER_STOCK||{})[denom]||{};
          await sendOrEdit(ctx, `<b>${denom} Diamonds Voucher</b>\n\nPrice: <b>${Math.floor(Number(x.price)||0)} ETB</b>\nStock: <b>${Array.isArray(x.codes)?x.codes.length:0}</b>`, {reply_markup:{inline_keyboard:[
            [{text:"💰 Set Price",callback_data:"admin_voucher_set_price"}],
            [{text:"➕ Add Codes",callback_data:"admin_voucher_add_codes"}],
            [{text:"📋 View Stock",callback_data:"admin_voucher_view"}],
            [{text:"🔙 Back",callback_data:"admin_voucher"}]
          ]}}); return;
        }
        if (data === "admin_voucher_set_price") { session.state=STATE_ADMIN_VOUCHER_PRICE; await sendOrEdit(ctx, `Enter the selling price in ETB for <b>${session.data.admin_voucher_denom} Diamonds</b>:`); return; }
        if (data === "admin_voucher_add_codes") { session.state=STATE_ADMIN_VOUCHER_STOCK; await sendOrEdit(ctx, `Send voucher codes for <b>${session.data.admin_voucher_denom} Diamonds</b>, one code per line. Existing stock will be kept.`); return; }
        if (data === "admin_voucher_view") { const d=session.data.admin_voucher_denom; const codes=(appSettings.VOUCHER_STOCK||{})[d]?.codes||[]; const preview=codes.slice(0,50).map((c,i)=>`${i+1}. <code>${String(c)}</code>`).join("\n")||"No stock."; await sendOrEdit(ctx, `<b>${d} Diamonds Voucher Stock</b>\n\n${preview}`, {reply_markup:{inline_keyboard:[[{text:"🔙 Back",callback_data:`admin_voucher_select:${d}`}]]}}); return; }

        // ---- Admin Game Management ----
        if (data === "admin_game_products") {
          let games = [];
          try {
            const gamesRes = await api_client.get_games();
            games = gamesRes && gamesRes.success ? gamesRes.games || gamesRes.data || [] : [];
          } catch (e) { logger.error(`Failed to fetch games for admin: ${e.message}`); }
          session.data.admin_games = games;
          const pubg = games.find(g => {
            const n = normalize_game_name(g).toLowerCase();
            const c = normalize_game_code(g).toLowerCase();
            return n.includes("pubg") || c.includes("pubg");
          });
          const buttons = [];
          if (pubg) buttons.push([{ text: `${getBaseEmoji('PUBG')} PUBG Mobile Prices`.trim(), callback_data: `admin_pubg_select:${normalize_game_code(pubg)}` }]);
          else buttons.push([{ text: "🎮 PUBG Mobile (Not found)", callback_data: "admin_back" }]);
          // Free Fire MUST be the Middle East catalogue. Never fall back to Europe/global.
          const freeFire = games.find(g => {
            const n = normalize_game_name(g).toLowerCase();
            const c = normalize_game_code(g).toLowerCase();
            const isFreeFire = n.includes("free fire") || n.includes("freefire") || c.includes("free_fire") || c.includes("freefire");
            const isMiddleEast = n.includes("middle east") || n.includes("middleeast") ||
              c.includes("middle_east") || c.includes("middleeast") || c.endsWith("_me") || c.endsWith("-me") || c === "freefire_me";
            return isFreeFire && isMiddleEast;
          });
          if (freeFire) buttons.push([{ text: `${getBaseEmoji('FREE_FIRE')} Free Fire Middle East Prices`.trim(), callback_data: `admin_game_select:${normalize_game_code(freeFire)}` }]);
          else buttons.push([{ text: "🔥 Free Fire Middle East (Not found)", callback_data: "admin_back" }]);
          buttons.push([{ text: "Global Games Markup", callback_data: "admin_global_markup" }]);
          buttons.push([{ text: "🔙 Back", callback_data: "admin_settings" }]);
          await sendOrEdit(ctx, `{emoji:GAME} <b>Game Products Management</b>\n\nManage PUBG Mobile UC, WOW Coin, Packs and Other packages.`, { reply_markup: { inline_keyboard: buttons } });
          return;
        }

        if (data.startsWith("admin_pubg_select:")) {
          const code = data.slice("admin_pubg_select:".length);
          session.data.admin_pubg_code = code;
          const name = (session.data.admin_games || []).find(g => normalize_game_code(g) === code);
          session.data.admin_pubg_name = name ? normalize_game_name(name) : "PUBG Mobile";
          await sendOrEdit(ctx, `${getBaseEmoji('PUBG')} <b>${session.data.admin_pubg_name} Prices</b>\n\nSelect a category:`, { reply_markup: { inline_keyboard: [
            [{ text: "UC", callback_data: "admin_pubg_cat:uc" }],
            [{ text: "WOW Coin", callback_data: "admin_pubg_cat:wow" }],
            [{ text: "Elite Pass", callback_data: "admin_pubg_cat:elitepass" }, { text: "Prime", callback_data: "admin_pubg_cat:prime" }],
            [{ text: "Prime Plus", callback_data: "admin_pubg_cat:prime_plus" }],
            [{ text: "Packs", callback_data: "admin_pubg_cat:packs" }],
            [{ text: "Others", callback_data: "admin_pubg_cat:other" }],
            [{ text: "🔙 Back", callback_data: "admin_game_products" }]
          ] } });
          return;
        }

        if (data.startsWith("admin_pubg_cat:")) {
          const category = data.slice("admin_pubg_cat:".length);
          const code = session.data.admin_pubg_code;
          if (!code) { await sendOrEdit(ctx, "PUBG price session expired."); return; }
          try {
            const res = await api_client.get_game_catalogue(code);
            let packages = res && res.success ? res.catalogues || res.data || [] : [];
            packages = packages.filter(pkg => pubgPackageCategory(pkg) === category);
            if (!packages.length) throw new Error("No packages found in this category.");
            session.data.admin_pubg_packages = packages;
            session.data.admin_pubg_category = category;
            const overrides = new Map();
            for (const ov of await db.get_all_product_overrides()) {
              if (ov.game_code === code && ov.price_override != null) overrides.set(String(ov.product_id || ov.id), Number(ov.price_override));
            }
            const markup = await db.get_game_markup(code);
            const buttons = packages.map((pkg, idx) => {
              const id = String(pkg.id || pkg.code || pkg.name || idx);
              const raw = pubgPackageDisplayName(pkg);
              const base = Number(pkg.unit_price ?? pkg.price ?? pkg.amount ?? pkg.cost ?? 0);
              const price = overrides.has(id) ? overrides.get(id) : api_price_to_birr(base, markup);
              return [{ text: `${raw} - ${Math.floor(price)} ETB`, callback_data: `admin_pubg_price:${idx}` }];
            });
            buttons.push([{ text: "🔙 Back", callback_data: `admin_pubg_select:${code}` }]);
            await sendOrEdit(ctx, `{emoji:MONEY} <b>${session.data.admin_pubg_name} - ${pubgCategoryLabel(category)}</b>\n\nSelect a package:`, { reply_markup: { inline_keyboard: buttons } });
          } catch (e) {
            await sendOrEdit(ctx, `{emoji:FAIL} Failed to load PUBG packages.\n\n${e.message}`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: `admin_pubg_select:${code}` }]] } });
          }
          return;
        }

        if (data.startsWith("admin_pubg_price:")) {
          const idx = parseInt(data.split(":")[1], 10);
          const pkg = (session.data.admin_pubg_packages || [])[idx];
          if (!pkg) { await sendOrEdit(ctx, `{emoji:FAIL} Package unavailable.`); return; }
          session.data.admin_game_price_product_id = String(pkg.id || pkg.code || pkg.name || idx);
          session.data.admin_game_price_name = pubgPackageDisplayName(pkg);
          session.data.admin_game_code = session.data.admin_pubg_code;
          session.state = STATE_ADMIN_GAME_PRICE_INPUT;
          await sendOrEdit(ctx, `Enter the selling price in ETB for <b>${session.data.admin_game_price_name}</b>.\nEnter <code>0</code> to remove the override.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: `admin_pubg_cat:${session.data.admin_pubg_category}` }]] } });
          return;
        }

        // Admin price handlers
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
                /booyah|membership|weekly|monthly|^super$/.test(lowerCleaned) ? "membership" :
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
      logger.error("CRASH IN CALLBACK HANDLER: " + (err?.stack || JSON.stringify(err, Object.getOwnPropertyNames(err || {})) || String(err)));
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

      if (session.state === STATE_MANUAL_ID) {
        if (!text) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter a valid username.`); return; }
        session.data.manual_details.username=text; session.state=STATE_MANUAL_PASSWORD;
        await sendOrEdit(ctx, `{emoji:USER} <b>Enter your password</b>:`);
        return;
      }
      if (session.state === STATE_MANUAL_NAME) {
        if (!text) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter a valid name.`); return; }
        session.data.manual_details.name=text; session.state=STATE_CONFIRM;
        return;
      }
      if (session.state === STATE_MANUAL_EMAIL) {
        if (!text || !/^\S+@\S+\.\S+$/.test(text)) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter a valid email address.`); return; }
        session.data.manual_details.email=text; session.state=STATE_MANUAL_PASSWORD;
        await sendOrEdit(ctx, `{emoji:USER} <b>Enter your password</b>:`); return;
      }
      if (session.state === STATE_MANUAL_PASSWORD) {
        if (!text) { await sendOrEdit(ctx, `{emoji:FAIL} Please enter your password.`); return; }
        session.data.manual_details.password=text; session.state=STATE_CONFIRM;
        const p=getManualProduct(session.data.manual_product_key); const d=session.data.manual_details;
        const accountLine=d.username ? `{emoji:USER} <b>Username:</b> ${d.username}` : `{emoji:USER} <b>Email:</b> ${d.email}`;
        const summary=`━━━━━━━━━━━━━━━━━━━━━━\n{emoji:ORDERS} <b>Order Summary</b>\n\n{emoji:${p?.emoji||"GAME"}} <b>Product:</b> ${p?.name||session.data.manual_product_name}\n{emoji:ORDERS} <b>Package:</b> ${session.data.package_display_name}\n${accountLine}\n{emoji:USER} <b>Password:</b> ••••••••\n{emoji:MONEY} <b>Price:</b> ${Math.floor(Number(session.data.charged_price)||0)} ETB\n━━━━━━━━━━━━━━━━━━━━━━`;
        await sendOrEdit(ctx,summary,{reply_markup:get_confirmation_keyboard()}); return;
      }

      if (session.state === STATE_VOUCHER_QTY) {
        const qty=parseInt(text,10); const denom=session.data.voucher_denom; const item=(appSettings.VOUCHER_STOCK||{})[denom]||{}; const stock=Array.isArray(item.codes)?item.codes.length:0; const unit=Number(item.price)||0;
        if(!Number.isInteger(qty)||qty<1||qty>stock){await sendOrEdit(ctx, `{emoji:FAIL} Enter a quantity from 1 to ${stock}.`);return;}
        session.data.voucher_quantity=qty; session.data.charged_price=unit*qty; session.data.api_price=unit*qty; session.data.selected_pkg_id=denom; session.data.package_display_name=`${denom} Diamonds Voucher x${qty}`; session.state=STATE_CONFIRM;
        await sendOrEdit(ctx, `━━━━━━━━━━━━━━━━━━━━━━\n{emoji:ORDERS} <b>Order Summary</b>\n\n{emoji:FREE_FIRE} <b>Product:</b> Free Fire Voucher\n{emoji:ORDERS} <b>Package:</b> ${denom} Diamonds Voucher\n{emoji:MONEY} <b>Quantity:</b> ${qty}\n{emoji:MONEY} <b>Price:</b> ${Math.floor(unit*qty)} ETB\n━━━━━━━━━━━━━━━━━━━━━━`, {reply_markup:get_confirmation_keyboard()}); return;
      }

      // Admin-managed menu button text input
      if (session.state === STATE_ADMIN_BUTTON_LABEL) {
        if (!ADMIN_CHAT_ID.includes(userId) || !text || text.length > 50) {
          await sendOrEdit(ctx, "Label must be 1–50 characters. Try again or send cancel.");
          if (text.toLowerCase() === "cancel") { session.state = STATE_ADMIN_MAIN; await sendOrEdit(ctx, "Cancelled.", { reply_markup: getButtonManagerKeyboard() }); }
          return;
        }
        const id = session.data.button_id;
        appSettings.MANAGED_BUTTONS ||= {};
        appSettings.MANAGED_BUTTONS[id] = { ...appSettings.MANAGED_BUTTONS[id], label: text };
        await db.save_setting("managed_buttons", appSettings.MANAGED_BUTTONS, appSettings);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, "Button label updated.", { reply_markup: getButtonManagerKeyboard() });
        return;
      }
      if (session.state === STATE_ADMIN_BUTTON_ADD) {
        if (!ADMIN_CHAT_ID.includes(userId)) return;
        if (text.toLowerCase() === "cancel") { session.state = STATE_ADMIN_MAIN; await sendOrEdit(ctx, "Cancelled.", { reply_markup: getButtonManagerKeyboard() }); return; }
        const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
        if (lines.length < 2 || !/^https?:\/\/\S+$/i.test(lines[1]) || lines[0].length > 50) {
          await sendOrEdit(ctx, "Invalid format. Send label on the first line and an http/https URL on the second line.");
          return;
        }
        appSettings.CUSTOM_MENU_BUTTONS ||= [];
        appSettings.CUSTOM_MENU_BUTTONS.push({ id: uuidv4(), label: lines[0], url: lines[1], enabled: true });
        await db.save_setting("custom_menu_buttons", appSettings.CUSTOM_MENU_BUTTONS, appSettings);
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, "Custom URL button added to the main menu.", { reply_markup: getButtonManagerKeyboard() });
        return;
      }

      // Admin states
      if (session.state === STATE_ADMIN_BROADCAST) {
        if (["cancel", "back"].includes(text.toLowerCase())) {
          session.state = STATE_ADMIN_MAIN;
          await sendOrEdit(ctx, `{emoji:CANCEL} Cancelled.`, { reply_markup: get_admin_keyboard() });
          return;
        }
        try {
          const result = await sendBroadcast({ text, entities: ctx.message.entities || [] });
          session.state = STATE_ADMIN_MAIN;
          await sendOrEdit(ctx, `{emoji:SUCCESS} Broadcast sent to ${result.success}/${result.total} users.\nFailed: ${result.failed}`, { reply_markup: get_admin_keyboard() });
          await report_event(bot, `{emoji:MEGAPHONE} <b>Broadcast Sent</b>\n{emoji:MAIL} Delivered: ${result.success}/${result.total}\n{emoji:FAIL} Failed: ${result.failed}\n{emoji:USER} By admin: <a href="tg://user?id=${userId}">${ctx.from.first_name || "Admin"}</a> (ID: <code>${userId}</code>)\n\n<b>Message:</b>\n${text.slice(0, 600)}`);
        } catch (e) {
          logger.error(`Admin broadcast error: ${e.message}`);
          await sendOrEdit(ctx, `{emoji:FAIL} Broadcast failed: ${e.message}`, { reply_markup: get_admin_keyboard() });
        }
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

      if (session.state === STATE_ADMIN_VOUCHER_PRICE) {
        const price=Number(text); const d=session.data.admin_voucher_denom; if(!Number.isFinite(price)||price<=0){await sendOrEdit(ctx,"Enter a valid price greater than 0.");return;}
        if(!appSettings.VOUCHER_STOCK) appSettings.VOUCHER_STOCK={}; if(!appSettings.VOUCHER_STOCK[d]) appSettings.VOUCHER_STOCK[d]={codes:[],price:0}; appSettings.VOUCHER_STOCK[d].price=price; await db.save_setting("VOUCHER_STOCK",appSettings.VOUCHER_STOCK,appSettings); session.state=STATE_ADMIN_MAIN; await sendOrEdit(ctx, `{emoji:SUCCESS} ${d} Diamonds voucher price set to <b>${Math.floor(price)} ETB</b>.`, {reply_markup:get_admin_keyboard()}); return;
      }
      if (session.state === STATE_ADMIN_VOUCHER_STOCK) {
        const d=session.data.admin_voucher_denom; const codes=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean); if(!codes.length){await sendOrEdit(ctx,"Send at least one voucher code, one per line.");return;}
        if(!appSettings.VOUCHER_STOCK) appSettings.VOUCHER_STOCK={}; if(!appSettings.VOUCHER_STOCK[d]) appSettings.VOUCHER_STOCK[d]={codes:[],price:0}; const existing=appSettings.VOUCHER_STOCK[d].codes||[]; const set=new Set(existing.map(String)); for(const c of codes) set.add(c); appSettings.VOUCHER_STOCK[d].codes=[...set]; await db.save_setting("VOUCHER_STOCK",appSettings.VOUCHER_STOCK,appSettings); session.state=STATE_ADMIN_MAIN; await sendOrEdit(ctx, `{emoji:SUCCESS} Added ${codes.length} voucher code(s). ${d} stock is now <b>${appSettings.VOUCHER_STOCK[d].codes.length}</b>.`, {reply_markup:get_admin_keyboard()}); return;
      }

      if (session.state === STATE_ADMIN_TELEGRAM_PRICE) {
        const price = parseFloat(text);
        const kind = session.data.admin_telegram_price_kind;
        const key = String(session.data.admin_telegram_price_key || "");
        if (!kind || !key) { session.state = STATE_ADMIN_MAIN; await sendOrEdit(ctx, "Price session expired.", { reply_markup: get_admin_keyboard() }); return; }
        if (!Number.isFinite(price) || price < 0) { await sendOrEdit(ctx, "Invalid price. Enter 0 or a positive ETB amount."); return; }
        if (kind === "stars") {
          const prices = getTelegramStarsPrices();
          prices[key] = price === 0 ? FIXED_STARS_PRICES[Number(key)] : price;
          await db.save_setting("TELEGRAM_STARS_PRICES", prices, appSettings);
        } else {
          const prices = getTelegramPremiumPrices();
          prices[key] = price === 0 ? TELEGRAM_PREMIUM_PRICES[Number(key)] : price;
          await db.save_setting("TELEGRAM_PREMIUM_PRICES", prices, appSettings);
        }
        catalog_service.clear_cache();
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} Telegram ${kind === "stars" ? "Stars" : "Premium"} price updated successfully.`, { reply_markup: get_admin_keyboard() });
        return;
      }

      if (session.state === STATE_ADMIN_MANUAL_PRICE) {
        const price=parseFloat(text); const key=session.data.admin_manual_key; const idx=session.data.admin_manual_package_index; const product=getManualProduct(key);
        if(!product || !product.packages[idx]){session.state=STATE_ADMIN_MAIN; await sendOrEdit(ctx,"Product session expired.",{reply_markup:get_admin_keyboard()});return;}
        if(!Number.isFinite(price) || price<0){await sendOrEdit(ctx,"Invalid price. Enter 0 or a positive ETB amount.");return;}
        if(price===0){ product.packages.splice(idx,1); }
        else product.packages[idx].price=price;
        await db.save_setting("MANUAL_PRODUCTS",getManualProducts(),appSettings);
        session.state=STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, `{emoji:SUCCESS} ${product.name} package updated.`, {reply_markup:get_admin_keyboard()});
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
        }
        session.state = STATE_ADMIN_MAIN;
        await sendOrEdit(ctx, result_text, { reply_markup: get_admin_keyboard() });
        return;
      }

      // ---- User states ----
      if (session.state === STATE_PROFILE_REDEEM) {
        if (!(await maintenance_check(ctx))) return;
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
        if (flowType === "manual_pubg") {
          const gameCode = session.data.game_code;
          if (!gameCode) { await sendOrEdit(ctx, `{emoji:FAIL} Game verification is unavailable right now. Please try again.`); return; }
          await sendOrEdit(ctx, `{emoji:PENDING_PAYMENT} Verifying your player ID...`);
          try {
            const check = await api_client.check_player_id(gameCode, playerId, session.data.server_id || null, session.data.charname || null);
            let valid=false, resolvedName=playerId;
            if(check){
              if(check.valid===false || check.success===false || check.error) valid=false;
              else if(check.valid===true || check.success===true || check.name || check.nickname || check.username || check.player_name || check.user?.name) valid=true;
              else if(check.success===undefined && check.valid===undefined && check.error===undefined && Object.keys(check).length>0) valid=true;
              const findName=(o)=>{if(!o||typeof o!=="object")return null; for(const k of ["name","nickname","player_name","playerName","display_name","displayName","first_name","firstName","username"]){if(typeof o[k]==="string"&&o[k].trim())return o[k].trim();} for(const v of Object.values(o)){if(v&&typeof v==="object"){const n=findName(v);if(n)return n;}} return null;};
              resolvedName=findName(check)||playerId;
            }
            if(!valid) { await sendOrEdit(ctx, `{emoji:FAIL} Player ID could not be verified.\n\nPlease enter a valid player ID.`); return; }
            session.data.nickname=resolvedName; session.data.verified_name=resolvedName; session.state=STATE_CONFIRM;
            const p=session.data.manual_product_name || session.data.game_name;
            const summary=`━━━━━━━━━━━━━━━━━━━━━━\n{emoji:ORDERS} <b>Order Summary</b>\n\n{emoji:${flowType === "manual_pubg" ? "PUBG" : "FREE_FIRE"}} <b>Product:</b> ${p}\n{emoji:ORDERS} <b>Package:</b> ${session.data.package_display_name}\n{emoji:USER} <b>Player ID:</b> ${playerId}\n{emoji:USER} <b>Verified Name:</b> ${resolvedName}\n{emoji:MONEY} <b>Price:</b> ${Math.floor(Number(session.data.charged_price)||0)} ETB\n━━━━━━━━━━━━━━━━━━━━━━`;
            await sendOrEdit(ctx, summary, {reply_markup:get_confirmation_keyboard()}); return;
          } catch(e) { logger.error(`Manual player verification failed: ${e.message}`); await sendOrEdit(ctx, `{emoji:FAIL} Player verification failed.\n\n${e.message}`); return; }
        }
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
          if (!valid && flowType !== "gemini" && flowType !== "capcut") {
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
          if (flowType !== "gemini" && flowType !== "capcut") {
            await sendOrEdit(ctx, `{emoji:FAIL} Player verification failed. Please try again.`);
            return;
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
    { command: "start", description: "Open ETHIO STORE main menu" },
    { command: "shop", description: "Open Shop" },
    { command: "profile", description: "View My Profile" },
    { command: "orders", description: "View My Orders" },
    { command: "support", description: "Contact support / admin" },
    { command: "pending", description: "View Pending Payments" },
    { command: "terms", description: "View ETHIO STORE Rules & Terms" },
    { command: "cancel", description: "Cancel current action" }
  ]).catch(e => logger.warn(`Could not set bot commands: ${e.message}`));

  // ---- Render webhook launch ----
  // Render automatically injects RENDER_EXTERNAL_URL for Web Services.
  // RENDER_EXTERNAL_HOSTNAME is retained as a fallback for environments that
  // expose the hostname separately. No manual service URL is needed in .env.
  const port = Number(process.env.PORT || 10000);
  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL
    || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : "");
  const webhookDomain = String(renderExternalUrl).replace(/\/+$/, "");
  const webhookPath = process.env.WEBHOOK_PATH || `/telegram/${BOT_TOKEN.split(":")[0]}`;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookDomain.startsWith("https://")) {
    throw new Error("Render did not provide RENDER_EXTERNAL_URL. Deploy this as a Render Web Service and check its runtime environment.");
  }
  if (!webhookSecret || !/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    throw new Error("WEBHOOK_SECRET is required and must contain 1-256 letters, numbers, underscores or hyphens.");
  }

  // Schedule pending-payment cleanup.
  const pendingCleanupInterval = setInterval(async () => {
    try {
      const removed = await db.cleanup_expired_pending_payment_orders();
      if (removed) {
        logger.info(
          `Automatically deleted ${removed} expired pending payment order${removed === 1 ? "" : "s"}.`
        );
      }
    } catch (e) {
      logger.warn(`Pending payment cleanup failed: ${e.message}`);
    }
  }, 60 * 1000);
  pendingCleanupInterval.unref?.();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Shutting down (${signal})...`);
    clearInterval(pendingCleanupInterval);
    try { bot.stop(signal); } catch (e) {}
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  logger.info(`Starting Telegram webhook on ${webhookDomain}:${port}${webhookPath}`);
  await bot.launch({ webhook: { domain: webhookDomain, port, hookPath: webhookPath, secretToken: webhookSecret } });
  logger.info("Telegram webhook started.");
}
if (require.main === module) {
  main().catch((err) => {
    logger.error(`Fatal crash: ${err.message}`, err);
    process.exit(1);
  });
}
