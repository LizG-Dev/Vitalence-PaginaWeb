// Elementos del modal
const recoverModal = document.getElementById("recoverModal");
const closeModalBtn = document.getElementById("closeModal");
const forgotLink = document.querySelector(".sign-in a[href='#']");

// Pasos del modal
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

// Inputs
const recoverEmailInput = document.getElementById("recoverEmail");
const colorFavoritoInput = document.getElementById("colorFavorito");
const nombreMascotaInput = document.getElementById("nombreMascota");
const cancionFavoritaInput = document.getElementById("cancionFavorita");
const nombreMamaInput = document.getElementById("nombreMama");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

// Botones
const verifyEmailBtn = document.getElementById("verifyEmailBtn");
const verifyAnswersBtn = document.getElementById("verifyAnswersBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const toggleNewPassword = document.getElementById("toggleNewPassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

// Modal 
if (forgotLink) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    recoverModal.style.display = "flex";
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    recoverModal.style.display = "none";
    resetSteps();
  });
}

function resetSteps() {
  step1.style.display = "block";
  step2.style.display = "none";
  step3.style.display = "none";
  recoverEmailInput.value = "";
  colorFavoritoInput.value = "";
  nombreMascotaInput.value = "";
  cancionFavoritaInput.value = "";
  nombreMamaInput.value = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
}

let recoverEmail = "";

// Verificar correo
verifyEmailBtn?.addEventListener("click", async () => {
  const email = recoverEmailInput?.value.trim();
  if (!email) return alert("Por favor, introduce tu correo electrónico.");

  try {
    const res = await fetch("/api/recover/verify-email", { // ruta relativa
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      console.error("Respuesta no JSON:", text);
      throw e;
    }

    if (!res.ok) {
      return alert(data.message || "Error al verificar el correo.");
    }

    recoverEmail = email;
    step1.style.display = "none";
    step2.style.display = "block";
  } catch (err) {
    alert("No se pudo conectar al servidor.");
  }
});

// Verificar respuestas de seguridad
verifyAnswersBtn?.addEventListener("click", async () => {
  const respuestas = {
    colorFavorito: colorFavoritoInput?.value.trim(),
    nombreMascota: nombreMascotaInput?.value.trim(),
    cancionFavorita: cancionFavoritaInput?.value.trim(),
    nombreMama: nombreMamaInput?.value.trim(),
  };

  if (!Object.values(respuestas).every(r => r)) {
    return alert("Por favor responde todas las preguntas.");
  }

  try {
    const res = await fetch("/api/recover/verify-answers", { // ruta relativa
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: recoverEmail, respuestas }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      console.error("Respuesta no JSON:", text);
      throw e;
    }

    if (!res.ok) {
      return alert(data.message || "Respuestas incorrectas.");
    }
    alert("Respuestas correctas, ahora puedes cambiar tu contraseña.");

    step2.style.display = "none";
    step3.style.display = "block";
  } catch (err) {
    alert("Error de conexión con el servidor.");
  }
});

// Cambiar contraseña
changePasswordBtn?.addEventListener("click", async () => {
  const newPassword = newPasswordInput?.value.trim();
  const confirmPassword = confirmPasswordInput?.value.trim();

  if (!newPassword || !confirmPassword) return alert("Por favor, completa ambos campos.");
  if (newPassword.length < 8) return alert("La contraseña debe tener al menos 8 caracteres.");
  if (newPassword !== confirmPassword) return alert("Las contraseñas no coinciden.");

  try {
    const res = await fetch("/api/recover/change-password", { // ruta relativa
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: recoverEmail, newPassword, confirmPassword }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      console.error("Respuesta no JSON:", text);
      throw e;
    }

    if (!res.ok) {
      return alert(data.message || "Error al cambiar la contraseña.");
    }
    alert("Contraseña cambiada con éxito. Ahora puedes iniciar sesión.");

    recoverModal.style.display = "none";
    resetSteps();
  } catch (err) {
    alert("Error al conectar con el servidor.");
  }
});

// Toggle visibilidad de contraseñas
toggleNewPassword.addEventListener("click", () => {
  const type = newPasswordInput.type === "password" ? "text" : "password";
  newPasswordInput.type = type;
  toggleNewPassword.innerHTML = `<i class="fas ${type === "password" ? "fa-eye" : "fa-eye-slash"}"></i>`;
});

toggleConfirmPassword.addEventListener("click", () => {
  const type = confirmPasswordInput.type === "password" ? "text" : "password";
  confirmPasswordInput.type = type;
  toggleConfirmPassword.innerHTML = `<i class="fas ${type === "password" ? "fa-eye" : "fa-eye-slash"}"></i>`;
});