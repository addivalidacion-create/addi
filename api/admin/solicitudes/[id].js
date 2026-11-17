// PATCH /api/admin/solicitudes/:id  → aprobar o revocar
// DELETE /api/admin/solicitudes/:id → eliminar
const { setCors, verifyToken, sbUpdate, sbDelete } = require("../../../_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.headers["x-admin-token"];
  if (!verifyToken(token)) return res.status(401).json({ error: "No autorizado." });

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "ID requerido." });

  try {
    if (req.method === "PATCH") {
      const { action, redirectUrl } = req.body || {};

      if (action === "aprobar") {
        const rows = await sbUpdate("solicitudes", "id=eq." + id, {
          status:       "approved",
          redirect_url: redirectUrl || "",
          approved_at:  new Date().toISOString(),
          updated_at:   new Date().toISOString()
        });
        return res.json(rows[0] || {});
      }

      if (action === "revocar") {
        const rows = await sbUpdate("solicitudes", "id=eq." + id, {
          status:       "pending",
          redirect_url: "",
          approved_at:  null,
          updated_at:   new Date().toISOString()
        });
        return res.json(rows[0] || {});
      }

      return res.status(400).json({ error: "Acción no reconocida." });
    }

    if (req.method === "DELETE") {
      await sbDelete("solicitudes", "id=eq." + id);
      return res.json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno." });
  }
};
