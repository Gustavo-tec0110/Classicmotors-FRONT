(function initAdminLogin(global) {
  const apiBase =
    global.WebMotorAPI?.BASE_URL ||
    "https://webmotors-clone-back.onrender.com";
  const form = document.getElementById("admin-login-form");
  const errorMessage = document.getElementById("login-error");
  const submitButton = form?.querySelector(".btn-login");

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("userPayload");
  }

  function setLoading(loading) {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.setAttribute("aria-busy", String(loading));
    submitButton.querySelector("span").textContent = loading
      ? "Verificando..."
      : "Entrar no painel";
  }

  function showError(message) {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    if (!form.reportValidity()) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.elements.email.value.trim(),
          password: form.elements.password.value,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token) {
        clearSession();
        showError("E-mail ou senha inválidos.");
        return;
      }

      localStorage.setItem("token", payload.token);
      window.location.replace("admin/admin.html");
    } catch {
      clearSession();
      showError(
        "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      );
    } finally {
      setLoading(false);
    }
  });
})(window);
