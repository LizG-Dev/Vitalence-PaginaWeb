const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const conexion = require("../db/conexion");

// Registro
router.post("/register", (req, res) => {
    const { nombre, email, password } = req.body;

    // Verificar si ya existe
    conexion.query("SELECT * FROM usuarios WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Error del servidor" });
        if (results.length > 0) return res.status(400).json({ message: "El correo ya está registrado" });

        // Encriptar contraseña
        const hashedPassword = bcrypt.hashSync(password, 8);

        // Insertar usuario
        conexion.query(
            "INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)",
            [nombre, email, hashedPassword],
            (err) => {
                if (err) return res.status(500).json({ message: "Error al registrar usuario" });
                res.json({ message: "✅ Registro exitoso" });
            }
        );
    });
});

// Login
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    conexion.query("SELECT * FROM usuarios WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Error del servidor" });
        if (results.length === 0) return res.status(400).json({ message: "Correo no registrado" });

        const usuario = results[0];
        const validPassword = bcrypt.compareSync(password, usuario.password);
        if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

        res.json({ message: "✅ Login exitoso", usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
    });
});

module.exports = router;
