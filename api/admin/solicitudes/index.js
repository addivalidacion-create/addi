// GET /api/admin/solicitudes → lista completa para el panel
const { setCors, verifyToken, sbQuery } = require("../../_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.headers["x-admin-token"];
  if (!verifyToken(token)) return res.status(401).json({ error: "No autorizado." });

  if (req.method !== "GET") return res.status(405).end();

  try {
    const rows = await sbQuery(
      "solicitudes",
      "select=*&order=created_at.desc"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al consultar la base de datos." });
  }
};
