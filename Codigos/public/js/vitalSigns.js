async function mostrarEstadoSignosVitales(usuarioId) {
    try {
        const resRangos = await fetch(`http://localhost:3000/api/patients/${usuarioId}/vital-ranges`);
        const dataRangos = await resRangos.json();

        if (!resRangos.ok) {
            console.error("Error al obtener rangos:", dataRangos.message);
            return;
        }

        // datos reales
        const resSignos = await fetch(`http://localhost:3000/api/patients/${usuarioId}/latest-vitals`);
        const signosActuales = await resSignos.json();

        if (!resSignos.ok) {
            console.error("Error al obtener signos actuales:", signosActuales.message);
            return;
        }

        const { pulso: rangoPulso, spo2: rangoSpo2, temperatura: rangoTemp } = dataRangos.rangos;

        document.getElementById("edad").textContent = dataRangos.edad;
        document.getElementById("sexo").textContent = dataRangos.sexo;

        document.getElementById("pulso").textContent = signosActuales.pulso;
        document.getElementById("spo2").textContent = signosActuales.spo2;
        document.getElementById("temperatura").textContent = signosActuales.temperatura;

        document.getElementById("grupo-etario").textContent = dataRangos.grupoEtario;
        document.getElementById("rango-pulso").textContent = `${rangoPulso[0]} - ${rangoPulso[1]} bpm`;
        document.getElementById("rango-spo2").textContent = `${rangoSpo2[0]} - ${rangoSpo2[1]} %`;
        document.getElementById("rango-temperatura").textContent = `${rangoTemp[0]} - ${rangoTemp[1]} °C`;

        // Alertas
        const fueraDeRango = [];

        if (signosActuales.pulso < rangoPulso[0] || signosActuales.pulso > rangoPulso[1]) {
            fueraDeRango.push(`⚠️ Pulso fuera de rango: ${signosActuales.pulso} bpm`);
        }
        if (signosActuales.spo2 < rangoSpo2[0] || signosActuales.spo2 > rangoSpo2[1]) {
            fueraDeRango.push(`⚠️ Oxigenación fuera de rango: ${signosActuales.spo2}%`);
        }
        if (signosActuales.temperatura < rangoTemp[0] || signosActuales.temperatura > rangoTemp[1]) {
            fueraDeRango.push(`⚠️ Temperatura fuera de rango: ${signosActuales.temperatura} °C`);
        }

        const listaAlertas = document.getElementById("lista-alertas");
        listaAlertas.innerHTML = "";

        if (fueraDeRango.length === 0) {
            listaAlertas.innerHTML = "<li>✅ Todos los signos vitales están dentro del rango normal.</li>";
        } else {
            fueraDeRango.forEach(alerta => {
                const li = document.createElement("li");
                li.textContent = alerta;
                listaAlertas.appendChild(li);
            });
        }

    } catch (error) {
        console.error("Error en la función mostrarEstadoSignosVitales:", error);
    }
}

// Ejecuta dom
document.addEventListener("DOMContentLoaded", () => {
    const usuarioId = localStorage.getItem("usuarioId");

    if (!usuarioId) {
        console.error("Usuario no autenticado, redirigiendo a login...");
        window.location.href = "index.html";
        return;
    }

    mostrarEstadoSignosVitales(usuarioId);

    // cerrar sesion
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // Limpiar localstorage
            localStorage.removeItem("usuarioId");
            window.location.href = "index.html"; 
        });
    }
});

