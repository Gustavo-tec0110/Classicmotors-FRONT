(function initPublicAdminAccess(global) {
  const accessLink = document.getElementById("admin-access");
  const logoutButton = document.getElementById("admin-logout");
  const logoutItem = document.querySelector(".admin-logout-item");

  if (!accessLink) return;

  function parseJwt(token) {
    const part = token.split(".")[1];
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("userPayload");
  }

  let isAdmin = false;
  try {
    const payload = parseJwt(localStorage.getItem("token") || "");
    const isExpired = payload.exp && payload.exp * 1000 <= Date.now();
    isAdmin = payload.role === "admin" && !isExpired;
    if (!isAdmin) clearSession();
  } catch {
    clearSession();
  }

  if (isAdmin) {
    accessLink.href = "admin/admin.html";
    const label = accessLink.querySelector("span");
    if (label) label.textContent = "Painel administrativo";
    const icon = accessLink.querySelector("i");
    if (icon) icon.className = "fas fa-user-shield";
    if (logoutButton) logoutButton.hidden = false;
    if (logoutItem) logoutItem.hidden = false;
  }

  logoutButton?.addEventListener("click", () => {
    clearSession();
    global.location.href = "index.html";
  });
})(window);
