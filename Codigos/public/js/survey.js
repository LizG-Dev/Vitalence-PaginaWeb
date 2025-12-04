// Encuesta inicial
const surveyForm = document.getElementById("surveyForm");

function hash(value) {
    return btoa(JSON.stringify(value)).split("").reverse().join("");
}

function unhash(value) {
    try {
        return JSON.parse(atob(value.split("").reverse().join("")));
    } catch {
        return null;
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const hashedUid = localStorage.getItem("uid");
    const hashedRol = localStorage.getItem("usuarioRol");

    if (!hashedUid || !hashedRol) {
        alert("Debes iniciar sesión para acceder.");
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhash(hashedUid);
    const usuarioRol = unhash(hashedRol);

    if (!usuarioId || !usuarioRol) {
        localStorage.clear();
        window.location.href = "index.html";
        return;
    }

    if (usuarioRol === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (usuarioRol !== "user") {
        alert("No tienes permisos para acceder a esta página.");
        window.location.href = "index.html";
        return;
    }

    // Intentar obtener datos del paciente
    let pacienteData = null;
    try {
        const res = await fetch(`/api/patients/${usuarioId}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.exists) {
                localStorage.setItem(`pacienteCache_${hashedUid}`, hash(data.paciente));
                window.location.href = "dashboard.html";
                return;
            }
            pacienteData = data.paciente || null;
        }
    } catch (err) {
        console.warn("No se pudo obtener info del paciente desde la API:", err);
    }

    if (!pacienteData) {
        const cache = localStorage.getItem(`pacienteCache_${hashedUid}`);
        if (cache) pacienteData = unhash(cache);
    }

    if (pacienteData) {
        const nombreCompleto = `${pacienteData.nombres || ""} ${pacienteData.apellidos || ""}`.trim();
        localStorage.setItem("usuarioNombre", hash(nombreCompleto));

        const nombreSpan = document.getElementById("nombreUsuario");
        if (nombreSpan) nombreSpan.textContent = nombreCompleto;
    }
});

// Manejo del submit del formulario
if (surveyForm) {
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const hashedUid = localStorage.getItem("uid");
        const usuarioId = unhash(hashedUid);
        const usuarioNombre = unhash(localStorage.getItem("usuarioNombre"));

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
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            // Guardar en localStorage usando hash consistente
            localStorage.setItem(`pacienteCache_${hashedUid}`, hash(formData));

            if (res.ok) {
                alert("Encuesta guardada exitosamente.");
                window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Error al guardar la encuesta");
            }
        } catch (error) {
            // Guardar localmente si falla la conexión
            localStorage.setItem(`pacienteCache_${hashedUid}`, hash(formData));
            alert("No se pudo guardar en el servidor. Los datos se guardaron localmente.");
            window.location.href = "dashboard.html";
        }
    });
}