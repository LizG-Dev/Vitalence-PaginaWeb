// Encuesta inicial
const surveyForm = document.getElementById("surveyForm");

window.addEventListener("DOMContentLoaded", async () => {
    const usuarioRol = localStorage.getItem("usuarioRol");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!usuarioId || !usuarioRol) {
        alert("Debes iniciar sesión para acceder.");
        window.location.href = "index.html";
        return;
    }

    if (usuarioRol === "admin") {
        window.location.replace("home.html");
        return;
    }

    if (usuarioRol !== "user") {
        alert("No tienes permisos para acceder a esta página.");
        window.location.replace("home.html");
        return;
    }

    // Intentar obtener datos del paciente
    let pacienteData = null;
    try {
        const res = await fetch(`/api/patients/${usuarioId}`);
        if (res.ok) {
            const data = await res.json();
            if (data.exists) {
                window.location.href = "dashboard.html";
                return;
            }
            pacienteData = data.paciente || null;
        }
    } catch (err) {
        console.warn("No se pudo obtener info del paciente desde la API:", err);
    }

    // Si offline o no se obtuvo info, intentar cargar del localStorage
    if (!pacienteData) {
        const localPaciente = localStorage.getItem("ultimoPaciente");
        if (localPaciente) {
            pacienteData = JSON.parse(localPaciente);
        }
    }

    if (pacienteData) {
        const nombreCompleto = `${pacienteData.nombres || ""} ${pacienteData.apellidos || ""}`.trim();
        localStorage.setItem("usuarioNombre", nombreCompleto);

        const nombreSpan = document.getElementById("nombreUsuario");
        if (nombreSpan) nombreSpan.textContent = nombreCompleto;
    }
});

// Evitar error si surveyForm no existe
if (surveyForm) {
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usuarioId = localStorage.getItem("usuarioId");
        const usuarioNombre = localStorage.getItem("usuarioNombre");

        if (!usuarioId) {
            alert("No se pudo identificar al usuario. Por favor inicia sesión nuevamente.");
            window.location.href = "index.html";
            return;
        }

        const formData = {
            usuario_id: usuarioId,
            nombres: usuarioNombre,
            apellidos: "",
            edad: parseInt(surveyForm.edad.value),
            sexo: surveyForm.sexo.value,
            peso: parseFloat(surveyForm.peso.value),
            estatura: parseFloat(surveyForm.estatura.value),
            diagnostico: surveyForm.diagnostico.value
        };

        try {
            const res = await fetch("/api/patients", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                alert("Encuesta guardada exitosamente.");
                localStorage.setItem("ultimoPaciente", JSON.stringify(formData)); // Guardar para offline
                window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Error al guardar la encuesta");
            }
        } catch (error) {
            // Guardar localmente para fallback offline
            localStorage.setItem("ultimoPaciente", JSON.stringify(formData));
            alert("No se pudo guardar en el servidor. Los datos se guardaron localmente.");
            window.location.href = "dashboard.html";
        }
    });
}