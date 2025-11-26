document.addEventListener("DOMContentLoaded", async () => {
    // =============================
    // FUNCIONES HASH SEGURAS (UTF-8)
    // =============================
    function hashValue(value) {
        const str = JSON.stringify(value);
        return btoa(unescape(encodeURIComponent(str))).split("").reverse().join("");
    }

    function unhashValue(value) {
        try {
            const decoded = atob(value.split("").reverse().join(""));
            return JSON.parse(decodeURIComponent(escape(decoded)));
        } catch {
            return null;
        }
    }

    // =============================
    // OBTENER UID HASHEADO
    // =============================
    const hashedUid = localStorage.getItem("uid");
    if (!hashedUid) {
        alert("Inicia sesión para acceder a tu perfil.");
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhashValue(hashedUid);
    if (!usuarioId) {
        localStorage.clear();
        window.location.href = "index.html";
        return;
    }

    // =============================
    // MODALES (sin cambios)
    // =============================
    const recoverModal = document.getElementById("recoverModal");
    const recoverBtn = document.getElementById("recoverBtn");
    const cancelRecover = document.getElementById("cancelRecover");

    recoverBtn?.addEventListener("click", async () => {
        recoverModal?.classList.add("active");
        if (typeof cargarPreguntasSeguridad === "function") {
            await cargarPreguntasSeguridad();
        }
    });

    cancelRecover?.addEventListener("click", () => recoverModal?.classList.remove("active"));
    window.addEventListener("click", e => {
        if (e.target === recoverModal) recoverModal?.classList.remove("active");
    });

    const changePasswordLink = document.getElementById("changePasswordLink");
    const changePasswordModal = document.getElementById("changePasswordModal");
    const closeChangePassword = document.getElementById("closeChangePassword");

    changePasswordLink?.addEventListener("click", e => {
        e.preventDefault();
        changePasswordModal?.classList.add("active");
    });

    closeChangePassword?.addEventListener("click", () => changePasswordModal?.classList.remove("active"));
    window.addEventListener("click", e => {
        if (e.target === changePasswordModal) changePasswordModal?.classList.remove("active");
    });

    const cerrarModal = modalId => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove("active");
        modal.querySelector("#passwordSection")?.setAttribute("style", "display:none");
        modal.querySelector("#preguntasSection")?.setAttribute("style", "display:block");
    };

    document.getElementById("cancelVerify")?.addEventListener("click", () => cerrarModal("changePasswordModal"));
    document.getElementById("cancelChangePassword")?.addEventListener("click", () => cerrarModal("changePasswordModal"));

    // =============================
    // LOGOUT
    // =============================
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });

    // =============================
    // CARGAR DATOS DEL USUARIO Y PREGUNTAS (HASHEADOS)
    // =============================
    let data = {};
    try {
        const res = await fetch(`/api/preguntasSeguridad/${usuarioId}`);
        data = res.ok
            ? await res.json()
            : unhashValue(localStorage.getItem(`usuarioData_${hashedUid}`)) || {};
        if (res.ok) localStorage.setItem(`usuarioData_${hashedUid}`, hashValue(data));
    } catch (err) {
        console.warn("No se pudo cargar desde API, usando localStorage:", err);
        data = unhashValue(localStorage.getItem(`usuarioData_${hashedUid}`)) || {};
    }

    // Mostrar nombre y correo
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    if (data.usuario) {
        if (userNameEl) userNameEl.textContent = data.usuario.nombre || "Usuario sin nombre";
        if (userEmailEl) userEmailEl.textContent = data.usuario.correo || "Correo no disponible";

        const usuarioLocal = {
            id: usuarioId,
            nombre: data.usuario.nombre,
            correo: data.usuario.correo,
            password: unhashValue(localStorage.getItem(`usuarioPassword_${hashedUid}`)) || "********"
        };
        localStorage.setItem(`usuario_${hashedUid}`, hashValue(usuarioLocal));
    }

    // Mostrar preguntas
    const preguntas = data.preguntas || {};
    const setInputValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };
    setInputValue("colorFavorito", preguntas.colorFavorito);
    setInputValue("mascota", preguntas.nombreMascota);
    setInputValue("cancion", preguntas.cancionFavorita);
    setInputValue("madre", preguntas.nombreMama);

    // =============================
    // GUARDAR PREGUNTAS DE SEGURIDAD (HASHEADO)
    // =============================
    const form = document.getElementById("formPreguntas");
    form?.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            usuarioId,
            colorFavorito: form.colorFavorito.value.trim(),
            nombreMascota: form.mascota.value.trim(),
            cancionFavorita: form.cancion.value.trim(),
            nombreMama: form.madre.value.trim()
        };

        if (Object.values(payload).some(v => !v)) {
            alert("Por favor completa todas las preguntas.");
            return;
        }

        try {
            const res = await fetch("/api/preguntasSeguridad/guardar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (res.ok) {
                alert("Preguntas de seguridad guardadas con éxito.");
                form.reset();
                localStorage.setItem(`preguntas_${hashedUid}`, hashValue(payload));
            } else {
                alert(`⚠️ ${result.message || "Error al guardar las preguntas"}`);
            }
        } catch (error) {
            console.error("Error guardando preguntas:", error);
        }
    });

    // =============================
    // CAMBIO DE CONTRASEÑA (HASHEADO)
    // =============================
    const changePasswordForm = document.getElementById("changePasswordForm");
    const formPreguntasCambio = document.getElementById("formPreguntasCambio");

    formPreguntasCambio?.addEventListener("submit", async e => {
        e.preventDefault();
        const respuestas = {
            colorFavorito: formPreguntasCambio.colorFavorito.value.trim(),
            nombreMascota: formPreguntasCambio.nombreMascota.value.trim(),
            cancionFavorita: formPreguntasCambio.cancionFavorita.value.trim(),
            nombreMama: formPreguntasCambio.nombreMama.value.trim()
        };
        if (Object.values(respuestas).some(r => !r)) {
            alert("Por favor, responde todas las preguntas.");
            return;
        }

        try {
            const res = await fetch("/api/perfil/verify-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId, respuestas })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Respuestas correctas. Ahora puedes cambiar tu contraseña.");
                document.getElementById("preguntasSection")?.setAttribute("style", "display:none");
                document.getElementById("passwordSection")?.setAttribute("style", "display:block");
            } else {
                alert(`${data.message || "Respuestas incorrectas."}`);
            }
        } catch (error) {
            console.error("Error verificando respuestas:", error);
        }
    });

    changePasswordForm?.addEventListener("submit", async e => {
        e.preventDefault();
        const newPassword = document.getElementById("newPassword")?.value.trim();
        const confirmPassword = document.getElementById("confirmPassword")?.value.trim();

        if (!newPassword || !confirmPassword) {
            alert("Por favor completa ambos campos.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch("/api/perfil/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId, newPassword, confirmPassword })
            });
            const result = await res.json();

            if (res.ok) {
                alert("✅ Contraseña actualizada correctamente.");
                const usuarioLocal = unhashValue(localStorage.getItem(`usuario_${hashedUid}`)) || {};
                usuarioLocal.password = newPassword;
                localStorage.setItem(`usuario_${hashedUid}`, hashValue(usuarioLocal));
                localStorage.setItem(`usuarioPassword_${hashedUid}`, hashValue(newPassword));

                changePasswordForm.reset();
                formPreguntasCambio.reset();
                document.getElementById("changePasswordModal")?.classList.remove("active");
                document.getElementById("preguntasSection")?.setAttribute("style", "display:block");
                document.getElementById("passwordSection")?.setAttribute("style", "display:none");
            } else {
                alert(`⚠️ ${result.message || "No se pudo cambiar la contraseña."}`);
            }
        } catch (error) {
            console.error("Error cambiando contraseña:", error);
            alert("Error al cambiar contraseña. Inténtalo más tarde.");
        }
    });

    // =============================
    // Mostrar/Ocultar contraseña
    // =============================
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    togglePassword?.addEventListener("click", e => {
        e.preventDefault();
        const icon = togglePassword.querySelector("i");
        const userPassword = unhashValue(localStorage.getItem(`usuarioPassword_${hashedUid}`)) || "********";
        if (!passwordInput) return;

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            passwordInput.value = userPassword;
            icon?.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            passwordInput.type = "password";
            passwordInput.value = "********";
            icon?.classList.replace("fa-eye-slash", "fa-eye");
        }
    });
});