const express = require("express");
const router = express.Router();
const { db } = require("../db/conexion");
const bcrypt = require("bcryptjs");

const cleanData = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
};

router.get("/", async (req, res) => {
  try {
    const usuariosSnap = await db.collection("usuarios").get();
    const pacientesSnap = await db.collection("pacientes").get();

    const pacientes = pacientesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const usuarios = usuariosSnap.docs.map(doc => {
      const userData = doc.data();
      const paciente = pacientes.find(p => p.usuario_id === doc.id);

      return {
        id: doc.id,
        nombre: userData.nombre || "",
        email: userData.email || "",
        password: userData.password || "",
        rol: userData.rol || "",
        edad: paciente?.edad ?? "",
        sexo: paciente?.sexo ?? "",
        peso: paciente?.peso ?? "",
        estatura: paciente?.estatura ?? "",
        pacienteId: paciente?.id ?? null
      };
    });

    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error interno al obtener usuarios" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const userRef = db.collection("usuarios").doc(req.params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return res.status(404).json({ message: "Usuario no encontrado" });

    const pacientesSnap = await db.collection("pacientes")
      .where("usuario_id", "==", req.params.id)
      .get();

    const paciente = pacientesSnap.empty ? null : pacientesSnap.docs[0].data();

    res.json({
      id: userDoc.id,
      ...userDoc.data(),
      edad: paciente?.edad ?? "",
      sexo: paciente?.sexo ?? "",
      peso: paciente?.peso ?? "",
      estatura: paciente?.estatura ?? "",
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error interno al obtener usuario" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userRef = db.collection("usuarios").doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: "Usuario no encontrado" });

    let { nombre, email, password, rol, edad, sexo, peso, estatura } = req.body;

    if (password && password.trim() !== "") {
      password = await bcrypt.hash(password, 10);
    } else {
      password = userDoc.data().password;
    }

    const userUpdate = cleanData({ nombre, email, password, rol });
    if (Object.keys(userUpdate).length > 0) await userRef.update(userUpdate);

    if (rol === "user") {
      const pacientesSnap = await db.collection("pacientes")
        .where("usuario_id", "==", req.params.id)
        .get();

      const pacienteData = {};
      if (nombre) pacienteData.nombres = nombre;
      if (edad != null) pacienteData.edad = edad;
      if (sexo) pacienteData.sexo = sexo;
      if (peso != null) pacienteData.peso = peso;
      if (estatura != null) pacienteData.estatura = estatura;

      if (!pacientesSnap.empty) {
        const pacienteRef = pacientesSnap.docs[0].ref;
        if (Object.keys(pacienteData).length > 0) await pacienteRef.update(pacienteData);

        if (peso != null) {
          await db.collection("peso_historial").add({
            paciente_id: pacientesSnap.docs[0].id,
            peso,
            fecha_registro: new Date()
          });
        }
      } else if (Object.keys(pacienteData).length > 0) {
        const newPacienteRef = await db.collection("pacientes").add({
          usuario_id: req.params.id,
          fecha_registro: new Date(),
          ...pacienteData
        });
        if (peso != null) {
          await db.collection("peso_historial").add({
            paciente_id: newPacienteRef.id,
            peso,
            fecha_registro: new Date()
          });
        }
      }
    }

    res.json({ message: "Usuario actualizado correctamente" });

  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ message: "Error interno al actualizar usuario" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userRef = db.collection("usuarios").doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: "Usuario no encontrado" });

    await userRef.delete();

    const pacientesSnap = await db.collection("pacientes")
      .where("usuario_id", "==", req.params.id)
      .get();

    for (const doc of pacientesSnap.docs) await db.collection("pacientes").doc(doc.id).delete();

    res.json({ message: "Usuario y paciente eliminados correctamente" });

  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar usuario" });
  }
});

module.exports = router;