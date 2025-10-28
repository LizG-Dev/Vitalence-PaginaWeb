const express = require("express");
const router = express.Router();
const { db } = require("../db/conexion");

// Crear paciente
router.post("/", async (req, res) => {
    const { usuario_id, edad, sexo, peso, estatura, diagnostico } = req.body;

    // Validar campos
    if (!usuario_id || !edad || !peso || !estatura) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    try {
        // Verifica si ya existe
        const snapshot = await db.collection("pacientes").where("usuario_id", "==", usuario_id).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: "Ya has completado la encuesta." });
        }

        // Obtener nombre
        const usuarioDoc = await db.collection("usuarios").doc(usuario_id).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : {};
        const nombres = usuarioData.nombre || "Usuario";
        const apellidos = "";

        // Crear paciente
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

        // Insertar peso inicial
        await db.collection("peso_historial").add({
            paciente_id: pacienteId,
            peso,
            fecha_registro: new Date()
        });

        // Insertar signos vitales por defecto
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

// Obtener paciente
router.get("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;

    try {
        // Obtener paciente
        const pacienteQuery = db.collection("pacientes").where("usuario_id", "==", usuarioId);
        const pacienteSnapshot = await pacienteQuery.get();

        if (pacienteSnapshot.empty) {
            return res.json({ exists: false });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteData = pacienteDoc.data();

        // Obtener datos del usuario registrado
        const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { nombre: "Usuario" };
        const nombreCompleto = usuarioData.nombre;

        // Obtener signos vitales
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteDoc.id)
            .orderBy("fecha_registro", "asc")
            .get();
        const signosVitales = signosSnapshot.docs.map(doc => doc.data());

        // Obtener historial de peso
        const pesoSnapshot = await db.collection("peso_historial")
            .where("paciente_id", "==", pacienteDoc.id)
            .orderBy("fecha_registro", "asc")
            .get();
        const pesoHistorial = pesoSnapshot.docs.map(doc => doc.data());

        res.json({
            exists: true,
            paciente: {
                id: pacienteDoc.id,
                nombre: nombreCompleto,
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


// --- Actualizar datos del paciente y registrar historial de peso ---
router.put("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    const { edad, sexo, peso, estatura, diagnostico } = req.body;

    if (peso === undefined) {
        return res.status(400).json({ message: "El campo peso es obligatorio para esta operación" });
    }

    try {
        // Buscar paciente por usuario_id
        const pacienteQuery = db.collection("pacientes").where("usuario_id", "==", usuarioId);
        const pacienteSnapshot = await pacienteQuery.get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;
        const pacienteData = pacienteDoc.data();
        const pesoActual = parseFloat(pacienteData.peso) || 0;
        const nuevoPeso = parseFloat(peso);

        // Actualizar datos del paciente
        await db.collection("pacientes").doc(pacienteId).update({
            edad: edad || pacienteData.edad,
            sexo: sexo || pacienteData.sexo,
            peso: nuevoPeso,
            estatura: estatura || pacienteData.estatura,
            diagnostico: diagnostico || pacienteData.diagnostico
        });

        // Registrar historial de peso si cambió significativamente
        let historialSaved = false;
        if (!isNaN(nuevoPeso) && Math.abs(nuevoPeso - pesoActual) > 0.01) {
            await db.collection("peso_historial").add({
                paciente_id: pacienteId,
                peso: nuevoPeso,
                fecha_registro: new Date()
            });
            historialSaved = true;
        }

        res.json({
            message: historialSaved
                ? "Información actualizada y peso historial guardado"
                : "Información actualizada correctamente",
            changed: historialSaved,
            historialSaved
        });

    } catch (err) {
        console.error("Error actualizando paciente:", err);
        res.status(500).json({ message: "Error interno", error: err });
    }
});


// Función para determinar grupo etario y rangos normales
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

// Obtener rangos normales según edad y sexo del paciente
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


// Obtener últimos signos vitales registrados del paciente
router.get("/:usuarioId/latest-vitals", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) {
        return res.status(400).json({ message: "ID de usuario inválido" });
    }

    try {
        // Obtener el paciente usando usuario id
        const pacienteSnapshot = await db.collection("pacientes").where("usuario_id", "==", usuarioId).get();
        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;

        // Obtener los signos vitales ordenados por fecha descendente
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "desc")
            .limit(1)
            .get();

        if (signosSnapshot.empty) {
            return res.status(404).json({ message: "No hay signos vitales registrados" });
        }

        const latestVitals = signosSnapshot.docs[0].data();

        return res.json({
            pulso: latestVitals.frecuencia_cardiaca,
            spo2: latestVitals.oxigenacion,
            temperatura: latestVitals.temperatura,
            fecha_registro: latestVitals.fecha_registro.toDate()
        });

    } catch (err) {
        console.error("Error al obtener signos vitales:", err);
        return res.status(500).json({ message: "Error del servidor", error: err });
    }
});


//Pacientes lista
router.get("/", async (req, res) => {
    try {
        const pacientesSnapshot = await db.collection("pacientes").orderBy("usuario_id", "asc").get();
        if (pacientesSnapshot.empty) {
            return res.json([]);
        }

        const pacientes = [];
        for (const doc of pacientesSnapshot.docs) {
            const pacienteData = doc.data();
            const usuarioId = pacienteData.usuario_id;

            // Obtener el usuario correspondiente
            const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
            const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { email: null, nombre: null };

            pacientes.push({
                id: usuarioId,
                nombre: usuarioData.nombre || "Sin nombre",
                email: usuarioData.email,
                edad: pacienteData.edad,
                sexo: pacienteData.sexo,
                peso: pacienteData.peso,
                estatura: pacienteData.estatura,
                diagnostico: pacienteData.diagnostico
            });
        }

        res.json(pacientes);
    } catch (err) {
        console.error("Error cargando pacientes:", err);
        res.status(500).json({ message: "Error cargando pacientes", error: err });
    }
});


// Paciente por id
router.get("/:id", async (req, res) => {
    const usuarioId = req.params.id;
    if (!usuarioId) return res.status(400).json({ message: "ID inválido" });

    try {
        // Obtener datos del paciente
        const pacienteSnapshot = await db.collection("pacientes").where("usuario_id", "==", usuarioId).limit(1).get();
        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteData = pacienteSnapshot.docs[0].data();

        // Obtener datos del usuario
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



// crear paciente
router.post("/", async (req, res) => {
    const { usuario_id, edad, sexo, peso, estatura, diagnostico, password } = req.body;

    if (!usuario_id || !edad) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    try {
        // verificar si ya existe paciente para este usuario
        const existingPacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuario_id)
            .limit(1)
            .get();

        if (!existingPacienteSnapshot.empty) {
            return res.status(400).json({ message: "Ya existe un paciente para este usuario" });
        }

        // crear paciente
        const pacienteRef = await db.collection("pacientes").add({
            usuario_id,
            edad,
            sexo: sexo || null,
            peso: peso || null,
            estatura: estatura || null,
            diagnostico: diagnostico || null,
            fecha_registro: new Date()
        });

        // Actualizar pass
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


// Actualizar paciente
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
        // Buscar el paciente por usuario id
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .limit(1)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];

        // Actualizar paciente
        await pacienteDoc.ref.update(updateData);

        // Si hay password, actualizarlo en usuario
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await db.collection("usuarios").doc(usuarioId).update({ password: hashed });
        }

        res.json({ message: "Paciente actualizado correctamente" });
    } catch (err) {
        console.error("Error actualizando paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});


// Eliminar paciente
router.delete("/:usuarioId", async (req, res) => {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) return res.status(400).json({ message: "ID de usuario inválido" });

    try {
        // Buscar el paciente por usuario id
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .limit(1)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];

        // Eliminar paciente
        await pacienteDoc.ref.delete();
        await db.collection("usuarios").doc(usuarioId).delete();

        res.json({ message: "Paciente eliminado correctamente" });
    } catch (err) {
        console.error("Error eliminando paciente:", err);
        res.status(500).json({ message: "Error del servidor", error: err });
    }
});


module.exports = router;