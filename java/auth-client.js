// js/auth-client.js
const BASE_URL =
  window.WebMotorAPI?.BASE_URL || "https://webmotors-clone-back.onrender.com";

// helper para carregar script dinamicamente
function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

// pega flag do backend e ativa/desativa o Google UI
async function initAuthClient() {
  try {
    const r = await fetch(`${BASE_URL}/auth/feature-google`);
    const json = await r.json();
    const enabled = json.enabled === true;

    const googleBtnContainer = document.getElementById("googleBtn");
    if (!enabled) {
      // profissional: remove botão / oculta
      if (googleBtnContainer) googleBtnContainer.style.display = "none";
      return;
    }

    // carrega SDK do Google dinamicamente
    await loadScript("https://accounts.google.com/gsi/client", {
      async: true,
      defer: true,
    });

    // inicializa botão (mesma lógica que você já tinha)
    google.accounts.id.initialize({
      client_id:
        "900520090831-tocd8s3mis8o5jo4tsgs4nim9vs96ugh.apps.googleusercontent.com",
      callback: handleGoogleLogin,
    });

    google.accounts.id.renderButton(document.getElementById("googleBtn"), {
      theme: "outline",
      size: "large",
    });
  } catch (err) {
    console.error("Erro ao checar recurso Google ou carregar SDK:", err);
    const googleBtnContainer = document.getElementById("googleBtn");
    if (googleBtnContainer) googleBtnContainer.style.display = "none";
  }
}

// callback do Google (mantém o mesmo comportamento)
async function handleGoogleLogin(response) {
  try {
    const token = response.credential;
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    const data = await res.json();
    localStorage.setItem("token", data.token);
    window.location.href = "/dashboard";
  } catch (err) {
    console.error("ERRO NO LOGIN GOOGLE:", err);
    alert("Erro ao autenticar com Google");
  }
}

/* ---------------------------
   AUTH LOCAL (email + senha)
   --------------------------- */

// salva token e opcionalmente o payload decodificado
function saveToken(token) {
  localStorage.setItem("token", token);
  try {
    const payload = parseJwt(token);
    localStorage.setItem("userPayload", JSON.stringify(payload));
  } catch {}
}

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userPayload");
}

// decodificador simples de JWT (não valida assinatura)
function parseJwt(token) {
  const part = token.split(".")[1];
  return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
}

// login com fetch
async function loginWithEmail(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Erro no login");
  }

  const data = await res.json();
  // caso o backend retorne só token, ok; se retornar user+token também ok
  const token = data.token || (data && data.token) || data;
  saveToken(token);
  return token;
}

// helper pra requests autenticadas
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  if (token) headers["Authorization"] = "Bearer " + token;
  options.headers = headers;
  return fetch(url, options);
}

/* Inicializa tudo ao carregar a página */
window.addEventListener("DOMContentLoaded", () => {
  initAuthClient();

  // conecta botões do seu HTML (ajuste seletor conforme seu markup)
  const btnLogin = document.querySelector(".btn-login");
  if (btnLogin) {
    btnLogin.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = document.querySelector('input[placeholder="E-mail"]').value;
      const password = document.querySelector(
        'input[placeholder="Senha"]',
      ).value;
      try {
        const token = await loginWithEmail(email, password);
        const payload = parseJwt(token);
        alert("Login efetuado");
        window.location.href =
          payload.role === "admin" ? "admin/admin.html" : "index.html";
      } catch (err) {
        alert(err.message);
      }
    });
  }
});
