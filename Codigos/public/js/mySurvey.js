document.addEventListener("DOMContentLoaded", async () => {
    const usuarioId = localStorage.getItem("usuarioId");
    const message = document.getElementById("message");
    const form = document.getElementById("surveyForm");

    if (!usuarioId) {
        window.location.href = "index.html";
        return;
    }

    let pesoAnterior = null;

    // Datos de paciente
    async function loadData() {
        try {
            const res = await fetch(`http://localhost:3000/api/patients/${usuarioId}`);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

            const data = await res.json();
            const patient = data.paciente || data;

            // Encuesta
            document.getElementById("firstName").value = patient.nombres || "";
            document.getElementById("age").value = patient.edad || "";
            document.getElementById("gender").value = patient.sexo || "";
            document.getElementById("weight").value = patient.peso || "";
            document.getElementById("height").value = patient.estatura || "";
            document.getElementById("diagnosis").value = patient.diagnostico || "";

            pesoAnterior = parseFloat(patient.peso);
        } catch (error) {
            message.textContent = "❌ Error al cargar los datos.";
            message.style.color = "red";
            console.error(error);
        }
    }

    // Actualizar en ser
    async function updateData(dataToUpdate) {
        try {
            const res = await fetch(`http://localhost:3000/api/patients/${usuarioId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToUpdate)
            });

            const responseData = await res.json();

            if (!res.ok) throw new Error(responseData.message || "Error desconocido");

            message.textContent = responseData.message || "✅ Datos actualizados correctamente.";
            message.style.color = "green";
        } catch (error) {
            message.textContent = "❌ Error al actualizar los datos.";
            message.style.color = "red";
            console.error(error);
        }
    }

    // Envio de datos
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const pesoNuevo = parseFloat(form.weight.value);

        if (isNaN(pesoNuevo) || pesoNuevo <= 0) {
            message.textContent = "⚠️ Peso inválido.";
            message.style.color = "red";
            return;
        }

        const dataToUpdate = {
            nombres: form.firstName.value.trim(),
            edad: Number(form.age.value),
            sexo: form.gender.value,
            peso: pesoNuevo,
            estatura: Number(form.height.value),
            diagnostico: form.diagnosis.value.trim()
        };

        await updateData(dataToUpdate);

        // Actializar el peso
        if (pesoNuevo !== pesoAnterior) {
            pesoAnterior = pesoNuevo;
        }
    });

    // cerrar sesion
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
    
    await loadData();
});