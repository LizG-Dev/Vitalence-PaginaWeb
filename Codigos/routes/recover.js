const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/conexion");

router.post("/verify-email", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Correo es obligatorio" });

  try {
    const snapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(200).json({ message: "Correo verificado, procede a responder las preguntas" });
  } catch (error) {
    console.error("Error verificando correo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
router.post("/verify-answers", async (req, res) => {
  const { email, respuestas } = req.body;

  if (!email || !respuestas)
    return res.status(400).json({ message: "Faltan campos obligatorios" });

  try {
    const userSnapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (userSnapshot.empty) return res.status(404).json({ message: "Usuario no encontrado" });

    const userId = userSnapshot.docs[0].id;
    const preguntasSnapshot = await db
      .collection("usuarios")
      .doc(userId)
      .collection("preguntasSeguridad")
      .get();

    if (preguntasSnapshot.empty) {
      return res.status(404).json({ message: "No se encontraron preguntas de seguridad" });
    }

    const data = preguntasSnapshot.docs[0].data();
    const normalize = (str) => str.trim().toLowerCase();

    const valid =
      normalize(data.colorFavorito) === normalize(respuestas.colorFavorito) &&
      normalize(data.nombreMascota) === normalize(respuestas.nombreMascota) &&
      normalize(data.cancionFavorita) === normalize(respuestas.cancionFavorita) &&
      normalize(data.nombreMama) === normalize(respuestas.nombreMama);

    if (!valid) {
      return res.status(401).json({ message: "Respuestas incorrectas" });
    }

    res.status(200).json({ message: "Respuestas correctas, puedes cambiar la contraseña" });
  } catch (error) {
    console.error("Error al verificar respuestas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ==========================
// Paso 3: Cambiar contraseña
// ==========================
router.post("/change-password", async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Las contraseñas no coinciden" });
  }

  try {
    const snapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (snapshot.empty) return res.status(404).json({ message: "Usuario no encontrado" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Promise.all(
      snapshot.docs.map((doc) =>
        db.collection("usuarios").doc(doc.id).update({ password: hashedPassword })
      )
    );

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;