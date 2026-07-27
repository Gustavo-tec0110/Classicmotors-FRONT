(function initWebMotorApi(global) {
  const DEFAULT_BASE_URL = "https://webmotors-clone-back.onrender.com";
  const LOCAL_BASE_URL = "http://localhost:3000";
  const configured = (global.WEBMOTOR_API_BASE || "").trim();
  const saved = (
    (global.localStorage && global.localStorage.getItem("WEBMOTOR_API_BASE")) ||
    ""
  ).trim();
  const isLocal = ["localhost", "127.0.0.1"].includes(global.location.hostname);
  const baseUrl = (
    configured ||
    saved ||
    (isLocal ? LOCAL_BASE_URL : DEFAULT_BASE_URL)
  ).replace(/\/+$/, "");

  function normalizeCarrosResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.carros)) return payload.carros;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return null;
  }

  const api = {
    BASE_URL: baseUrl,
    CARROS_WRITE_URL: `${baseUrl}/carros`,

    async fetchCarrosJson(params = {}) {
      const query = new URLSearchParams(
        Object.entries(params).filter(
          ([, value]) => value !== "" && value != null,
        ),
      );
      const url = `${api.BASE_URL}/carros${query.size ? `?${query}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Falha ao carregar ${url} (${res.status})`);
      }

      const json = await res.json();
      const carros = normalizeCarrosResponse(json);

      if (!carros) {
        throw new Error(
          "Resposta do backend fora do formato esperado para carros",
        );
      }

      return carros;
    },

    async fetchCarroById(id) {
      const res = await fetch(
        `${api.BASE_URL}/carros/${encodeURIComponent(id)}`,
      );
      if (!res.ok) {
        throw new Error(`Falha ao carregar o veículo (${res.status})`);
      }
      return res.json();
    },

    async fetchCategorias() {
      const res = await fetch(`${api.BASE_URL}/carros/categorias`);
      if (!res.ok) {
        throw new Error(`Falha ao carregar as categorias (${res.status})`);
      }
      return res.json();
    },

    resolveImageUrl(path) {
      if (!path) return "assets/sem-imagem.svg";
      if (/^https?:\/\//i.test(path)) return path;
      if (path.startsWith("/")) return `${api.BASE_URL}${path}`;
      return `${api.BASE_URL}/imagens/${path}`;
    },
  };

  global.WebMotorAPI = api;
})(window);
