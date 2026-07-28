const API = window.WebMotorAPI;
const API_URL =
  API?.CARROS_WRITE_URL || "https://webmotors-clone-back.onrender.com/carros";
const getBaseUrl = () =>
  API?.BASE_URL || "https://webmotors-clone-back.onrender.com";

let carros = [];
let carroEmEdicao = null;
const formCarro = document.getElementById("form-carro");

/* =========================
   HELPERS
========================= */
function isTrue(val) {
  return val === true || val === "true";
}

function parseJwt(token) {
  const part = token.split(".")[1];
  return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
}

function requireAdminSession() {
  const token = localStorage.getItem("token");

  try {
    const payload = parseJwt(token);
    const isExpired = payload.exp && payload.exp * 1000 <= Date.now();
    if (payload.role !== "admin" || isExpired)
      throw new Error("Sessão inválida");
    return token;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("userPayload");
    window.location.replace("../login.html");
    return null;
  }
}

const adminToken = requireAdminSession();

function clearAdminSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("userPayload");
}

function redirectToLogin() {
  clearAdminSession();
  window.location.replace("../login.html");
}

async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${adminToken}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error("Sessão administrativa expirada.");
  }
  return response;
}

async function validateAdminSession() {
  if (!adminToken) return false;
  try {
    const response = await authFetch(`${getBaseUrl()}/auth/session`);
    if (!response.ok) {
      redirectToLogin();
      return false;
    }
    return response.ok;
  } catch {
    return false;
  }
}

/* =========================
   CARREGAR CARROS (READ)
========================= */
async function carregarCarros() {
  try {
    carros = API ? await API.fetchCarrosJson() : [];
    if (!Array.isArray(carros)) {
      throw new Error("Resposta inválida: carros não é um array");
    }

    const lista = document.getElementById("lista-carros");
    if (!lista) return;
    lista.innerHTML = "";

    carros.forEach((carro) => {
      const li = document.createElement("li");
      li.classList.add("carro-card");

      // Normaliza o campo imagens para array
      let imagens = [];
      try {
        if (typeof carro.imagens === "string") {
          imagens = JSON.parse(carro.imagens);
        } else if (Array.isArray(carro.imagens)) {
          imagens = carro.imagens;
        } else {
          imagens = [];
        }
      } catch (err) {
        imagens = [];
      }

      // Monta URL da imagem principal (robusto para Cloudinary / local / filename)
      let imagemUrl = "../assets/sem-imagem.svg";
      if (imagens && imagens.length > 0) {
        const img = imagens[0];
        if (!img) {
          imagemUrl = "../assets/sem-imagem.svg";
        } else if (typeof img === "string" && img.startsWith("http")) {
          // URL completa (Cloudinary)
          imagemUrl = img;
        } else if (typeof img === "string" && img.startsWith("/")) {
          // path local já com /imagens/...
          imagemUrl = getBaseUrl() + img;
        } else if (typeof img === "string") {
          // filename puro: /imagens/<filename>
          imagemUrl = `${getBaseUrl()}/imagens/${img}`;
        } else {
          imagemUrl = "../assets/sem-imagem.svg";
        }
      } else if (carro.imagem) {
        imagemUrl = API?.resolveImageUrl(carro.imagem) || carro.imagem;
      }

      // Usa emOferta (backend) com fallback para emPromocao (antigo front)
      const emPromo = isTrue(carro.emOferta) || isTrue(carro.emPromocao);

      li.innerHTML = `
        <img src="${imagemUrl}" 
             alt="${carro.marca || "Carro"} ${carro.modelo || ""}" 
             class="card-img">

        <div class="carro-info">
          <strong>${carro.marca} ${carro.modelo}</strong>

          ${
            emPromo && carro.precoAntigo
              ? `<p><s>R$ ${Number(carro.precoAntigo).toLocaleString("pt-BR")}</s></p>`
              : ""
          }

          <p>R$ ${Number(carro.preco).toLocaleString("pt-BR")}</p>

          <p>
            Ano: ${carro.ano || "-"} |
            KM: ${carro.km || "-"} |
            Comb.: ${carro.combustivel || "-"} |
            Câmbio: ${carro.cambio || "-"} |
            Cor: ${carro.cor || "-"} |
            Cidade: ${carro.cidade || "-"}
          </p>

          <p>${carro.descricao || ""}</p>
        </div>

        <div class="carro-actions">
          <button class="editar" data-id="${carro.id}">Editar</button>
          <button class="excluir" data-id="${carro.id}">Excluir</button>
        </div>
      `;

      lista.appendChild(li);
    });
  } catch (err) {
    console.error("Erro ao carregar carros:", err);
  }
}

function renderImagensExistentes(carro) {
  const container = document.getElementById("imagens-existentes");
  if (!container) return;

  container.innerHTML = "";

  let imagens = [];
  try {
    if (typeof carro.imagens === "string") imagens = JSON.parse(carro.imagens);
    else if (Array.isArray(carro.imagens)) imagens = carro.imagens;
  } catch (err) {
    imagens = [];
  }

  imagens.forEach((url) => {
    const img = document.createElement("img");
    img.src = url.startsWith("http") ? url : `${getBaseUrl()}${url}`;
    img.classList.add("img-existente");
    container.appendChild(img);
  });
}

/* =========================
   CLICK (EDITAR / EXCLUIR)
========================= */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("editar")) {
    iniciarEdicao(e.target.dataset.id);
  }

  if (e.target.classList.contains("excluir")) {
    deletarCarro(e.target.dataset.id);
  }
});

/* =========================
   MOSTRAR / ESCONDER PREÇO ANTIGO
========================= */
function togglePrecoAntigo() {
  const select = document.getElementById("emPromocao");
  const precoAntigoInput = document.getElementById("precoAntigo");
  const precoInput = document.getElementById("preco");

  if (!select || !precoAntigoInput || !precoInput) return;

  const emPromocao = isTrue(select.value);

  // mostra/esconde preço antigo
  precoAntigoInput.style.display = emPromocao ? "block" : "none";
  if (!emPromocao) precoAntigoInput.value = "";

  // placeholder dinâmico
  precoInput.placeholder = emPromocao ? "Preço antes do desconto" : "Preço";
}

document
  .getElementById("emPromocao")
  ?.addEventListener("change", togglePrecoAntigo);

/* =========================
   INICIAR EDIÇÃO
========================== */
function iniciarEdicao(id) {
  const carro = carros.find((c) => c.id == id);
  if (!carro) return;

  carroEmEdicao = id;

  document.getElementById("marca").value = carro.marca || "";
  document.getElementById("modelo").value = carro.modelo || "";
  document.getElementById("secao").value = carro.secao || "modernos";
  document.getElementById("preco").value = carro.preco || "";
  document.getElementById("descricao").value = carro.descricao || "";
  document.getElementById("ano").value = carro.ano || "";
  document.getElementById("km").value = carro.km || "";
  document.getElementById("combustivel").value = carro.combustivel || "";
  document.getElementById("cambio").value = carro.cambio || "";
  document.getElementById("cor").value = carro.cor || "";
  document.getElementById("cidade").value = carro.cidade || "";
  document.getElementById("finalPlaca").value = carro.finalPlaca || "";
  document.getElementById("descricaoCurta").value = carro.descricaoCurta || "";
  document.getElementById("aceitaTroca").value = carro.aceitaTroca
    ? "true"
    : "false";
  const badgeInput = document.getElementById("badge");
  if (badgeInput) badgeInput.value = carro.badge;

  // LIMPA AS IMAGENS ATUAIS
  currentFiles = [];

  // CARREGA AS IMAGENS DO CARRO (VINDO DO BACK)
  const existingImages = Array.isArray(carro.imagens)
    ? carro.imagens
    : carro.imagem
      ? [carro.imagem]
      : [];
  if (existingImages.length > 0) {
    existingImages.forEach((url) => {
      currentFiles.push({ file: null, base64: url });
    });
  }

  // ATUALIZA O PREVIEW IGUAL QUANDO SELECIONA
  showingAll = false;
  renderPreview();

  // --- EM PROMOÇÃO ---
  const promoVal = isTrue(carro.emOferta) || isTrue(carro.emPromocao);
  document.getElementById("emPromocao").value = promoVal ? "true" : "false";

  // --- PRIORIDADE ---
  document.getElementById("prioridade").value = carro.prioridade || 1;
  initBarraPrioridade(); // atualiza a barra com o valor atual

  // --- IMAGENS EXISTENTES ---
  renderImagensExistentes(carro);

  document.getElementById("precoAntigo").value = carro.precoAntigo || "";
  togglePrecoAntigo();

  document.getElementById("titulo-form").innerText = "Editar veículo";
  document.getElementById("btn-submit").innerText = "Salvar alterações";
}

/* =========================
   SUBMIT FORM (CREATE / UPDATE)
========================== */
if (formCarro) {
  formCarro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("marca", document.getElementById("marca").value);
    formData.append("modelo", document.getElementById("modelo").value);
    formData.append("secao", document.getElementById("secao").value);
    formData.append("preco", document.getElementById("preco").value);
    formData.append("descricao", document.getElementById("descricao").value);
    formData.append("ano", document.getElementById("ano").value);
    formData.append("km", document.getElementById("km").value);
    formData.append(
      "combustivel",
      document.getElementById("combustivel").value,
    );
    formData.append("cambio", document.getElementById("cambio").value);
    formData.append("cor", document.getElementById("cor").value);
    formData.append("cidade", document.getElementById("cidade").value);
    formData.append("finalPlaca", document.getElementById("finalPlaca").value);
    formData.append("prioridade", document.getElementById("prioridade").value);
    formData.append("badge", document.getElementById("badge").value);

    formData.append(
      "descricaocurta",
      document.getElementById("descricaoCurta").value,
    );
    formData.append(
      "aceitatroca",
      document.getElementById("aceitaTroca").value,
    );

    formData.append("emPromocao", document.getElementById("emPromocao").value);

    const precoAntVal = document.getElementById("precoAntigo").value;
    if (precoAntVal) {
      formData.append("precoAntigo", precoAntVal);
    }

    for (const item of currentFiles) {
      if (item.file) formData.append("imagens", item.file);
    }

    try {
      const submitButton = document.getElementById("btn-submit");
      const status = document.getElementById("form-status");
      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
      if (status) status.textContent = "";
      let res;
      if (carroEmEdicao) {
        res = await authFetch(`${API_URL}/${carroEmEdicao}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await authFetch(API_URL, {
          method: "POST",
          body: formData,
        });
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Não foi possível salvar o veículo.");
      }

      resetarFormulario();
      await carregarCarros();
      if (status) status.textContent = "Veículo salvo com sucesso.";
    } catch (err) {
      console.error("Erro backend:", err.message);
      const status = document.getElementById("form-status");
      if (status) status.textContent = err.message;
    } finally {
      const submitButton = document.getElementById("btn-submit");
      submitButton.disabled = false;
      submitButton.textContent = carroEmEdicao
        ? "Salvar alterações"
        : "Cadastrar veículo";
    }
  });
}

/* =========================
   RESETAR FORMULÁRIO
========================= */
function resetarFormulario() {
  const form = document.getElementById("form-carro");
  if (form) form.reset();

  // volta o modo de cadastro (não edição)
  carroEmEdicao = null;

  // volta o título e o texto do botão
  const titulo = document.getElementById("titulo-form");
  const btn = document.getElementById("btn-submit");

  if (titulo) titulo.innerText = "Cadastrar veículo";
  if (btn) btn.innerText = "Cadastrar";

  // limpa preview de imagens
  currentFiles = [];
  renderPreview();

  // garante que o campo preço antigo volte a esconder
  togglePrecoAntigo();

  // limpa badge e prioridade (reset manual)
  const badge = document.getElementById("badge");
  const prioridade = document.getElementById("prioridade");

  if (badge) badge.value = "novo";
  if (prioridade) prioridade.value = "0";

  // atualiza a barra de prioridade
  initBarraPrioridade();
}

const imagensExistentes = document.getElementById("imagens-existentes");
if (imagensExistentes) imagensExistentes.innerHTML = "";

/* =========================
   DELETE
========================= */
async function deletarCarro(id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  try {
    const res = await authFetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Erro ao excluir veículo");
    }
    await carregarCarros();
  } catch (err) {
    console.error("Erro ao deletar carro:", err);
  }
}

/* =========================
   IMAGENS-cadastrar FILES INCREMENTAL ORDEM FIXA SEM DUPLICATAS + REMOVER + MOSTRAR TODAS
========================= */
const inputFile = document.getElementById("imagens");
const fileInfo = document.querySelector(".file-upload-info");
const uploadWrapper = inputFile.closest(".file-upload-wrapper");

let previewContainer = document.querySelector(".file-upload-preview");
if (!previewContainer) {
  previewContainer = document.createElement("div");
  previewContainer.classList.add("file-upload-preview");
  uploadWrapper.appendChild(previewContainer);
}

let currentFiles = []; // { file: File, base64: string }
let showingAll = false; // controle se está mostrando todas

function loadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

async function renderPreview() {
  previewContainer.innerHTML = "";
  const maxVisible = 4;
  const filesToShow = showingAll
    ? currentFiles
    : currentFiles.slice(0, maxVisible);

  filesToShow.forEach((item, index) => {
    const imgWrapper = document.createElement("div");
    imgWrapper.style.position = "relative";
    imgWrapper.style.display = "inline-block";
    imgWrapper.style.marginRight = "8px";

    const img = document.createElement("img");
    img.src = item.base64;
    img.classList.add("thumb");

    // botão X de remoção
    const removeBtn = document.createElement("div");
    removeBtn.textContent = "×";
    removeBtn.classList.add("remove-btn"); // classe para CSS
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentFiles = currentFiles.filter((f) => f.base64 !== item.base64);
      renderPreview();
    });

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(removeBtn);

    // overlay +N na quarta imagem
    if (
      !showingAll &&
      index === maxVisible - 1 &&
      currentFiles.length > maxVisible
    ) {
      const overlay = document.createElement("div");
      overlay.classList.add("more-overlay");
      overlay.textContent = `+${currentFiles.length - maxVisible}`;

      overlay.style.position = "absolute";
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.color = "#fff";
      overlay.style.fontSize = "36px";
      overlay.style.fontWeight = "700";
      overlay.style.borderRadius = "8px";
      img.style.filter = "brightness(0.6)";

      overlay.addEventListener("click", () => {
        showingAll = true;
        renderPreview();
      });

      imgWrapper.appendChild(overlay);
    }

    previewContainer.appendChild(imgWrapper);
  });
}

inputFile.addEventListener("change", async () => {
  const newFiles = Array.from(inputFile.files);

  for (let file of newFiles) {
    const src = await loadImage(file);
    if (currentFiles.some((f) => f.base64 === src)) continue; // evita duplicatas
    currentFiles.push({ file, base64: src });
  }

  showingAll = false;
  renderPreview();

  inputFile.value = "";
});

/* =========================
    8. DARK MODE
========================== */
function initDarkMode() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const temaSalvo = localStorage.getItem("theme") || "dark";
  document.documentElement.dataset.theme = temaSalvo;

  const atualizarBotaoUI = (tema) => {
    themeToggle.innerHTML =
      tema === "light"
        ? '<i class="fas fa-sun"></i> Light Mode'
        : '<i class="fas fa-moon"></i> Dark Mode';
  };

  atualizarBotaoUI(temaSalvo);

  themeToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const novoTema =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novoTema;
    localStorage.setItem("theme", novoTema);
    atualizarBotaoUI(novoTema);
  });
}

document.querySelector(".sair-btn")?.addEventListener("click", (event) => {
  event.preventDefault();
  clearAdminSession();
  window.location.href = "../index.html";
});

/* =========================
   9 BARRA DE PRIORIDADE
========================== */
function initBarraPrioridade() {
  const barra = document.getElementById("barra-prioridade");
  const inputPrioridade = document.getElementById("prioridade");

  if (!barra || !inputPrioridade) return;

  const niveis = barra.querySelectorAll(".nivel");

  const marcarPrioridade = (nivelSelecionado) => {
    inputPrioridade.value = nivelSelecionado;

    niveis.forEach((n) => {
      const nivel = Number(n.dataset.nivel);
      n.classList.toggle("ativo", nivel <= nivelSelecionado);
    });
  };

  // inicia com o valor atual (se existir)
  marcarPrioridade(Number(inputPrioridade.value) || 0);

  niveis.forEach((n) => {
    n.addEventListener("click", () => {
      marcarPrioridade(Number(n.dataset.nivel));
    });
  });
}

// chama a função
initBarraPrioridade();

/* =========================
   INIT
========================= */
async function initAdminPanel() {
  if (!(await validateAdminSession())) return;
  await carregarCarros();
  togglePrecoAntigo();
  initDarkMode();
}

if (adminToken) initAdminPanel();
