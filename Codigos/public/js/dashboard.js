import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    console.log("Iniciando dashboard.js");

    const usuarioId = localStorage.getItem("usuarioId");
    const usuarioNombre = localStorage.getItem("usuarioNombre");
    const usuarioRol = localStorage.getItem("usuarioRol");

    if (!usuarioId || !usuarioNombre || !usuarioRol) {
        alert("Por favor inicia sesión para acceder a la pagina.");
        window.location.href = "index.html";
        return;
    }

    if (usuarioRol === "admin") {
        window.location.href = "admin.html";
        return;
    }

    document.getElementById("welcomeUser").textContent = `¡Bienvenido, ${usuarioNombre}!`;

    // Cerrar sesion
    document.getElementById("logout-btn")?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });

    let pesoChartInstance = null;
    let presionChartInstance = null;
    let pacienteId = null;

    // Pacientes
    const pacientesRef = collection(db, "pacientes");
    const pacienteQuery = query(pacientesRef, where("usuario_id", "==", usuarioId));

    onSnapshot(pacienteQuery, (snapshot) => {
        if (snapshot.empty) {
            console.warn("No se encontró paciente. Redirigiendo a encuesta.");
            window.location.href = "survey.html";
            return;
        }

        const paciente = snapshot.docs[0].data();
        pacienteId = snapshot.docs[0].id;
        localStorage.setItem("ultimoPaciente", JSON.stringify(paciente));

        updatePatientCards(paciente);
        cargarPesoHistorial();
        cargarPresionHistorial();
    });

    function updatePatientCards(paciente) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || "N/A";
        };

        setText("nombrePaciente", paciente.nombres || "N/A");
        setText("edad", paciente.edad ? paciente.edad + " años" : "N/A");
        setText("sexo", paciente.sexo || "N/A");
        setText("peso", paciente.peso ? paciente.peso + " kg" : "N/A");
        setText("estatura", paciente.estatura ? paciente.estatura + " m" : "N/A");
        setText("enfermedades", paciente.diagnostico || "Ninguna");
    }

    // historial peso
    function cargarPesoHistorial() {
        const pesoRef = collection(db, "peso_historial");
        const q = query(pesoRef, where("paciente_id", "==", pacienteId), orderBy("fecha_registro"));

        onSnapshot(q, (snapshot) => {
            const pesoHistorial = snapshot.docs.map(doc => {
                const data = doc.data();
                const fecha = data.fecha_registro?.toDate ? data.fecha_registro.toDate() : new Date();
                return {
                    fecha: fecha.toISOString().slice(0, 10),
                    valor: data.peso || 0
                };
            });

            const pesoCtx = document.getElementById("pesoChart")?.getContext("2d");
            if (!pesoCtx) return;

            if (pesoChartInstance) {
                pesoChartInstance.data.labels = pesoHistorial.map(d => d.fecha);
                pesoChartInstance.data.datasets[0].data = pesoHistorial.map(d => d.valor);
                pesoChartInstance.update();
            } else if (pesoHistorial.length > 0) {
                pesoChartInstance = new Chart(pesoCtx, {
                    type: "line",
                    data: {
                        labels: pesoHistorial.map(d => d.fecha),
                        datasets: [{
                            label: "Peso (kg)",
                            data: pesoHistorial.map(d => d.valor),
                            borderColor: "rgba(75, 192, 192, 1)",
                            backgroundColor: "rgba(75, 192, 192, 0.2)",
                            tension: 0.3,
                            fill: true
                        }]
                    }
                });
            }
        });
    }

    // Presion arterial
    function cargarPresionHistorial() {
        const presionRef = collection(db, "signos_vitales");
        const q = query(presionRef, where("paciente_id", "==", pacienteId), orderBy("fecha"));

        onSnapshot(q, (snapshot) => {
            const presionHistorial = snapshot.docs.map(doc => {
                const data = doc.data();
                const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date();
                return {
                    fecha: fecha.toISOString().slice(0, 10),
                    sistolica: data.sistolica || 0,
                    diastolica: data.diastolica || 0
                };
            });

            const presionCtx = document.getElementById("presionChart")?.getContext("2d");
            if (!presionCtx || presionHistorial.length === 0) return;

            if (presionChartInstance) {
                presionChartInstance.data.labels = presionHistorial.map(d => d.fecha);
                presionChartInstance.data.datasets[0].data = presionHistorial.map(d => d.sistolica);
                presionChartInstance.data.datasets[1].data = presionHistorial.map(d => d.diastolica);
                presionChartInstance.update();
            } else {
                presionChartInstance = new Chart(presionCtx, {
                    type: "line",
                    data: {
                        labels: presionHistorial.map(d => d.fecha),
                        datasets: [
                            { label: "Sistólica", data: presionHistorial.map(d => d.sistolica), borderColor: "red", tension: 0.3 },
                            { label: "Diastólica", data: presionHistorial.map(d => d.diastolica), borderColor: "blue", tension: 0.3 }
                        ]
                    }
                });
            }
        });
    }
});