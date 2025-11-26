document.addEventListener("DOMContentLoaded", () => {
    // =============================
    // FUNCIONES HASH
    // =============================
    function hashValue(value) {
        return btoa(JSON.stringify(value)).split("").reverse().join("");
    }

    function unhashValue(value) {
        try {
            return JSON.parse(atob(value.split("").reverse().join("")));
        } catch {
            return null;
        }
    }

    // =============================
    // OBTENER UID HASHEADO
    // =============================
    const hashedUid = localStorage.getItem("uid");
    if (!hashedUid) {
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhashValue(hashedUid);
    if (!usuarioId) {
        localStorage.clear();
        window.location.href = "index.html";
        return;
    }

    const listaAlertas = document.getElementById("lista-alertas");

    async function mostrarEstadoSignosVitales(usuarioId) {
        const fetchOptions = {
            method: "GET",
            cache: "no-store",
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        };

        try {
            // 🔹 Obtener rangos desde el servidor
            let dataRangos = null;
            const resRangos = await fetch(`/api/patients/${usuarioId}/vital-ranges`, fetchOptions);

            if (resRangos.ok) {
                dataRangos = await resRangos.json();
                localStorage.setItem(`rangos_${hashedUid}`, hashValue(dataRangos));
            } else {
                console.warn("Usando rangos desde localStorage");
                const cached = localStorage.getItem(`rangos_${hashedUid}`);
                if (!cached) throw new Error("Sin rangos en cache");
                dataRangos = unhashValue(cached);
            }

            // 🔹 Obtener signos vitales desde el servidor
            let signosActuales = null;
            const resSignos = await fetch(`/api/patients/${usuarioId}/latest-vitals`, fetchOptions);

            if (resSignos.ok) {
                signosActuales = await resSignos.json();
                localStorage.setItem(`vitales_${hashedUid}`, hashValue(signosActuales));
            } else {
                console.warn("Usando signos vitales desde localStorage");
                const cached = localStorage.getItem(`vitales_${hashedUid}`);
                if (!cached) throw new Error("Sin signos en cache");
                signosActuales = unhashValue(cached);
            }

            // 🔹 Mostrar datos en el DOM
            const { pulso: rangoPulso, spo2: rangoSpo2, temperatura: rangoTemp } = dataRangos.rangos;

            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value ?? "N/A";
            };

            // Datos generales
            setText("edad", dataRangos.edad);
            setText("sexo", dataRangos.sexo);
            setText("grupo-etario", dataRangos.grupoEtario);

            // Signos
            setText("pulso", signosActuales.pulso);
            setText("spo2", signosActuales.spo2);
            setText("temperatura", signosActuales.temperatura);

            // Rangos
            setText("rango-pulso", `${rangoPulso[0]} - ${rangoPulso[1]} bpm`);
            setText("rango-spo2", `${rangoSpo2[0]} - ${rangoSpo2[1]} %`);
            setText("rango-temperatura", `${rangoTemp[0]} - ${rangoTemp[1]} °C`);

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

            listaAlertas.innerHTML = "";
            if (fueraDeRango.length === 0) {
                listaAlertas.innerHTML = "<li>Todos los signos vitales están dentro del rango normal.</li>";
            } else {
                fueraDeRango.forEach(alerta => {
                    const li = document.createElement("li");
                    li.textContent = alerta;
                    listaAlertas.appendChild(li);
                });
            }

        } catch (error) {
            console.error("Error mostrando signos vitales:", error);
            listaAlertas.innerHTML = "<li>No se pudieron cargar los signos vitales.</li>";
        }
    }

    // 🔹 Ejecutar inicialmente y cada 5 segundos
    mostrarEstadoSignosVitales(usuarioId);
    setInterval(() => mostrarEstadoSignosVitales(usuarioId), 5000);

    // 🔹 Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
});