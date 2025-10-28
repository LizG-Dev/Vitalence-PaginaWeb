// Encuesta incial
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

    // Obtener datos que se conecta con patients
    try {
        const res = await fetch(`http://localhost:3000/api/patients/${usuarioId}`);
        if (!res.ok) throw new Error("No se pudo obtener la información del paciente");

        const data = await res.json();

        // Si se realizo la encuesta
        if (data.exists) {
            window.location.href = "dashboard.html";
            return;
        }

        // Guarda en localstorage
        const nombreCompleto = data.paciente
            ? `${data.paciente.nombres} ${data.paciente.apellidos}`.trim()
            : "";
        localStorage.setItem("usuarioNombre", nombreCompleto);

        const nombreSpan = document.getElementById("nombreUsuario");
        if (nombreSpan) nombreSpan.textContent = nombreCompleto;

    } catch (err) {
        console.error("Error al obtener la información del paciente:", err);
        alert("No se pudo cargar la información del paciente.");
    }
});

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
        const res = await fetch("http://localhost:3000/api/patients", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok) {
            alert("Encuesta guardada exitosamente.");
            window.location.href = "dashboard.html";
        } else {
            alert(data.message || "Error al guardar la encuesta");
        }
    } catch (error) {
        alert("Error al guardar la encuesta: " + error.message);
    }
});