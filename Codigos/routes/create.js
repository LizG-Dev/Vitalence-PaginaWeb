const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/conexion");

router.post("/", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const existingUser = await db.collection("usuarios")
      .where("email", "==", email)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRef = await db.collection("usuarios").add({
      nombre,
      email,
      password: hashedPassword,
      rol
    });

    if (rol === "user") {
      await db.collection("pacientes").add({
        usuario_id: userRef.id,
        nombres: nombre,
        edad: null,
        sexo: "",
        peso: null,
        estatura: null,
        diagnostico: "",
        fecha_registro: new Date()
      });
    }

    res.status(201).json({ message: "Usuario creado correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;