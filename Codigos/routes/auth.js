//Manejo del back en index

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/conexion");

// registro
router.post("/register", async (req, res) => {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // longitud
    if (password.length < 8 || password.length > 12) {
        return res.status(400).json({ message: "La contraseña debe tener entre 8 y 12 caracteres" });
    }

    const forbiddenSequences = ["12345678", "87654321"];
    for (const seq of forbiddenSequences) {
        if (password.includes(seq)) {
            return res.status(400).json({ message: "La contraseña no puede contener la secuencia 12345678 o 87654321" });
        }
    }

    try {
        //verificar si existe
        const snapshot = await db.collection("usuarios").where("email", "==", email).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: "El email ya está registrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const docRef = await db.collection("usuarios").add({
            nombre,
            email,
            password: hashedPassword,
            rol: "user",
            fecha_registro: new Date()
        });

        res.status(201).json({ message: "Registro exitoso", usuarioId: docRef.id, rol: "user" });
    } catch (error) {
        console.error("Error al registrar:", error);
        res.status(500).json({ message: "Error interno", error });
    }
});

// login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const snapshot = await db.collection("usuarios").where("email", "==", email).get();

        if (snapshot.empty) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        const userDoc = snapshot.docs[0];
        const usuario = userDoc.data();

        const passwordMatch = await bcrypt.compare(password, usuario.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }

        res.json({
            usuario: {
                id: userDoc.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error del servidor", error });
    }
});

module.exports = router;