const express = require("express");
const router = express.Router();
const { db } = require("../db/conexion");

router.post("/", async (req, res) => {
    const { usuario_id, edad, sexo, peso, estatura, diagnostico } = req.body;

    if (!usuario_id || !edad || !peso || !estatura) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    try {
        const snapshot = await db.collection("pacientes").where("usuario_id", "==", usuario_id).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: "Ya has completado la encuesta." });
        }

        const usuarioDoc = await db.collection("usuarios").doc(usuario_id).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : {};
        const nombres = usuarioData.nombre || "Usuario";
        const apellidos = "";

        const pacienteRef = await db.collection("pacientes").add({
            usuario_id,
            nombres,
            apellidos,
            edad,
            sexo: sexo || null,
            peso,
            estatura,
            diagnostico: diagnostico || null,
            fecha_registro: new Date()
        });

        const pacienteId = pacienteRef.id;

        await db.collection("peso_historial").add({
            paciente_id: pacienteId,
            peso,
            fecha_registro: new Date()
        });

        await db.collection("signos_vitales").add({
            paciente_id: pacienteId,
            frecuencia_cardiaca: 75,
            presion_arterial: "120/80",
            frecuencia_respiratoria: 18,
            oxigenacion: 98.0,
            temperatura: 36.6,
            fecha_registro: new Date()
        });

        res.json({ message: "Paciente, peso y signos vitales iniciales registrados correctamente", pacienteId });

    } catch (err) {
        console.error("Error al registrar paciente:", err);
        res.status(500).json({ message: "Error interno", error: err });
    }
});

router.get("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;

    try {
        // Buscar paciente en la colección
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .limit(1)
            .get();

        // Obtener datos del usuario
        const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { nombre: "Usuario" };

        if (pacienteSnapshot.empty) {
            // Si no existe paciente, retornamos objeto parcial para survey
            return res.json({
                exists: false,
                paciente: {
                    nombres: usuarioData.nombre || "Usuario",
                    apellidos: "",
                    edad: null,
                    sexo: null,
                    peso: null,
                    estatura: null,
                    diagnostico: ""
                }
            });
        }

        // Si existe paciente
        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteData = pacienteDoc.data();
        const pacienteId = pacienteDoc.id;

        // Obtener signos vitales
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "asc")
            .get();
        const signosVitales = signosSnapshot.docs.map(doc => doc.data());

        // Obtener historial de peso
        const pesoSnapshot = await db.collection("peso_historial")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "asc")
            .get();
        const pesoHistorial = pesoSnapshot.docs.map(doc => doc.data());

        // Respuesta final
        res.json({
            exists: true,
            paciente: {
                id: pacienteDoc.id,
                nombre: usuarioData.nombre,
                ...pacienteData
            },
            signosVitales,
            pesoHistorial
        });

    } catch (err) {
        console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error interno", error: err });
    }
});

router.get("/:pacienteId/peso_historial", async (req, res) => {
    const pacienteId = req.params.pacienteId;

    try {
        const pesoSnapshot = await db.collection("peso_historial")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "asc")
            .get();

        const pesoHistorial = pesoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json(pesoHistorial);

    } catch (err) {
        console.error("Error al obtener historial de peso:", err);
        res.status(500).json({ message: "Error al obtener historial de peso", error: err });
    }
});

router.get("/:usuarioId/signos_vitales", async (req, res) => {
    const usuarioId = req.params.usuarioId;

    try {
        const pacienteQuery = db.collection("pacientes").where("usuario_id", "==", usuarioId);
        const pacienteSnapshot = await pacienteQuery.get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "asc")
            .get();

        const signosVitales = signosSnapshot.docs.map(doc => doc.data());
        if (!Array.isArray(signosVitales) || signosVitales.length === 0) {
            return res.status(404).json({ message: "No se encontraron signos vitales para este paciente" });
        }

        res.json(signosVitales);

    } catch (err) {
        console.error("Error al obtener signos vitales:", err);
        res.status(500).json({ message: "Error al obtener signos vitales", error: err });
    }
});

function getVitalRanges(edad, sexo = "indefinido") {
    let grupoEtario = "";

    if (edad >= 1 && edad <= 12) {
        grupoEtario = "Niños (1-12 años)";
    } else if (edad >= 13 && edad <= 17) {
        grupoEtario = "Adolescentes (13-17 años)";
    } else if (edad >= 18 && edad <= 39) {
        grupoEtario = "Jóvenes adultos (18-39 años)";
    } else if (edad >= 40 && edad <= 64) {
        grupoEtario = "Adultos (40-64 años)";
    } else if (edad >= 65) {
        grupoEtario = "Adultos mayores (65+ años)";
    } else {
        grupoEtario = "Edad fuera de rango";
    }

    const rangos = {
        "Niños (1-12 años)": {
            pulso: [70, 110],
            spo2: [95, 100],
            temperatura: [36.0, 37.5]
        },
        "Adolescentes (13-17 años)": {
            pulso: [60, 100],
            spo2: [95, 100],
            temperatura: [36.0, 37.5]
        },
        "Jóvenes adultos (18-39 años)": {
            pulso: [60, 100],
            spo2: [95, 100],
            temperatura: [36.0, 37.5]
        },
        "Adultos (40-64 años)": {
            pulso: [60, 100],
            spo2: [95, 100],
            temperatura: [36.0, 37.5]
        },
        "Adultos mayores (65+ años)": {
            pulso: [60, 100],
            spo2: [95, 100],
            temperatura: [36.0, 37.5]
        },
        "Edad fuera de rango": {
            pulso: [null, null],
            spo2: [null, null],
            temperatura: [null, null]
        }
    };

    return {
        grupoEtario,
        sexo,
        rangos: rangos[grupoEtario]
    };
}

router.get("/:usuarioId/vital-ranges", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) {
        return res.status(400).json({ message: "ID de usuario inválido" });
    }

    try {
        const snapshot = await db.collection("pacientes").where("usuario_id", "==", usuarioId).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = snapshot.docs[0];
        const pacienteData = pacienteDoc.data();

        const { edad, sexo } = pacienteData;
        const rangos = getVitalRanges(edad, sexo);

        return res.json({
            usuarioId,
            edad,
            sexo,
            ...rangos
        });
    } catch (err) {
        console.error("Error al obtener rangos vitales:", err);
        return res.status(500).json({ message: "Error del servidor", error: err });
    }
});
router.get("/:usuarioId/latest-vitals", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) {
        return res.status(400).json({ message: "ID de usuario inválido" });
    }

    try {
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;
        const dispositivoRef = db
            .collection("dispositivos")
            .doc("1")
            .collection("historial");

        const historialSnapshot = await dispositivoRef
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

        if (historialSnapshot.empty) {
            return res.status(404).json({ message: "No hay lecturas registradas" });
        }

        const latestReading = historialSnapshot.docs[0].data();
        const fechaRegistro = new Date(latestReading.timestamp);

        return res.json({
            pulso: latestReading.bpm,
            spo2: latestReading.spo2,
            temperatura: latestReading.temperatura,
            fecha_registro: fechaRegistro
        });

    } catch (err) {
        console.error("Error al obtener signos vitales:", err);
        return res.status(500).json({ message: "Error del servidor", error: err });
    }
});

router.post("/", async (req, res) => {
    const { usuario_id, edad, sexo, peso, estatura, diagnostico } = req.body;

    if (!usuario_id || !edad || !peso || !estatura || !sexo) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    try {
        // Verificar si ya existe paciente
        const existingPaciente = await db.collection("pacientes")
            .where("usuario_id", "==", usuario_id)
            .limit(1)
            .get();

        if (!existingPaciente.empty) {
            return res.status(400).json({ message: "Paciente ya existe" });
        }

        // Obtener usuario
        const usuarioDoc = await db.collection("usuarios").doc(usuario_id).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { nombre: "Usuario" };
        const nombres = usuarioData.nombre || "Usuario";

        // Crear paciente
        const pacienteRef = await db.collection("pacientes").add({
            usuario_id,
            nombres,
            apellidos: "",
            edad,
            sexo,
            peso,
            estatura,
            diagnostico: diagnostico || "",
            fecha_registro: new Date()
        });

        // Crear registro inicial de peso
        await db.collection("peso_historial").add({
            paciente_id: pacienteRef.id,
            peso,
            fecha_registro: new Date()
        });

        // Crear registro inicial de signos vitales
        await db.collection("signos_vitales").add({
            paciente_id: pacienteRef.id,
            frecuencia_cardiaca: 75,
            presion_arterial: "120/80",
            frecuencia_respiratoria: 18,
            oxigenacion: 98,
            temperatura: 36.6,
            fecha_registro: new Date()
        });

        res.status(201).json({ message: "Paciente creado correctamente", pacienteId: pacienteRef.id });

    } catch (err) {
        console.error("Error al crear paciente:", err);
        res.status(500).json({ message: "Error interno", error: err });
    }
});

router.get("/:id", async (req, res) => {
    const usuarioId = req.params.id;
    if (!usuarioId) return res.status(400).json({ message: "ID inválido" });

    try {
        const pacienteSnapshot = await db.collection("pacientes").where("usuario_id", "==", usuarioId).limit(1).get();
        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteData = pacienteSnapshot.docs[0].data();
        const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { email: null, nombre: null };

        res.json({
            id: usuarioId,
            nombre: usuarioData.nombre || "Sin nombre",
            email: usuarioData.email,
            edad: pacienteData.edad,
            sexo: pacienteData.sexo,
            peso: pacienteData.peso,
            estatura: pacienteData.estatura,
            diagnostico: pacienteData.diagnostico
        });
    } catch (err) {
        console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});

router.post("/", async (req, res) => {
    const { usuario_id, edad, sexo, peso, estatura, diagnostico, password } = req.body;

    if (!usuario_id || !edad) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    try {
        const existingPacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuario_id)
            .limit(1)
            .get();

        if (!existingPacienteSnapshot.empty) {
            return res.status(400).json({ message: "Ya existe un paciente para este usuario" });
        }
        const pacienteRef = await db.collection("pacientes").add({
            usuario_id,
            edad,
            sexo: sexo || null,
            peso: peso || null,
            estatura: estatura || null,
            diagnostico: diagnostico || null,
            fecha_registro: new Date()
        });
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            const usuarioRef = db.collection("usuarios").doc(usuario_id);
            await usuarioRef.update({ password: hashed });
        }

        res.status(201).json({ message: "Paciente creado", id: pacienteRef.id });
    } catch (err) {
        console.error("Error creando paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});


router.put("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) return res.status(400).json({ message: "ID de usuario inválido" });

    const { edad, sexo, peso, estatura, diagnostico, password } = req.body;

    const updateData = {};
    if (edad !== undefined) updateData.edad = edad;
    if (sexo !== undefined) updateData.sexo = sexo;
    if (peso !== undefined) updateData.peso = peso;
    if (estatura !== undefined) updateData.estatura = estatura;
    if (diagnostico !== undefined) updateData.diagnostico = diagnostico;

    try {
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .limit(1)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        await pacienteDoc.ref.update(updateData);

        let nuevoPesoHistorial = null;
        if (updateData.peso !== undefined) {
            const pesoRef = await db.collection("peso_historial").add({
                paciente_id: pacienteDoc.id,
                peso: updateData.peso,
                fecha_registro: new Date()
            });
            const pesoDoc = await pesoRef.get();
            nuevoPesoHistorial = { id: pesoDoc.id, ...pesoDoc.data() };
        }
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await db.collection("usuarios").doc(usuarioId).update({ password: hashed });
        }

        res.json({
            message: "Paciente actualizado correctamente",
            nuevoPesoHistorial
        });
    } catch (err) {
        console.error("Error actualizando paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});
router.delete("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) return res.status(400).json({ message: "ID de usuario inválido" });

    try {
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .limit(1)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        await pacienteDoc.ref.delete();
        await db.collection("usuarios").doc(usuarioId).delete();

        res.json({ message: "Paciente eliminado correctamente" });
    } catch (err) {
        console.error("Error eliminando paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});


module.exports = router;