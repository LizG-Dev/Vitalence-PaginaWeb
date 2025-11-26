document.addEventListener("DOMContentLoaded", async () => {
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
    const message = document.getElementById("message");
    const form = document.getElementById("surveyForm");

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

    let pesoAnterior = null;

    // 🔹 Cargar datos del paciente desde base de datos
    async function loadData() {
        try {
            const res = await fetch(`/api/patients/${usuarioId}`);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

            const data = await res.json();
            const patient = data.paciente || data;

            if (form) {
                form.age.value = patient.edad || "";
                form.gender.value = patient.sexo || "";
                form.weight.value = patient.peso || "";
                form.height.value = patient.estatura || "";
            }

            pesoAnterior = parseFloat(patient.peso);

            // Guardar en localStorage hasheado
            localStorage.setItem(`pacienteCache_${hashedUid}`, hashValue(patient));
        } catch (error) {
            console.error("Error al cargar los datos desde el servidor:", error);
            if (message) {
                message.textContent = "❌ Error al cargar los datos desde el servidor.";
                message.style.color = "red";
            }
        }
    }

    // 🔹 Actualizar datos en el servidor
    async function updateData(dataToUpdate) {
        try {
            const res = await fetch(`/api/patients/${usuarioId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToUpdate)
            });

            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.message || "Error desconocido");

            if (message) {
                message.textContent = responseData.message || "✅ Datos actualizados correctamente.";
                message.style.color = "green";
            }

            await loadData();
        } catch (error) {
            console.error("Error al actualizar los datos:", error);
            if (message) {
                message.textContent = "❌ Error al actualizar los datos.";
                message.style.color = "red";
            }
        }
    }

    // 🔹 Enviar formulario
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const pesoNuevo = parseFloat(form.weight.value);
        if (isNaN(pesoNuevo) || pesoNuevo <= 0) {
            if (message) {
                message.textContent = "⚠️ Peso inválido.";
                message.style.color = "red";
            }
            return;
        }

        const dataToUpdate = {
            edad: Number(form.age.value),
            sexo: form.gender.value,
            peso: pesoNuevo,
            estatura: Number(form.height.value)
        };

        await updateData(dataToUpdate);
        pesoAnterior = pesoNuevo;
    });

    // 🔹 Cerrar sesión
    document.getElementById("logout-btn")?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });

    // 🔹 Cargar datos iniciales
    await loadData();
});