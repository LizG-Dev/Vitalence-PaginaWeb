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
        // 1. Primero, obtenemos el documento del paciente usando el usuario_id
        const pacienteQuery = db.collection("pacientes").where("usuario_id", "==", usuarioId);
        const pacienteSnapshot = await pacienteQuery.get();

        // Si no se encuentra ningún paciente, devolvemos { exists: false }
        if (pacienteSnapshot.empty) {
            console.log(`No se encontró paciente con usuario_id: ${usuarioId}`);
            return res.json({ exists: false });
        }

        // 2. Si encontramos al paciente, obtenemos su ID y sus datos
        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteData = pacienteDoc.data();
        const pacienteId = pacienteDoc.id; // ID del paciente

        // Obtener los datos del usuario registrado
        const usuarioDoc = await db.collection("usuarios").doc(usuarioId).get();
        const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : { nombre: "Usuario" };
        const nombreCompleto = usuarioData.nombre;

        // 3. Obtener los signos vitales del paciente usando su ID
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteId)  // Usamos el ID del paciente aquí
            .orderBy("fecha_registro", "asc")
            .get();
        const signosVitales = signosSnapshot.docs.map(doc => doc.data());

        // 4. Obtener el historial de peso del paciente usando su ID
        const pesoSnapshot = await db.collection("peso_historial")
            .where("paciente_id", "==", pacienteId)  // Usamos el ID del paciente aquí
            .orderBy("fecha_registro", "asc")
            .get();
        const pesoHistorial = pesoSnapshot.docs.map(doc => doc.data());

        // 5. Devolvemos la información completa del paciente
        res.json({
            exists: true,
            paciente: {
                id: pacienteDoc.id,  // ID del paciente
                nombre: nombreCompleto,
                ...pacienteData  // Los otros campos del paciente
            },
            signosVitales,
            pesoHistorial
        });

    } catch (err) {
        console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error interno", error: err });
    }
});

// Obtener historial de peso usando el pacienteId
router.get("/:pacienteId/peso_historial", async (req, res) => {
    const pacienteId = req.params.pacienteId;

    try {
        // Obtener historial por pacienteId
        const pesoSnapshot = await db.collection("peso_historial")
            .where("paciente_id", "==", pacienteId)
            .orderBy("fecha_registro", "asc")
            .get();

        const pesoHistorial = pesoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Devolver arreglo vacío si no hay datos
        return res.json(pesoHistorial);

    } catch (err) {
        console.error("Error al obtener historial de peso:", err);
        res.status(500).json({ message: "Error al obtener historial de peso", error: err });
    }
});

// Obtener signos vitales usando el pacienteId
router.get("/:usuarioId/signos_vitales", async (req, res) => {
    const usuarioId = req.params.usuarioId;

    try {
        // Buscar paciente por usuario_id para obtener el pacienteId
        const pacienteQuery = db.collection("pacientes").where("usuario_id", "==", usuarioId);
        const pacienteSnapshot = await pacienteQuery.get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Datos no encontrados" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;

        // Ahora, obtenemos los signos vitales usando el pacienteId
        const signosSnapshot = await db.collection("signos_vitales")
            .where("paciente_id", "==", pacienteId)  // Usamos pacienteId para obtener los signos vitales
            .orderBy("fecha_registro", "asc")
            .get();

        const signosVitales = signosSnapshot.docs.map(doc => doc.data());

        // Si no hay signos vitales, devolvemos una respuesta vacía
        if (!Array.isArray(signosVitales) || signosVitales.length === 0) {
            return res.status(404).json({ message: "No se encontraron signos vitales para este paciente" });
        }

        res.json(signosVitales);

    } catch (err) {
        console.error("Error al obtener signos vitales:", err);
        res.status(500).json({ message: "Error al obtener signos vitales", error: err });
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
        // 1. Buscar paciente por usuario_id
        const pacienteSnapshot = await db.collection("pacientes")
            .where("usuario_id", "==", usuarioId)
            .get();

        if (pacienteSnapshot.empty) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteDoc = pacienteSnapshot.docs[0];
        const pacienteId = pacienteDoc.id;

        // 2. Obtener dispositivo del paciente (documento "1")
        const dispositivoRef = db
            .collection("dispositivos")
            .doc("1") // ← Ajusta si necesitas usar otro ID dinámico
            .collection("historial");

        // 3. Obtener la última lectura del historial
        const historialSnapshot = await dispositivoRef
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

        if (historialSnapshot.empty) {
            return res.status(404).json({ message: "No hay lecturas registradas" });
        }

        const latestReading = historialSnapshot.docs[0].data();

        // Convertir timestamp numérico a objeto Date
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
       console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error interno del servidor" });
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
        res.status(500).json({ message: "Error interno del servidor" });
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
        console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error interno del servidor" });
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

        // Actualizar paciente
        await pacienteDoc.ref.update(updateData);

        let nuevoPesoHistorial = null;

        // 🔹 Agregar peso al historial si se actualizó
        if (updateData.peso !== undefined) {
            const pesoRef = await db.collection("peso_historial").add({
                paciente_id: pacienteDoc.id,
                peso: updateData.peso,
                fecha_registro: new Date()
            });

            // Obtener el registro recién creado para devolverlo
            const pesoDoc = await pesoRef.get();
            nuevoPesoHistorial = { id: pesoDoc.id, ...pesoDoc.data() };
        }

        // Actualizar password si viene
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await db.collection("usuarios").doc(usuarioId).update({ password: hashed });
        }

        res.json({
            message: "Paciente actualizado correctamente",
            nuevoPesoHistorial // <-- enviar registro de peso recién agregado
        });
    } catch (err) {
        console.error("Error al obtener paciente:", err);
        res.status(500).json({ message: "Error interno del servidor" });
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