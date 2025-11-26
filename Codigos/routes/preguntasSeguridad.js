const express = require("express");
const router = express.Router();
const { db } = require("../db/conexion");

router.post("/guardar", async (req, res) => {
  try {
    const { usuarioId, colorFavorito, nombreMascota, cancionFavorita, nombreMama } = req.body;

    if (!usuarioId || !colorFavorito || !nombreMascota || !cancionFavorita || !nombreMama) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    const userRef = db.collection("usuarios").doc(usuarioId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const subRef = userRef.collection("preguntasSeguridad").doc("respuestas");
    await subRef.set(
      { colorFavorito, nombreMascota, cancionFavorita, nombreMama, fechaActualizacion: new Date() },
      { merge: true }
    );

    return res.status(200).json({ message: "Preguntas de seguridad guardadas correctamente." });
  } catch (error) {
    console.error("Error guardando preguntas de seguridad:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
});

router.get("/:usuarioId", async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const userRef = db.collection("usuarios").doc(usuarioId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const userData = userDoc.data();
    const subRef = userRef.collection("preguntasSeguridad").doc("respuestas");
    const preguntasDoc = await subRef.get();

    return res.status(200).json({
      message: "Datos obtenidos correctamente.",
      usuario: {
        nombre: userData.nombre || userData.nombres || "Sin nombre",
        correo: userData.email || userData.correo || "Sin correo",
      },
      preguntas: preguntasDoc.exists ? preguntasDoc.data() : null
    });
  } catch (error) {
    console.error("Error obteniendo preguntas de seguridad:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;