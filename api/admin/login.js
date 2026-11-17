// POST /api/admin/login
const { setCors, createToken } = require("../_lib");

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "addi2026";

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ token: createToken(username) });
  }
  return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
};
