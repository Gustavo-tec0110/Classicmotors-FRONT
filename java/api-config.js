(function initWebMotorApi(global) {
  const DEFAULT_BASE_URL = "https://webmotors-clone-back.onrender.com";
  const configured = (global.WEBMOTOR_API_BASE || "").trim();
  const saved = (global.localStorage && global.localStorage.getItem("WEBMOTOR_API_BASE") || "").trim();
  const baseUrl = (configured || saved || DEFAULT_BASE_URL).replace(/\/+$/, "");

  function normalizeCarrosResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.carros)) return payload.carros;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return null;
  }

  const api = {
    BASE_URL: baseUrl,
    CARROS_WRITE_URL: `${baseUrl}/carros`,

    async fetchCarrosJson() {
      const url = `${api.BASE_URL}/carros`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Falha ao carregar ${url} (${res.status})`);
      }

      const json = await res.json();
      const carros = normalizeCarrosResponse(json);

      if (!carros) {
        throw new Error("Resposta do backend fora do formato esperado para carros");
      }

      return carros;
    },

    resolveImageUrl(path) {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      if (path.startsWith("/")) return `${api.BASE_URL}${path}`;
      return `${api.BASE_URL}/imagens/${path}`;
    }
  };

  global.WebMotorAPI = api;
})(window);


