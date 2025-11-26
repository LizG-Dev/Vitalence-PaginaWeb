require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const { db } = require("./db/conexion");

const app = express();
const PORT = 3000;

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public
app.use(express.static(path.join(__dirname, "public")));

// Crear usuario admin
const createRoutes = require("./routes/create");
app.use("/api/admin/create-user", createRoutes);

// Pacientes
const patientsRoutes = require("./routes/patients");
app.use("/api/patients", patientsRoutes);

// Auth
const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);

// Recuperar contraseña
const recoverRoutes = require("./routes/recover");
app.use("/api/recover", recoverRoutes);

// Preguntas de seguridad
const preguntasSeguridadRoutes = require("./routes/preguntasSeguridad");
app.use("/api/preguntasSeguridad", preguntasSeguridadRoutes);

// Management
const managementRoutes = require("./routes/management");
app.use("/api/management", managementRoutes);

const passAdminRouter = require("./routes/passAdmin");
app.use("/api/passAdmin", passAdminRouter);

// Cambio perfil contraseña
const profilePassword = require("./routes/profilePassword");
app.use("/api/perfil", profilePassword);

// Estadísticas (ya definidas inline)
app.get("/api/admin/stats", async (req, res) => {
  try {
    const usuariosSnapshot = await db.collection("usuarios").get();
    const totalUsers = usuariosSnapshot.size;
    let activeUsers = 0;
    let adminCount = 0;
    let recentUsers = 0;
    const currentMonth = new Date().getMonth();

    usuariosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.rol === "user") activeUsers++;
      if (data.rol === "admin") adminCount++;
      if (data.fecha_registro && data.fecha_registro.toDate().getMonth() === currentMonth) recentUsers++;
    });

    res.json({ totalUsers, activeUsers, adminCount, recentUsers });
  } catch (err) {
    console.error("Error al obtener estadísticas:", err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// Usuarios recientes
app.get("/api/admin/users", async (req, res) => {
  try {
    const snapshot = await db.collection("usuarios")
      .orderBy("fecha_registro", "desc")
      .limit(10)
      .get();

    const users = snapshot.docs.map(doc => ({
      nombre: doc.data().nombre,
      email: doc.data().email,
      rol: doc.data().rol,
      fecha_registro: doc.data().fecha_registro.toDate()
    }));

    res.json(users);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/home.html"));
});

app.get("/:htmlFile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", req.params.htmlFile + ".html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
