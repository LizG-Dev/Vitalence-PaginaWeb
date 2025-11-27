document.addEventListener("DOMContentLoaded", async () => {
    console.log("Iniciando dashboard.js");
    function hash(value) {
        return btoa(JSON.stringify(value)).split("").reverse().join("");
    }

    function unhash(hashed) {
        try {
            return JSON.parse(atob(hashed.split("").reverse().join("")));
        } catch {
            return null;
        }
    }
    const hashedUid = localStorage.getItem("uid");
    const hashedNombre = localStorage.getItem("usuarioNombre");
    const hashedRol = localStorage.getItem("usuarioRol");

    if (!hashedUid || !hashedNombre || !hashedRol) {
        alert("Por favor inicia sesión para acceder a la página.");
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhash(hashedUid);
    const usuarioNombre = unhash(hashedNombre);
    const usuarioRol = unhash(hashedRol);

    if (!usuarioId || !usuarioNombre || !usuarioRol) {
        localStorage.clear();
        window.location.href = "index.html";
        return;
    }

    if (usuarioRol === "admin") {
        window.location.href = "admin.html";
        return;
    }

    document.getElementById("welcomeUser").textContent = `¡Bienvenido, ${usuarioNombre}!`;

    document.getElementById("logout-btn")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });

    let pacienteId = null;
    let pesoChartInstance = null;
    if (!navigator.onLine) {
        console.warn("Sin internet. Cargando datos guardados.");

        const mostrarTarjetaOffline = (id, key) => {
            const el = document.getElementById(id);
            const valor = unhash(localStorage.getItem(key));
            if (el) el.textContent = valor ?? "N/A";
        };

        mostrarTarjetaOffline("peso", `peso_${hashedUid}`);
        mostrarTarjetaOffline("pulso", `pulso_${hashedUid}`);
        mostrarTarjetaOffline("oxigenacion", `oxigenacion_${hashedUid}`);
        mostrarTarjetaOffline("temperatura", `temperatura_${hashedUid}`);

        return;
    }
    const mostrarTarjeta = (id, key) => {
        const el = document.getElementById(id);
        const valor = unhash(localStorage.getItem(key));
        if (el) el.textContent = valor ?? "Cargando...";
    };

    mostrarTarjeta("peso", `peso_${hashedUid}`);
    mostrarTarjeta("pulso", `pulso_${hashedUid}`);
    mostrarTarjeta("oxigenacion", `oxigenacion_${hashedUid}`);
    mostrarTarjeta("temperatura", `temperatura_${hashedUid}`);
    try {
        const response = await fetch(`/api/patients/${usuarioId}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await response.json();

        if (data.exists) {
            const paciente = data.paciente;
            pacienteId = paciente.id;

            updatePatientCards(paciente);

            setTimeout(() => {
                cargarPesoHistorial(pacienteId);
                cargarSignosVitales(usuarioId);
            }, 200);
        } else {
            console.warn("Paciente no encontrado. Redirigiendo a encuesta.");
            window.location.href = "survey.html";
        }
    } catch (err) {
        console.error("Error al obtener paciente:", err);
    }

    function updatePatientCards(paciente) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value ?? "N/A";
        };

        setText("peso", paciente.peso ? `${paciente.peso} kg` : "N/A");
        localStorage.setItem(`peso_${hashedUid}`, hash(paciente.peso ?? "N/A"));
    }
    async function cargarSignosVitales(usuarioId) {
        try {
            const response = await fetch(`/api/patients/${usuarioId}/latest-vitals`);

            if (!response.ok) {
                console.warn("Error al solicitar signos vitales:", response.statusText);
                return;
            }

            const data = await response.json();

            document.getElementById("pulso").textContent =
                data.pulso !== undefined ? `${data.pulso} bpm` : "N/A";

            document.getElementById("oxigenacion").textContent =
                data.spo2 !== undefined ? `${data.spo2}%` : "N/A";

            document.getElementById("temperatura").textContent =
                data.temperatura !== undefined ? `${data.temperatura} °C` : "N/A";

            localStorage.setItem(`pulso_${hashedUid}`, hash(data.pulso ?? "N/A"));
            localStorage.setItem(`oxigenacion_${hashedUid}`, hash(data.spo2 ?? "N/A"));
            localStorage.setItem(`temperatura_${hashedUid}`, hash(data.temperatura ?? "N/A"));

        } catch (err) {
            console.error("Error en cargarSignosVitales:", err);
        }
    }
    async function cargarPesoHistorial(pacienteId) {
        try {
            const response = await fetch(`/api/patients/${pacienteId}/peso_historial`);

            if (!response.ok) {
                console.warn("Error en historial de peso:", response.statusText);
                return;
            }

            const pesoHistorial = await response.json();

            if (!Array.isArray(pesoHistorial)) {
                console.warn("El historial de peso no es un array válido.");
                return;
            }

            const canvas = document.getElementById("pesoChart");
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            const labels = pesoHistorial.map(entry => {
                let dateValue = entry.fecha_registro;
                if (dateValue && dateValue._seconds) {
                    dateValue = new Date(dateValue._seconds * 1000);
                } else {
                    dateValue = new Date(dateValue);
                }

                return isNaN(dateValue) ? "N/A" : dateValue.toLocaleDateString();
            });

            const pesos = pesoHistorial.map(entry => entry.peso);

            if (pesoChartInstance) {
                pesoChartInstance.data.labels = labels;
                pesoChartInstance.data.datasets[0].data = pesos;
                pesoChartInstance.update();
            } else {
                pesoChartInstance = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels,
                        datasets: [{
                            label: "Peso (kg)",
                            data: pesos,
                            borderColor: "rgba(75, 192, 192, 1)",
                            backgroundColor: "rgba(75, 192, 192, 0.2)",
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        } catch (err) {
            console.error("Error al obtener historial de peso:", err);
        }
    }
});