const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const { db } = require("./db/conexion");

const app = express();
const PORT = 3000;

// Midewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// public
app.use(express.static(path.join(__dirname, "public")));

// rear usuario admins
app.post("/api/admin/create-user", async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  if (password.length < 8 || password.length > 12) {
    return res.status(400).json({ message: "La contraseña debe tener entre 8 y 12 caracteres" });
  }

  if (/[1-8]/.test(password)) {
    return res.status(400).json({ message: "La contraseña no puede contener los números del 1 al 8" });
  }

  const userRole = rol === "admin" ? "admin" : "user";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("usuarios").add({
      nombre,
      email,
      password: hashedPassword,
      rol: userRole,
      fecha_registro: new Date()
    });

    res.status(201).json({ message: "Usuario creado correctamente", rol: userRole });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ message: "Error creando usuario", error });
  }
});

// Estadisticas
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

// usuarios recientes
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

// Rutas
const patientsRoutes = require("./routes/patients");
app.use("/api/patients", patientsRoutes);

const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/home.html"));
});

// public
app.get("/:htmlFile", (req, res) => {
  const filePath = path.join(__dirname, "public", req.params.htmlFile);
  res.sendFile(filePath, err => {
    if (err) res.status(404).send("Página no encontrada");
  });
});

// Server
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});