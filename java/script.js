const API = window.WebMotorAPI;
const getBaseUrl = () =>
  API?.BASE_URL || "https://webmotors-clone-back.onrender.com";
const CARROS_CACHE_KEY = "webmotor_carros_cache_v1";
let carrosData = []; // Variável global para armazenar os dados do back-end

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  carregarCarros();
  configurarBusca(); // Inicializa os ouvintes da busca
});
/* =========================
    1. CARREGAR CARROS
========================== */
async function carregarCarros() {
  const status = document.getElementById("catalog-status");
  if (status) status.textContent = "Carregando veículos...";
  try {
    carrosData = API ? await API.fetchCarrosJson() : [];

    if (Array.isArray(carrosData) && carrosData.length > 0) {
      localStorage.setItem(CARROS_CACHE_KEY, JSON.stringify(carrosData));
    }

    renderizarCarros(carrosData);
    configurarSetas();
    if (status) {
      status.textContent = carrosData.length
        ? `${carrosData.length} veículos disponíveis.`
        : "Nenhum veículo disponível por enquanto.";
    }
  } catch (err) {
    try {
      const cache = localStorage.getItem(CARROS_CACHE_KEY);
      const carrosCache = cache ? JSON.parse(cache) : [];

      if (Array.isArray(carrosCache) && carrosCache.length > 0) {
        carrosData = carrosCache;
        renderizarCarros(carrosData);
        configurarSetas();
        if (status)
          status.textContent =
            "API indisponível. Exibindo o último catálogo salvo.";
        return;
      }
    } catch {}

    console.error("Erro ao buscar carros:", err);
    if (status)
      status.textContent =
        "Não foi possível carregar os veículos. Tente novamente em instantes.";
  }
}

/* =========================
    2. RENDERIZAR CARDS
========================== */
function renderizarCarros(carros) {
  const secoes = {
    ofertas: document.querySelector('.carrossel[data-secao="ofertas"]'),
    classicos: document.querySelector('.carrossel[data-secao="classicos"]'),
    modernos: document.querySelector('.carrossel[data-secao="modernos"]'),
  };

  // limpa tudo
  Object.values(secoes).forEach((secao) => {
    if (secao) secao.innerHTML = "";
  });

  // Função pra ordenar por prioridade (1 a 5) e manter ordem original se empate
  const ordenarPorPrioridade = (arr) => {
    return arr.slice().sort((a, b) => {
      const pa = Number(a.prioridade) || 5;
      const pb = Number(b.prioridade) || 5;

      if (pb !== pa) return pb - pa;
      return 0; // mantém ordem original
    });
  };

  const carrosOfertas = [];
  const carrosClassicos = [];
  const carrosModernos = [];

  carros.forEach((carro) => {
    const ano = Number(carro.ano);

    // PROMOÇÃO (sempre entra se true)
    if (carro.emPromocao === true) {
      carrosOfertas.push(carro);
      return; // aqui impede que entre em outras seções
    }

    // SEÇÃO manual (se existir)
    if (carro.secao === "ofertas") carrosOfertas.push(carro);
    if (carro.secao === "classicos") carrosClassicos.push(carro);
    if (carro.secao === "modernos") carrosModernos.push(carro);

    // IF só pra novos ou antigos (quando não tem secao manual)
    if (!carro.secao) {
      if (!isNaN(ano) && ano <= 1995) carrosClassicos.push(carro);
      else if (!isNaN(ano) && ano >= 2016) carrosModernos.push(carro);
    }
  });

  // ordena por prioridade
  ordenarPorPrioridade(carrosOfertas).forEach((carro) =>
    secoes.ofertas?.appendChild(criarCard(carro)),
  );
  ordenarPorPrioridade(carrosClassicos).forEach((carro) =>
    secoes.classicos?.appendChild(criarCard(carro)),
  );
  ordenarPorPrioridade(carrosModernos).forEach((carro) =>
    secoes.modernos?.appendChild(criarCard(carro)),
  );

  configurarInteracoes();
}

/* =========================
    3. LÓGICA DE BUSCA
========================== */
function configurarBusca() {
  const inputBusca = document.getElementById("input-busca");
  const btnBuscar = document.querySelector(".btn-buscar");
  const carrosselResultados = document.getElementById("resultado-busca");
  const secaoResultados = document.getElementById("secao-resultados");
  const contador = document.getElementById("contador-resultados");
  const categoria = document.getElementById("filtro-categoria");
  const ordenacao = document.getElementById("ordenacao");
  const secoesOriginais = document.querySelectorAll(
    ".secao-carrossel:not(#secao-resultados)",
  );

  // Verifica se os elementos existem para não dar erro no console
  if (!inputBusca || !btnBuscar || !carrosselResultados) return;

  const realizarBusca = () => {
    const termo = inputBusca.value.toLowerCase().trim();
    const categoriaSelecionada = categoria?.value || "";
    const ordenacaoSelecionada = ordenacao?.value || "priority";

    if (
      termo === "" &&
      categoriaSelecionada === "" &&
      ordenacaoSelecionada === "priority"
    ) {
      secaoResultados.classList.add("hidden");
      secoesOriginais.forEach((s) => s.classList.remove("hidden"));
      return;
    }

    // --- LÓGICA PROFISSIONAL DE FILTRO ---
    const filtrados = (
      typeof carrosData !== "undefined" ? carrosData : []
    ).filter((carro) => {
      const buscaDinamica = `
                ${carro.marca} ${carro.modelo} ${carro.descricao}
                ${carro.cor} ${carro.cidade} ${carro.combustivel}
                ${carro.badge} ${carro.ano}
            `.toLowerCase();

      let termoAjustado = termo;
      if (termo === "wols" || termo === "vw" || termo === "volks")
        termoAjustado = "volkswagen";
      if (termo === "chevy") termoAjustado = "chevrolet";

      const correspondeBusca =
        !termo ||
        buscaDinamica.includes(termoAjustado) ||
        buscaDinamica.includes(termo);
      const correspondeCategoria =
        !categoriaSelecionada || carro.secao === categoriaSelecionada;
      return correspondeBusca && correspondeCategoria;
    });

    filtrados.sort((a, b) => {
      if (ordenacaoSelecionada === "price_asc")
        return Number(a.preco) - Number(b.preco);
      if (ordenacaoSelecionada === "price_desc")
        return Number(b.preco) - Number(a.preco);
      if (ordenacaoSelecionada === "year_desc")
        return Number(b.ano) - Number(a.ano);
      return Number(b.prioridade || 0) - Number(a.prioridade || 0);
    });

    // 1. Esconde as seções de Ofertas/Clássicos e mostra a de resultados
    secoesOriginais.forEach((s) => s.classList.add("hidden"));
    secaoResultados.classList.remove("hidden");

    // 2. Limpa o carrossel de resultados antes de inserir novos
    carrosselResultados.innerHTML = "";

    if (filtrados.length === 0) {
      if (contador) contador.innerText = "Nenhum veículo encontrado.";
      const empty = document.createElement("p");
      empty.className = "sem-resultado";
      empty.textContent = "Nenhum veículo corresponde aos filtros escolhidos.";
      carrosselResultados.appendChild(empty);
    } else {
      if (contador)
        contador.textContent = `${filtrados.length} veículo(s) encontrado(s).`;

      // 3. Renderiza os cards encontrados
      filtrados.forEach((carro) => {
        carrosselResultados.appendChild(criarCard(carro));
      });
    }

    // 5. Reativa as trocas de imagem no hover e cliques nos botões
    configurarInteracoes();

    // 6. Reativa as setas de scroll especificamente para este novo conteúdo
    configurarSetas();

    // 7. Scroll suave para o início da seção de resultados
    const offset =
      secaoResultados.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: offset, behavior: "smooth" });
  };

  // Listeners
  btnBuscar.onclick = realizarBusca;
  inputBusca.onkeyup = (e) => {
    if (e.key === "Enter") realizarBusca();
  };
  categoria?.addEventListener("change", realizarBusca);
  ordenacao?.addEventListener("change", realizarBusca);
}

/* =========================
    4. CRIAR CARD
========================== */
function criarCard(carro) {
  const card = document.createElement("div");
  card.className = "carro";
  card.style.position = "relative";

  const PLACEHOLDER = "assets/sem-imagem.svg";
  card.dataset.id = String(carro.id ?? carro._id ?? "");

  /* ===== IMAGENS ===== */
  let imagensArray = [];

  try {
    if (Array.isArray(carro.imagens)) {
      imagensArray = carro.imagens;
    } else if (typeof carro.imagens === "string") {
      try {
        imagensArray = JSON.parse(carro.imagens);
      } catch {
        imagensArray = carro.imagens ? [carro.imagens] : [];
      }
    }
  } catch {
    imagensArray = [];
  }

  if (imagensArray.length === 0 && carro.imagem) imagensArray = [carro.imagem];

  const imagensCorrigidas = imagensArray
    .map((img) => {
      if (!img) return null;
      if (/^https?:\/\//i.test(img)) return img;
      if (img.startsWith("/")) return getBaseUrl() + img;
      return `${getBaseUrl()}/imagens/${img}`;
    })
    .filter(Boolean);

  const imagemPrincipal = imagensCorrigidas[0] || PLACEHOLDER;

  /* ===== DATASETS ===== */
  card.dataset.descricao = carro.descricao || "";
  card.dataset.ano = carro.ano || "";
  card.dataset.km = carro.km || "";
  card.dataset.combustivel = carro.combustivel || "";
  card.dataset.finalPlaca = carro.finalPlaca || "";
  card.dataset.cambio = carro.cambio || "";
  card.dataset.cor = carro.cor || "";
  card.dataset.cidade = carro.cidade || "";
  card.dataset.troca = carro.aceitaTroca || "";
  card.dataset.prioridade = carro.prioridade || "";

  /* ===== BADGE ===== */
  const badgeHTML = carro.badge
    ? `<span class="badge">${escapeHtml(carro.badge)}</span>`
    : "";

  /* ===== PREÇOS (SEM BUG, SEM NaN) ===== */
  const precoNormal = Number(carro.preco);
  const precoAntigo = Number(carro.precoAntigo);

  let precoHTML = "";
  let precoAntigoHTML = "";

  if (!isNaN(precoAntigo) && precoAntigo > 0) {
    precoAntigoHTML = `
            <span class="preco-antigo">
                ${formatarPreco(precoAntigo)}
            </span>`;
  }

  if (!isNaN(precoNormal) && precoNormal > 0) {
    precoHTML = `
            <span class="preco">
                ${formatarPreco(precoNormal)}
            </span>`;
  } else {
    precoHTML = `<span class="preco consultar">Consultar preço</span>`;
  }

  /* ===== THUMBS ===== */
  const thumbsHTML = imagensCorrigidas.length
    ? imagensCorrigidas
        .map(
          (
            img,
          ) => `<img src="${escapeHtml(img)}" loading="lazy" alt="Outra foto de ${escapeHtml(carro.marca || "")} ${escapeHtml(carro.modelo || "")}"
                 onerror="this.onerror=null;this.src='${PLACEHOLDER}'">`,
        )
        .join("")
    : "";

  /* ===== HTML FINAL ===== */
  card.innerHTML = `
        ${badgeHTML}
        <img class="principal"
             src="${escapeHtml(imagemPrincipal)}"
             alt="${escapeHtml(carro.marca || "")} ${escapeHtml(carro.modelo || "")}"
             loading="lazy"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">

        <div class="thumbs">${thumbsHTML}</div>

        <h2>${escapeHtml(carro.marca || "")} ${escapeHtml(carro.modelo || "")}</h2>
        <p>${escapeHtml(carro.descricaoCurta || "")}</p>

        <p class="precos">
            ${precoAntigoHTML}
            ${precoHTML}
        </p>

        <button class="detalhes">Ver detalhes</button>
    `;

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarPreco(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================
    5. CLONAR CARDS (Para o Carrossel Infinito)
========================== */
function clonarCardsVisiveis() {
  document.querySelectorAll(".carrossel").forEach((carrossel) => {
    // Não clona se estivermos visualizando resultados de busca
    if (carrossel.closest(".hidden")) return;

    const cards = [...carrossel.children].filter(
      (c) => !c.classList.contains("clone"),
    );
    if (cards.length === 0) return;

    let i = 0;
    while (carrossel.children.length < MIN_CARDS) {
      const clone = cards[i % cards.length].cloneNode(true);
      clone.classList.add("clone");
      carrossel.appendChild(clone);
      i++;
    }
  });
}

/* =========================
    6. INTERAÇÕES E IMAGENS
========================== */
function configurarInteracoes() {
  document.querySelectorAll(".carro").forEach((carro) => {
    const principal = carro.querySelector(".principal");
    const thumbs = carro.querySelectorAll(".thumbs img");

    thumbs.forEach((t) => {
      t.addEventListener("mouseenter", () => trocarImagem(principal, t.src));
      t.addEventListener("click", () => trocarImagem(principal, t.src));
    });
  });

  // Removi o ouvinte anterior para não duplicar ao re-configurar interações
  document.removeEventListener("click", tratarCliqueDetalhes);
  document.addEventListener("click", tratarCliqueDetalhes);
}

function tratarCliqueDetalhes(e) {
  if (!e.target.classList.contains("detalhes")) return;

  const card = e.target.closest(".carro");
  if (!card) return;

  // pega o ID real vindo do back
  const carroId = card.dataset.id;

  if (!carroId) {
    alert("ID do veículo não encontrado.");
    return;
  }

  // passa o ID pela URL
  window.location.href = `detalhes.html?id=${carroId}`;
}

function trocarImagem(img, src) {
  img.style.opacity = "0.4";
  setTimeout(() => {
    img.src = src;
    img.style.opacity = "1";
  }, 200);
}

/* =========================
    7. SETAS
========================== */
function configurarSetas() {
  document.querySelectorAll(".secao-carrossel").forEach((secao) => {
    const carrossel = secao.querySelector(".carrossel");
    // Usando cloneNode para limpar eventos antigos se a função for chamada de novo
    const setaDir = secao.querySelector(".seta-dir");
    const setaEsq = secao.querySelector(".seta-esq");

    setaDir?.addEventListener("click", () => {
      carrossel.scrollBy({ left: 700, behavior: "smooth" });
    });
    setaEsq?.addEventListener("click", () => {
      carrossel.scrollBy({ left: -700, behavior: "smooth" });
    });
  });
}

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

/* =========================
   9. Validação do Token
========================== */

const token = localStorage.getItem("token");

if (token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin") {
      document.getElementById("btn-admin").style.display = "block";
    }
  } catch {}
}

const adminBtn = document.getElementById("btn-admin");
if (adminBtn) {
  adminBtn.addEventListener("click", () => {
    window.location.href = "admin/admin.html";
  });
}
