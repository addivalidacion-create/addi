// ══════════════════════════════════════════════════════
//  _lib.js — Utilidades compartidas (Supabase + tokens)
// ══════════════════════════════════════════════════════
const crypto = require("crypto");

// ── CORS ────────────────────────────────────────────
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token");
}

// ── Supabase REST ────────────────────────────────────
const SB_URL = process.env.SUPABASE_URL;          // https://xxxx.supabase.co
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;  // service_role key

function sbHeaders(extra) {
  return Object.assign({
    "apikey":        SB_KEY,
    "Authorization": "Bearer " + SB_KEY,
    "Content-Type":  "application/json",
    "Prefer":        "return=representation"
  }, extra || {});
}

async function sbQuery(table, qs) {
  const url = SB_URL + "/rest/v1/" + table + (qs ? "?" + qs : "");
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbInsert(table, body) {
  const r = await fetch(SB_URL + "/rest/v1/" + table, {
    method: "POST", headers: sbHeaders(), body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbUpdate(table, qs, body) {
  const r = await fetch(SB_URL + "/rest/v1/" + table + "?" + qs, {
    method: "PATCH", headers: sbHeaders(), body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbDelete(table, qs) {
  const r = await fetch(SB_URL + "/rest/v1/" + table + "?" + qs, {
    method: "DELETE", headers: sbHeaders()
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Token HMAC (stateless, sin DB) ──────────────────
const SECRET = process.env.SECRET_KEY || "cambia-esto-en-vercel";

function createToken(user) {
  const exp  = Date.now() + 4 * 60 * 60 * 1000;   // 4 horas
  const data = user + "|" + exp;
  const sig  = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(data + "|" + sig).toString("base64");
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const idx     = decoded.lastIndexOf("|");
    const data    = decoded.slice(0, idx);
    const sig     = decoded.slice(idx + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    if (sig !== expected) return null;
    const parts = data.split("|");
    const exp   = Number(parts[parts.length - 1]);
    if (Date.now() > exp) return null;
    return parts[0];
  } catch (e) { return null; }
}

// ── Código de 6 dígitos ──────────────────────────────
function randCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

module.exports = { setCors, sbQuery, sbInsert, sbUpdate, sbDelete, createToken, verifyToken, randCode };
