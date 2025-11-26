document.addEventListener("DOMContentLoaded", async () => {
    function hashValue(value) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).split("").reverse().join("");
    }

    function unhashValue(value) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(value.split("").reverse().join("")))));
        } catch {
            return null;
        }
    }
    const hashedUid = localStorage.getItem("uid");
    const hashedNombre = localStorage.getItem("usuarioNombre");

    const usuarioId = unhashValue(hashedUid);
    const usuarioNombre = unhashValue(hashedNombre) || "Administrador";

    if (!usuarioId) {
        alert("Inicia sesión para acceder a tu perfil.");
        window.location.href = "index.html";
        return;
    }
    let data = {};
    try {
        const res = await fetch(`/api/passAdmin/${usuarioId}`);
        if (res.ok) {
            data = await res.json();
        } else if (res.status === 404) {
            data = {
                usuario: { nombre: usuarioNombre, email: "Correo no disponible" },
                preguntas: {}
            };
        } else {
            data = {};
        }
    } catch (err) {
        console.error("No se pudo cargar el usuario:", err);
        data = { usuario: { nombre: usuarioNombre, email: "Correo no disponible" }, preguntas: {} };
    }
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = data.usuario?.nombre || usuarioNombre;

    const userEmailEl = document.getElementById("userEmail");
    if (userEmailEl) userEmailEl.textContent = data.usuario?.email || "Correo no disponible";
    const preguntas = data.preguntas || {};
    const setInputValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setInputValue("colorFavorito", preguntas.colorFavorito);
    setInputValue("mascota", preguntas.nombreMascota);
    setInputValue("cancion", preguntas.cancionFavorita);
    setInputValue("madre", preguntas.nombreMama);

    const recoverModal = document.getElementById("recoverModal");
    const changePasswordModal = document.getElementById("changePasswordModal");

    document.getElementById("btnPreguntas")?.addEventListener("click", e => {
        e.preventDefault();
        recoverModal?.classList.add("active");
    });

    document.getElementById("btnCambiarPassword")?.addEventListener("click", e => {
        e.preventDefault();
        changePasswordModal?.classList.add("active");
        document.getElementById("preguntasSection").style.display = "block";
        document.getElementById("passwordSection").style.display = "none";
    });

    document.getElementById("cancelRecover")?.addEventListener("click", () => recoverModal?.classList.remove("active"));
    document.getElementById("cancelVerify")?.addEventListener("click", () => changePasswordModal?.classList.remove("active"));
    document.getElementById("cancelChangePassword")?.addEventListener("click", () => changePasswordModal?.classList.remove("active"));

    const formPreguntas = document.getElementById("formPreguntas");
    formPreguntas?.addEventListener("submit", async e => {
        e.preventDefault();
        const form = e.target;

        const payload = {
            usuarioId,
            colorFavorito: form.colorFavorito.value.trim(),
            nombreMascota: form.nombreMascota.value.trim(),
            cancionFavorita: form.cancionFavorita.value.trim(),
            nombreMama: form.nombreMama.value.trim()
        };

        if (Object.values(payload).some(v => !v)) {
            alert("Completa todas las preguntas.");
            return;
        }

        try {
            const res = await fetch("/api/passAdmin/guardar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok) {
                alert("Preguntas guardadas correctamente.");
                form.reset();
                recoverModal?.classList.remove("active");
            } else {
                alert(result.message || "Error al guardar.");
            }
        } catch (error) {
            console.error("Error guardando preguntas:", error);
        }
    });

    const formPreguntasCambio = document.getElementById("formPreguntasCambio");
    formPreguntasCambio?.addEventListener("submit", async e => {
        e.preventDefault();
        const form = e.target;

        const respuestas = {
            colorFavorito: form.colorFavorito.value.trim(),
            nombreMascota: form.nombreMascota.value.trim(),
            cancionFavorita: form.cancionFavorita.value.trim(),
            nombreMama: form.nombreMama.value.trim()
        };

        if (Object.values(respuestas).some(r => !r)) {
            alert("Responde todas las preguntas.");
            return;
        }

        try {
            const res = await fetch("/api/passAdmin/verify-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId, respuestas })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Respuestas correctas.");
                document.getElementById("preguntasSection").style.display = "none";
                document.getElementById("passwordSection").style.display = "block";
            } else {
                alert(result.message || "Respuestas incorrectas.");
            }
        } catch (error) {
            console.error("Error verificando respuestas:", error);
        }
    });
    const changePasswordForm = document.getElementById("changePasswordForm");
    changePasswordForm?.addEventListener("submit", async e => {
        e.preventDefault();
        const newPassword = document.getElementById("newPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        if (!newPassword || !confirmPassword) {
            alert("Completa todos los campos.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch("/api/passAdmin/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId, newPassword })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Contraseña actualizada.");
                changePasswordForm.reset();
                formPreguntasCambio?.reset();
                changePasswordModal?.classList.remove("active");
                document.getElementById("preguntasSection").style.display = "block";
                document.getElementById("passwordSection").style.display = "none";
            } else {
                alert(result.message || "Error al cambiar contraseña.");
            }
        } catch (error) {
            console.error("Error cambiando contraseña:", error);
        }
    });

    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });
});