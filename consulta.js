const API_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
let allResults = [];

// ====================== INICIALIZAÇÃO ======================
window.addEventListener('load', () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    document.getElementById('startDate').value = sevenDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});

window.addEventListener('DOMContentLoaded', () => {
    restoreFiltersFromURLorLocal();
    renderSavedSearches();
});

// ====================== FUNÇÕES DE INTERFACE ======================
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    const icon = document.getElementById('advancedToggle');
    filters.classList.toggle('expanded');
    icon.classList.toggle('rotated');
}

function clearAdvancedFilters() {
    [
        'filterTribunal','filterOrgao','filterTipo',
        'filterNomeParte','filterNomeAdvogado',
        'filterNumeroOab','filterUfOab','filterMeio'
    ].forEach(id => document.getElementById(id).value = '');
}

// ====================== MODAIS PERSONALIZADOS ======================
function showModal(options) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3>${options.title || 'Confirmação'}</h3>
                <p>${options.message || ''}</p>
                ${options.input ? `<input id="modalInput" type="text" value="${options.defaultValue || ''}">` : ''}
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
                    <button class="btn btn-primary" id="okBtn">${options.okText || 'Confirmar'}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const cleanup = () => overlay.remove();

        document.getElementById('cancelBtn').onclick = () => { cleanup(); resolve(null); };
        document.getElementById('okBtn').onclick = () => {
            const val = options.input ? document.getElementById('modalInput').value.trim() : true;
            cleanup();
            resolve(val || null);
        };
    });
}

// ====================== VALIDAÇÃO E PARÂMETROS ======================
function validateSearchParams() {
    const processText = document.getElementById('processNumbers').value.trim();
    const tribunal = document.getElementById('filterTribunal').value.trim();
    const nomeParte = document.getElementById('filterNomeParte').value.trim();
    const nomeAdvogado = document.getElementById('filterNomeAdvogado').value.trim();
    const numeroOab = document.getElementById('filterNumeroOab').value.trim();
    const itensPorPagina = document.getElementById('itensPorPagina').value;

    if (processText && extractProcessNumbers(processText).length > 0) return { valid: true };
    if (tribunal || nomeParte || nomeAdvogado || numeroOab) return { valid: true };
    if (itensPorPagina === '5') return { valid: true };

    return {
        valid: false,
        message: 'É necessário informar algum filtro ou limitar a 5 itens por página.'
    };
}

function extractProcessNumbers(text) {
    const regex = /\b\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}\b/g;
    const matches = text.match(regex);
    return matches ? [...new Set(matches)] : [];
}

function updateURLFromFilters() {
    const params = new URLSearchParams();
    const fields = [
        "processNumbers","startDate","endDate",
        "filterTribunal","filterOrgao","filterTipo",
        "filterNomeParte","filterNomeAdvogado",
        "filterNumeroOab","filterUfOab","filterMeio",
        "itensPorPagina"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim()) params.set(id, el.value.trim());
    });
    history.replaceState(null, "", "?" + params.toString());
    localStorage.setItem("lastSearchParams", "?" + params.toString());
}

function restoreFiltersFromURLorLocal() {
    const params = new URLSearchParams(window.location.search);
    const saved = localStorage.getItem("lastSearchParams");
    const sourceParams = params.size ? params : saved ? new URLSearchParams(saved) : null;
    if (!sourceParams) return;
    for (const [key, value] of sourceParams.entries()) {
        const el = document.getElementById(key);
        if (el) el.value = value;
    }
    if (params.size) fetchMultipleProcesses();
}

// ====================== FEEDBACK VISUAL ======================
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `status ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function showMainStatus(message, type = 'info') {
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = `
        <div class="main-status ${type}">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'loading' ? 'spinner fa-spin' : 'info-circle'}"></i>
            <p>${message}</p>
        </div>`;
}

// ====================== LOADER PRINCIPAL ======================
function showMainLoader() {
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = `<div class="main-loader"><div class="spinner"></div><p>Carregando...</p></div>`;
}

// ====================== REQUISIÇÕES ======================
async function fetchFromAPI(url) {
    try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            if (response.status === 403) throw new Error('Acesso negado (403). API pode estar bloqueando requisições diretas.');
            if (response.status === 429) throw new Error('Limite de consultas excedido. Aguarde um pouco.');
            if (response.status === 422) throw new Error('Parâmetros inválidos para a API.');
            if (response.status === 500) throw new Error('Erro interno do servidor.');
            throw new Error(`Erro HTTP ${response.status}`);
        }
        const data = await response.json();
        const items = data.items || data || [];
        return Array.isArray(items) ? items : [];
    } catch (err) {
        return { error: err.message };
    }
}

// ====================== BUSCA PRINCIPAL ======================
async function fetchMultipleProcesses() {
    const processText = document.getElementById('processNumbers').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const validation = validateSearchParams();
    if (!validation.valid) return showMainStatus(validation.message, 'error');

    updateURLFromFilters();
    showMainLoader();

    const btn = document.getElementById('fetchBtn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span> Consultando...';

    try {
        let results = [];
        if (!processText) {
            results = await fetchAllProcesses(startDate, endDate);
            if (results.error) throw new Error(results.error);
        } else {
            const numbers = extractProcessNumbers(processText);
            for (let i = 0; i < numbers.length; i++) {
                const r = await fetchSingleProcess(numbers[i], startDate, endDate);
                if (r.error) throw new Error(r.error);
                results.push({ numeroprocessocommascara: numbers[i], ...r });
                if (i < numbers.length - 1) await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!results || (Array.isArray(results) && results.length === 0))
            return showMainStatus('Nenhum resultado encontrado.', 'info');

        const formatted = formatResults(results);
        displayResults(formatted);
    } catch (error) {
        showMainStatus(error.message, 'error');
    } finally {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-search"></i> Consultar Processos';
    }
}

async function fetchAllProcesses(start, end) {
    const params = new URLSearchParams({
        dataDisponibilizacaoInicio: start,
        dataDisponibilizacaoFim: end
    });
    const add = (id, key) => {
        const val = document.getElementById(id).value.trim();
        if (val) params.append(key, val);
    };
    add('filterTribunal','siglaTribunal');
    add('filterOrgao','nomeOrgao');
    add('filterTipo','tipoComunicacao');
    add('filterNomeParte','nomeParte');
    add('filterNomeAdvogado','nomeAdvogado');
    add('filterNumeroOab','numeroOab');
    add('filterUfOab','ufOab');
    add('filterMeio','meio');
    add('itensPorPagina','itensPorPagina');
    return await fetchFromAPI(`${API_BASE_URL}?${params.toString()}`);
}

async function fetchSingleProcess(num, start, end) {
    const params = new URLSearchParams({
        numeroProcesso: num,
        dataDisponibilizacaoInicio: start,
        dataDisponibilizacaoFim: end
    });
    return await fetchFromAPI(`${API_BASE_URL}?${params.toString()}`);
}

function formatResults(results) {
    if (!Array.isArray(results)) return [];
    const map = {};
    results.forEach(item => {
        const num = item.numeroprocessocommascara || item.numeroProcesso || 'Desconhecido';
        if (!map[num]) map[num] = { processNumber: num, results: [] };
        map[num].results.push(item);
    });
    return Object.values(map);
}

function displayResults(processResults) {
    const resultsEl = document.getElementById('results');
    const statsEl = document.getElementById('stats');
    const exportBtn = document.getElementById('exportBtn');
    allResults = processResults;

    statsEl.classList.remove('hidden');
    document.getElementById('totalProcesses').textContent = processResults.length;
    document.getElementById('totalResults').textContent = processResults.reduce((s, p) => s + (p.results?.length || 0), 0);
    document.getElementById('dataSize').textContent = formatFileSize(new Blob([JSON.stringify(processResults)]).size);
    exportBtn.disabled = false;

    if (processResults.length === 0)
        return showMainStatus('Nenhum processo encontrado.', 'info');

    resultsEl.innerHTML = processResults.map(p => `
        <div class="process-card">
            <div class="process-header">
                <i class="fas fa-file"></i> ${p.processNumber}
                <span class="process-badge">${p.results.length}</span>
            </div>
        </div>
    `).join('');
}

// ====================== SALVAMENTO DE BUSCAS ======================
function getCurrentSearchParams() {
    const params = new URLSearchParams();
    const fields = [
        "processNumbers","startDate","endDate",
        "filterTribunal","filterOrgao","filterTipo",
        "filterNomeParte","filterNomeAdvogado",
        "filterNumeroOab","filterUfOab","filterMeio",
        "itensPorPagina"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim()) params.set(id, el.value.trim());
    });
    return params;
}

async function saveCurrentSearch() {
    const params = getCurrentSearchParams();
    if (!params.toString()) return showToast("Nenhum filtro preenchido.", "error");

    const name = await showModal({
        title: "Salvar Busca",
        message: "Dê um nome para identificar esta busca:",
        input: true,
        defaultValue: new Date().toLocaleString("pt-BR")
    });
    if (!name) return;

    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    saved.push({ name, query: params.toString(), date: Date.now() });
    localStorage.setItem("savedSearches", JSON.stringify(saved));
    renderSavedSearches();
    showToast("Busca salva.", "success");
}

function renderSavedSearches() {
    const container = document.getElementById("savedSearchesList");
    if (!container) return;
    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    if (saved.length === 0) {
        container.innerHTML = "<p class='empty-saved'>Nenhuma busca salva.</p>";
        return;
    }
    container.innerHTML = saved.map((s, i) => `
        <div class="saved-search-item">
            <span class="saved-name" title="${s.name}">${s.name}</span>
            <div class="saved-actions">
                <button class="icon-btn" onclick="loadSavedSearch(${i})" title="Carregar"><i class="fas fa-play"></i></button>
                <button class="icon-btn" onclick="deleteSavedSearch(${i})" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function loadSavedSearch(index) {
    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    const search = saved[index];
    if (!search) return;
    const params = new URLSearchParams(search.query);
    for (const [key, value] of params.entries()) {
        const el = document.getElementById(key);
        if (el) el.value = value;
    }
    updateURLFromFilters();
    showToast(`Busca "${search.name}" carregada.`, "success");
}

function deleteSavedSearch(index) {
    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    saved.splice(index, 1);
    localStorage.setItem("savedSearches", JSON.stringify(saved));
    renderSavedSearches();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
