// Registro
const registerForm = document.getElementById("registerForm");
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = registerForm.nombre.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;

    try {
        const res = await fetch("http://localhost:3000/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password })
        });

        if (res.ok) {
            alert("Se ha registrado exitosamente");
            // Redirigir al login
            window.location.href = "index.html";
        } else {
            const data = await res.json();
            console.error("Error de registro:", data.message);
        }
    } catch (error) {
        console.error("Error al registrar:", error);
    }
});

// Login
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    try {
        const res = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            // Guardar el nombre del usuario en localStorage
            localStorage.setItem("usuarioNombre", data.usuario.nombre);
            window.location.href = "home.html";
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (error) {
        alert("Error al iniciar sesión: " + error.message);
    }
});
