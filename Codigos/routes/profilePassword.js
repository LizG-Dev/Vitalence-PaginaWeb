const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/conexion");

router.get("/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
    if (!usuarioDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const snapshot = await db
      .collection("usuarios")
      .doc(usuarioId)
      .collection("preguntasSeguridad")
      .get();

    res.json({
      usuario: usuarioDoc.data(),
      preguntas: snapshot.empty ? null : snapshot.docs[0].data(),
    });
  } catch (error) {
    console.error("Error obteniendo preguntas de seguridad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/verify-answers", async (req, res) => {
  const { usuarioId, respuestas } = req.body;

  if (!usuarioId || !respuestas) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  try {
    const snapshot = await db
      .collection("usuarios")
      .doc(usuarioId)
      .collection("preguntasSeguridad")
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No se encontraron preguntas de seguridad" });
    }

    const data = snapshot.docs[0].data();
    const normalize = (str) => str.trim().toLowerCase();

    const respuestasCorrectas =
      normalize(respuestas.colorFavorito) === normalize(data.colorFavorito) &&
      normalize(respuestas.nombreMascota) === normalize(data.nombreMascota) &&
      normalize(respuestas.cancionFavorita) === normalize(data.cancionFavorita) &&
      normalize(respuestas.nombreMama) === normalize(data.nombreMama);

    if (!respuestasCorrectas) {
      return res.status(401).json({ message: "Respuestas incorrectas" });
    }

    res.status(200).json({ message: "Respuestas correctas" });
  } catch (error) {
    console.error("Error verificando respuestas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/change-password", async (req, res) => {
  const { usuarioId, newPassword, confirmPassword } = req.body;

  if (!usuarioId || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Faltan campos" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Las contraseñas no coinciden" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("usuarios").doc(usuarioId).update({ password: hashedPassword });
    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;