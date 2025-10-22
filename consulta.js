const API_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
let allResults = [];

// ====================== INICIALIZAÇÃO ======================
window.addEventListener('load', () => {
    const today = new Date();
    // const sevenDaysAgo = new Date();
    // sevenDaysAgo.setDate(today.getDate() - 7);
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});

window.addEventListener('DOMContentLoaded', () => {
    renderSavedSearches();
    // Verifica se há parâmetros na URL
    const params = new URLSearchParams(window.location.search);
    let hasParams = false;

    const fields = [
        "processNumbers", "startDate", "endDate",
        "filterTribunal", "filterOrgao", "filterTipo",
        "filterNomeParte", "filterNomeAdvogado",
        "filterNumeroOab", "filterUfOab", "filterMeio",
        "itensPorPagina"
    ];

    fields.forEach(id => {
        const value = params.get(id);
        if (value) {
            const el = document.getElementById(id);
            if (el) {
                el.value = value;
                hasParams = true;
            }
        }
    });

    // Se houver parâmetros, executa a busca automaticamente
    if (hasParams) {
        setTimeout(() => {
            fetchMultipleProcesses();
        }, 500);
    }
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
        'filterTribunal', 'filterOrgao', 'filterTipo',
        'filterNomeParte', 'filterNomeAdvogado',
        'filterNumeroOab', 'filterUfOab', 'filterMeio'
    ].forEach(id => document.getElementById(id).value = '');
}

// ====================== PRESET DE DATAS ======================
function setDatePreset(preset) {
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
        case 'today':
            startDate = new Date();
            break;
        case 'yesterday':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'month':
            startDate.setDate(endDate.getDate() - 30);
            break;
    }

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
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

function showShareModal(url) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box">
            <h3><i class="fas fa-share-nodes"></i> Compartilhar Busca</h3>
            <p>Compartilhe esta busca com outras pessoas:</p>
            <div class="share-options">
                <button class="btn btn-primary" onclick="copyShareLink('${url}')">
                    <i class="fas fa-copy"></i> Copiar Link
                </button>
                <button class="btn btn-secondary" onclick="shareToWhatsApp('${url}')">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="btn btn-secondary" onclick="shareToTelegram('${url}')">
                    <i class="fab fa-telegram"></i> Telegram
                </button>
                <button class="btn btn-secondary" onclick="shareToEmail('${url}')">
                    <i class="fas fa-envelope"></i> Email
                </button>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function showExportMenu() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box">
            <h3><i class="fas fa-download"></i> Exportar Resultados</h3>
            <p>Escolha o formato de exportação:</p>
            <div class="export-options">
                <button class="btn btn-primary" onclick="exportResults('json')">
                    <i class="fas fa-code"></i> JSON
                </button>
                <button class="btn btn-secondary" onclick="exportResults('csv')">
                    <i class="fas fa-table"></i> CSV
                </button>
                <button class="btn btn-secondary" onclick="exportResults('pdf')">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
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
        "processNumbers", "startDate", "endDate",
        "filterTribunal", "filterOrgao", "filterTipo",
        "filterNomeParte", "filterNomeAdvogado",
        "filterNumeroOab", "filterUfOab", "filterMeio",
        "itensPorPagina"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim()) {
            // Se for processNumbers, extrai apenas os números válidos
            if (id === 'processNumbers') {
                const extracted = extractProcessNumbers(el.value);
                if (extracted.length > 0) {
                    params.set(id, extracted.join('\n'));
                }
            } else {
                params.set(id, el.value.trim());
            }
        }
    });
    history.replaceState(null, "", "?" + params.toString());
}

// ====================== FEEDBACK VISUAL ======================
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `status ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showStatus(message, type) {
    showMainStatus(message, type);
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `<i class="fas fa-${type === 'loading' ? 'spinner fa-spin' : type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
}

function showMainStatus(message, type = 'info') {
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = `
        <div class="main-status ${type}">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'loading' ? 'spinner fa-spin' : 'info-circle'}"></i>
            <p>${message}</p>
        </div>`;
}

function showMainLoader() {
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = `<div class="main-loader"><div class="spinner"></div><p>Carregando...</p></div>`;
}

// ====================== UTILIDADES ======================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado para área de transferência!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
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

async function fetchSingleProcess(num, start, end) {
    const params = new URLSearchParams({ numeroProcesso: num, dataDisponibilizacaoInicio: start, dataDisponibilizacaoFim: end });
    return await fetchFromAPI(`${API_BASE_URL}?${params.toString()}`);
}

async function fetchAllProcesses(start, end) {
    const params = new URLSearchParams({ dataDisponibilizacaoInicio: start, dataDisponibilizacaoFim: end });
    const add = (id, key) => { const val = document.getElementById(id).value.trim(); if (val) params.append(key, val); };
    ['filterTribunal', 'filterOrgao', 'filterTipo', 'filterNomeParte', 'filterNomeAdvogado', 'filterNumeroOab', 'filterUfOab', 'filterMeio', 'itensPorPagina']
        .forEach(id => add(id, id === 'itensPorPagina' ? id : id.replace('filter', '')));
    return await fetchFromAPI(`${API_BASE_URL}?${params.toString()}`);
}

// ====================== FORMATAÇÃO DE RESULTADOS ======================
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

function getTypeTag(tipo) {
    const typeClass = tipo?.toLowerCase().includes('intima') ? 'intimacao' :
        tipo?.toLowerCase().includes('edital') ? 'edital' : 'lista';
    return `<span class="tag ${typeClass}">${tipo || 'N/A'}</span>`;
}

function createCommunicationItem(item, index, processNumber) {
    const div = document.createElement('div');
    div.className = 'communication-item';
    const typeTag = getTypeTag(item.tipoComunicacao);

    div.innerHTML = `
        <div class="communication-header">
            <div>
                <div class="communication-title">
                    <i class="fas fa-file-lines"></i>
                    Comunicação ${index}
                </div>
                <div class="communication-meta">
                    ${item.data_disponibilizacao ? `<span class="meta-item"><i class="fas fa-calendar"></i>${item.data_disponibilizacao}</span>` : ''}
                    ${item.siglaTribunal ? `<span class="meta-item"><i class="fas fa-building"></i>${item.siglaTribunal}</span>` : ''}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="communication-tags">${typeTag}</div>
                <button class="icon-btn" onclick="exportSingleCommunication('${processNumber}', ${index - 1})" title="Baixar PDF desta comunicação">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        </div>
        <div class="communication-content">
            ${item.nomeOrgao ? `<div class="info-row"><span class="info-label">Órgão:</span><span class="info-value">${item.nomeOrgao}</span></div>` : ''}
            ${item.nomeClasse ? `<div class="info-row"><span class="info-label">Classe:</span><span class="info-value">${item.nomeClasse}</span></div>` : ''}
            ${item.meiocompleto ? `<div class="info-row"><span class="info-label">Meio:</span><span class="info-value">${item.meiocompleto}</span></div>` : ''}
            ${item.link ? `<div class="info-row"><span class="info-label">Link:</span><a href="${item.link}" target="_blank" class="communication-link">Acessar documento <i class="fas fa-external-link-alt"></i></a></div>` : ''}
            ${item.texto && item.texto !== 'Não foi possível extrair conteúdo do documento' ? `<div class="communication-text">${item.texto}</div>` : ''}
            ${item.destinatarios && item.destinatarios.length > 0 ? `<div class="destinatarios-section"><div class="destinatarios-title">Destinatários</div><div class="destinatarios-list">${item.destinatarios.map(d => `<span class="destinatario-badge">${d.nome} ${d.polo ? `(${d.polo})` : ''}</span>`).join('')}</div></div>` : ''}
            ${item.destinatarioadvogados && item.destinatarioadvogados.length > 0 ? `<div class="destinatarios-section"><div class="destinatarios-title">Advogados</div><div class="destinatarios-list">${item.destinatarioadvogados.map(a => `<span class="destinatario-badge">${a.advogado.nome} - ${a.advogado.numero_oab}/${a.advogado.uf_oab}</span>`).join('')}</div></div>` : ''}
        </div>`;
    return div;
}

function createProcessCard(processData) {
    const card = document.createElement('div');
    card.className = 'process-card';

    const header = document.createElement('div');
    header.className = 'process-header';

    if (!processData.results || processData.results.length === 0) {
        header.classList.add('no-results');
        header.innerHTML = `
            <div class="process-number"><i class="fas fa-file"></i>${processData.processNumber}</div>
            <div class="process-actions">
                <button class="icon-btn" onclick="copyToClipboard('${processData.processNumber}')" title="Copiar número"><i class="fas fa-copy"></i></button>
            </div>`;
    } else {
        header.innerHTML = `
            <div class="process-number"><i class="fas fa-file"></i>${processData.processNumber}<span class="process-badge">${processData.results.length}</span></div>
            <div class="process-actions">
                <button class="icon-btn" onclick="copyToClipboard('${processData.processNumber}')" title="Copiar número"><i class="fas fa-copy"></i></button>
                <button class="icon-btn" onclick="exportProcess('${processData.processNumber}')" title="Exportar processo"><i class="fas fa-download"></i></button>
            </div>`;

        const body = document.createElement('div');
        body.className = 'process-body';
        processData.results.forEach((item, idx) => {
            body.appendChild(createCommunicationItem(item, idx + 1, processData.processNumber));
        });
        card.appendChild(body);
    }

    card.insertBefore(header, card.firstChild);
    return card;
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

    resultsEl.innerHTML = '';
    if (processResults.length === 0) {
        resultsEl.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Nenhum processo encontrado</h3><p>Verifique os números de processo inseridos</p></div>`;
        return;
    }

    processResults.forEach(p => resultsEl.appendChild(createProcessCard(p)));
}

// ====================== EXPORTAÇÃO ======================
function exportResults(format = 'json') {
    const filteredResults = applyFilters(allResults);
    const timestamp = new Date().toISOString().split('T')[0];

    // Fecha o modal
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();

    if (format === 'json') {
        const dataBlob = new Blob([JSON.stringify(filteredResults, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `djen-consulta-${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Resultados exportados em JSON!', 'success');
    } else if (format === 'csv') {
        exportToCSV(filteredResults, timestamp);
    } else if (format === 'pdf') {
        exportToPDF(filteredResults, timestamp);
    }
}

function exportToCSV(results, timestamp) {
    const rows = [];
    rows.push(['Número do Processo', 'Data', 'Tribunal', 'Órgão', 'Tipo', 'Classe', 'Meio', 'Link']);

    results.forEach(process => {
        if (process.results && process.results.length > 0) {
            process.results.forEach(item => {
                rows.push([
                    process.processNumber,
                    item.data_disponibilizacao || '',
                    item.siglaTribunal || '',
                    item.nomeOrgao || '',
                    item.tipoComunicacao || '',
                    item.nomeClasse || '',
                    item.meiocompleto || '',
                    item.link || ''
                ]);
            });
        }
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const dataBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `djen-consulta-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Resultados exportados em CSV!', 'success');
}

function exportToPDF(results, timestamp) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const lineHeight = 7;
    const maxWidth = pageWidth - (margin * 2);

    // Adiciona o link da pesquisa no rodapé de cada página
    const searchUrl = window.location.href;
    const addFooter = (pageNum) => {
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Link da pesquisa: ${searchUrl}`, margin, pageHeight - 10, { maxWidth: maxWidth });
        doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    let pageNum = 1;

    // Título
    doc.setFontSize(16);
    doc.setTextColor(6, 95, 70);
    doc.text('DJEN Consultor - Resultados', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 10;

    // Processos
    results.forEach((process, index) => {
        if (yPosition > pageHeight - 50) {
            addFooter(pageNum);
            doc.addPage();
            pageNum++;
            yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(6, 95, 70);
        doc.text(`Processo: ${process.processNumber}`, margin, yPosition);
        yPosition += lineHeight;

        if (process.results && process.results.length > 0) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Total de comunicações: ${process.results.length}`, margin, yPosition);
            yPosition += lineHeight + 3;

            process.results.forEach((item, idx) => {
                if (yPosition > pageHeight - 50) {
                    addFooter(pageNum);
                    doc.addPage();
                    pageNum++;
                    yPosition = 20;
                }

                doc.setFont(undefined, 'bold');
                doc.setTextColor(6, 95, 70);
                doc.text(`Comunicação ${idx + 1}:`, margin + 5, yPosition);
                yPosition += lineHeight;

                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);

                if (item.data_disponibilizacao) {
                    doc.text(`Data: ${item.data_disponibilizacao}`, margin + 10, yPosition);
                    yPosition += lineHeight;
                }

                if (item.siglaTribunal) {
                    doc.text(`Tribunal: ${item.siglaTribunal}`, margin + 10, yPosition);
                    yPosition += lineHeight;
                }

                if (item.nomeOrgao) {
                    const orgaoLines = doc.splitTextToSize(`Órgão: ${item.nomeOrgao}`, maxWidth - 10);
                    doc.text(orgaoLines, margin + 10, yPosition);
                    yPosition += lineHeight * orgaoLines.length;
                }

                if (item.tipoComunicacao) {
                    doc.text(`Tipo: ${item.tipoComunicacao}`, margin + 10, yPosition);
                    yPosition += lineHeight;
                }

                if (item.nomeClasse) {
                    doc.text(`Classe: ${item.nomeClasse}`, margin + 10, yPosition);
                    yPosition += lineHeight;
                }

                if (item.meiocompleto) {
                    const meioLines = doc.splitTextToSize(`Meio: ${item.meiocompleto}`, maxWidth - 10);
                    doc.text(meioLines, margin + 10, yPosition);
                    yPosition += lineHeight * meioLines.length;
                }

                if (item.link) {
                    doc.setTextColor(6, 95, 70);
                    const linkLines = doc.splitTextToSize(`Link: ${item.link}`, maxWidth - 10);
                    doc.text(linkLines, margin + 10, yPosition);
                    doc.setTextColor(0, 0, 0);
                    yPosition += lineHeight * linkLines.length;
                }

                // ADICIONA O TEXTO DA COMUNICAÇÃO
                if (item.texto && item.texto !== 'Não foi possível extrair conteúdo do documento') {
                    yPosition += 3;

                    if (yPosition > pageHeight - 50) {
                        addFooter(pageNum);
                        doc.addPage();
                        pageNum++;
                        yPosition = 20;
                    }

                    doc.setFont(undefined, 'bold');
                    doc.text(`Conteúdo:`, margin + 10, yPosition);
                    yPosition += lineHeight;

                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(9);
                    const textoLines = doc.splitTextToSize(item.texto, maxWidth - 10);

                    textoLines.forEach(line => {
                        if (yPosition > pageHeight - 50) {
                            addFooter(pageNum);
                            doc.addPage();
                            pageNum++;
                            yPosition = 20;
                        }
                        doc.text(line, margin + 10, yPosition);
                        yPosition += lineHeight;
                    });

                    doc.setFontSize(10);
                    yPosition += 3;
                }

                yPosition += 3;
            });
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(128, 128, 128);
            doc.text('Nenhuma comunicação encontrada', margin + 5, yPosition);
            yPosition += lineHeight;
        }

        yPosition += 5;
    });

    // Adiciona rodapé na última página
    addFooter(pageNum);

    doc.save(`djen-consulta-${timestamp}.pdf`);
    showToast('Resultados exportados em PDF!', 'success');
}

function exportProcess(processNumber) {
    const processData = allResults.find(p => p.processNumber === processNumber);
    if (!processData) return;
    const dataBlob = new Blob([JSON.stringify(processData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `processo-${processNumber}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Processo exportado com sucesso!', 'success');
}

function exportSingleCommunication(processNumber, commIndex) {
    const processData = allResults.find(p => p.processNumber === processNumber);
    if (!processData || !processData.results || !processData.results[commIndex]) {
        showToast('Erro: Comunicação não encontrada', 'error');
        return;
    }
    
    const item = processData.results[commIndex];
    const timestamp = new Date().toISOString().split('T')[0];
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const lineHeight = 7;
    const maxWidth = pageWidth - (margin * 2);

    // Rodapé com link
    const searchUrl = window.location.href;
    const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Link: ${searchUrl}`, margin, pageHeight - 10, { maxWidth: maxWidth });
    };

    // Título
    doc.setFontSize(16);
    doc.setTextColor(6, 95, 70);
    doc.text('DJEN Consultor - Comunicação', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 10;

    // Processo
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text(`Processo: ${processNumber}`, margin, yPosition);
    yPosition += lineHeight + 3;

    // Comunicação
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    if (item.data_disponibilizacao) {
        doc.text(`Data: ${item.data_disponibilizacao}`, margin, yPosition);
        yPosition += lineHeight;
    }

    if (item.siglaTribunal) {
        doc.text(`Tribunal: ${item.siglaTribunal}`, margin, yPosition);
        yPosition += lineHeight;
    }

    if (item.nomeOrgao) {
        const orgaoLines = doc.splitTextToSize(`Órgão: ${item.nomeOrgao}`, maxWidth);
        doc.text(orgaoLines, margin, yPosition);
        yPosition += lineHeight * orgaoLines.length;
    }

    if (item.tipoComunicacao) {
        doc.text(`Tipo: ${item.tipoComunicacao}`, margin, yPosition);
        yPosition += lineHeight;
    }

    if (item.nomeClasse) {
        doc.text(`Classe: ${item.nomeClasse}`, margin, yPosition);
        yPosition += lineHeight;
    }

    if (item.meiocompleto) {
        const meioLines = doc.splitTextToSize(`Meio: ${item.meiocompleto}`, maxWidth);
        doc.text(meioLines, margin, yPosition);
        yPosition += lineHeight * meioLines.length;
    }

    if (item.link) {
        doc.setTextColor(6, 95, 70);
        const linkLines = doc.splitTextToSize(`Link: ${item.link}`, maxWidth);
        doc.text(linkLines, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineHeight * linkLines.length;
    }

    // Texto da comunicação
    if (item.texto && item.texto !== 'Não foi possível extrair conteúdo do documento') {
        yPosition += 5;
        
        if (yPosition > pageHeight - 50) {
            addFooter();
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text(`Conteúdo:`, margin, yPosition);
        yPosition += lineHeight;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const textoLines = doc.splitTextToSize(item.texto, maxWidth);
        
        textoLines.forEach(line => {
            if (yPosition > pageHeight - 50) {
                addFooter();
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += lineHeight;
        });
        doc.setFontSize(10);
    }

    // Destinatários
    if (item.destinatarios && item.destinatarios.length > 0) {
        yPosition += 5;
        if (yPosition > pageHeight - 50) {
            addFooter();
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text('Destinatários:', margin, yPosition);
        yPosition += lineHeight;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        item.destinatarios.forEach(d => {
            if (yPosition > pageHeight - 50) {
                addFooter();
                doc.addPage();
                yPosition = 20;
            }
            doc.text(`• ${d.nome} ${d.polo ? `(${d.polo})` : ''}`, margin + 5, yPosition);
            yPosition += lineHeight;
        });
        doc.setFontSize(10);
    }

    // Advogados
    if (item.destinatarioadvogados && item.destinatarioadvogados.length > 0) {
        yPosition += 5;
        if (yPosition > pageHeight - 50) {
            addFooter();
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text('Advogados:', margin, yPosition);
        yPosition += lineHeight;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        item.destinatarioadvogados.forEach(a => {
            if (yPosition > pageHeight - 50) {
                addFooter();
                doc.addPage();
                yPosition = 20;
            }
            doc.text(`• ${a.advogado.nome} - ${a.advogado.numero_oab}/${a.advogado.uf_oab}`, margin + 5, yPosition);
            yPosition += lineHeight;
        });
    }

    addFooter();
    doc.save(`comunicacao-${processNumber}-${commIndex + 1}-${timestamp}.pdf`);
    showToast('Comunicação exportada em PDF!', 'success');
}

// ====================== COMPARTILHAMENTO ======================
function copyShareLink(url) {
    copyToClipboard(url);
    document.querySelector('.modal-overlay').remove();
}

function shareToWhatsApp(url) {
    const text = encodeURIComponent(`Confira esta consulta DJEN: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    document.querySelector('.modal-overlay').remove();
}

function shareToTelegram(url) {
    const text = encodeURIComponent(`Confira esta consulta DJEN: ${url}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    document.querySelector('.modal-overlay').remove();
}

function shareToEmail(url) {
    const subject = encodeURIComponent('Consulta DJEN - Compartilhamento');
    const body = encodeURIComponent(`Olá,\n\nCompartilho com você esta consulta do DJEN:\n\n${url}\n\nAtenciosamente.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    document.querySelector('.modal-overlay').remove();
}

// ====================== FILTROS ======================
function applyFilters(results) {
    const tribunal = document.getElementById('filterTribunal').value.toLowerCase();
    const orgao = document.getElementById('filterOrgao').value.toLowerCase();
    const tipo = document.getElementById('filterTipo').value;

    if (!tribunal && !orgao && !tipo) return results;

    return results.map(process => {
        if (!process.results || process.results.length === 0) return process;
        const filteredResults = process.results.filter(item => {
            if (tribunal && !item.siglaTribunal?.toLowerCase().includes(tribunal)) return false;
            if (orgao && !item.nomeOrgao?.toLowerCase().includes(orgao)) return false;
            if (tipo && item.tipoComunicacao !== tipo) return false;
            return true;
        });
        return { ...process, results: filteredResults };
    });
}

// ====================== BUSCA PRINCIPAL ======================
async function fetchMultipleProcesses() {
    const processText = document.getElementById('processNumbers').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const validation = validateSearchParams();
    if (!validation.valid) return showStatus(validation.message, 'error');

    updateURLFromFilters();
    showMainLoader();

    const btn = document.getElementById('fetchBtn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span> Consultando...';

    try {
        let results = [];
        if (!processText) {

            const confirmSearch = await showModal({
                title: "Confirmar busca",
                message: "Deseja buscar TODAS as comunicações no período selecionado? Isso pode retornar muitos resultados e levar mais tempo.",
            });
            if (!confirmSearch) {
                btn.disabled = false;
                btnText.innerHTML = '<i class="fas fa-search"></i> Consultar Processos';
                showStatus('Consulta cancelada', 'info');
                return;
            }

            showStatus('Buscando todas as comunicações no período...', 'loading');
            const startTime = performance.now();
            results = await fetchAllProcesses(startDate, endDate);
            if (results.error) throw new Error(results.error);

            const processMap = {};
            results.forEach(item => {
                const processNum = item.numeroprocessocommascara || item.numeroProcesso || 'Desconhecido';
                if (!processMap[processNum]) processMap[processNum] = { processNumber: processNum, results: [] };
                processMap[processNum].results.push(item);
            });
            const formattedResults = Object.values(processMap);
            const totalTime = Math.round(performance.now() - startTime);
            document.getElementById('responseTime').textContent = `${totalTime}ms`;
            showStatus(`Consulta concluída! ${formattedResults.length} processos encontrados (${results.length} comunicações) em ${totalTime}ms`, 'success');
            displayResults(formattedResults);
            return;
        }

        // Fluxo normal com números de processo
        const startTime = performance.now();
        showStatus('Extraindo números de processo...', 'loading');

        const processNumbers = extractProcessNumbers(processText);
        if (processNumbers.length === 0) {
            showStatus('Nenhum número de processo válido encontrado.', 'error');
            return;
        }

        showStatus(`Encontrados ${processNumbers.length} processos. Iniciando consultas...`, 'loading');
        const processResults = [];
        for (let i = 0; i < processNumbers.length; i++) {
            const processNumber = processNumbers[i];
            const progress = Math.round(((i + 1) / processNumbers.length) * 100);
            showStatus(`Consultando ${i + 1}/${processNumbers.length} (${progress}%): ${processNumber}`, 'loading');
            const results = await fetchSingleProcess(processNumber, startDate, endDate);
            if (results.error) {
                processResults.push({ processNumber, results: [], error: results.error });
            } else {
                processResults.push({ processNumber, results });
            }
            if (i < processNumbers.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const filteredResults = applyFilters(processResults);
        const totalTime = Math.round(performance.now() - startTime);
        document.getElementById('responseTime').textContent = `${totalTime}ms`;
        showStatus(`Consulta concluída! ${filteredResults.filter(p => p.results.length > 0).length}/${processNumbers.length} processos com resultados (${filteredResults.reduce((s, p) => s + (p.results?.length || 0), 0)} comunicações)`, 'success');
        displayResults(filteredResults);

    } catch (error) {
        showStatus(error.message, 'error');

    } finally {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-search"></i> Consultar Processos';
    }
}

// ====================== SALVAMENTO DE BUSCAS ======================
function getCurrentSearchParams() {
    const params = new URLSearchParams();
    const fields = [
        "processNumbers", "startDate", "endDate",
        "filterTribunal", "filterOrgao", "filterTipo",
        "filterNomeParte", "filterNomeAdvogado",
        "filterNumeroOab", "filterUfOab", "filterMeio",
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
    showToast("Busca salva com sucesso!", "success");
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
                <button class="icon-btn" onclick="shareSavedSearch(${i})" title="Compartilhar"><i class="fas fa-share-nodes"></i></button>
                <button class="icon-btn" onclick="deleteSavedSearch(${i})" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
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

    // Executa a busca automaticamente
    setTimeout(() => {
        fetchMultipleProcesses();
    }, 500);
}

function shareSavedSearch(index) {
    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    const search = saved[index];
    if (!search) return;

    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?${search.query}`;

    showShareModal(fullUrl);
}

function deleteSavedSearch(index) {
    const saved = JSON.parse(localStorage.getItem("savedSearches") || "[]");
    saved.splice(index, 1);
    localStorage.setItem("savedSearches", JSON.stringify(saved));
    renderSavedSearches();
    showToast("Busca excluída.", "success");
}

// ====================== FILTRO DE PÁGINA ======================
function highlightText(text, search) {
    if (!search || !text) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function filterPageResults() {
    const searchTerm = document.getElementById('pageFilter').value.trim().toLowerCase();
    const clearBtn = document.getElementById('clearPageFilter');
    const filterCount = document.getElementById('filterCount');
    const processCards = document.querySelectorAll('.process-card');

    clearBtn.style.display = searchTerm ? 'block' : 'none';

    if (!searchTerm) {
        processCards.forEach(card => card.style.display = 'block');
        filterCount.textContent = '';
        return;
    }

    let visibleCount = 0;
    let totalCommunications = 0;

    processCards.forEach(card => {
        const processNumber = card.querySelector('.process-number').textContent.toLowerCase();
        const communications = card.querySelectorAll('.communication-item');
        let hasVisibleComm = false;

        // Verifica se o número do processo contém o termo
        const processMatches = processNumber.includes(searchTerm);

        communications.forEach(comm => {
            const originalContent = comm.getAttribute('data-original') || comm.innerHTML;
            if (!comm.getAttribute('data-original')) {
                comm.setAttribute('data-original', comm.innerHTML);
            }

            const textContent = comm.textContent.toLowerCase();
            const matches = textContent.includes(searchTerm) || processMatches;

            if (matches) {
                // Restaura conteúdo original e aplica highlight
                comm.innerHTML = originalContent;
                const allText = comm.querySelectorAll('.info-value, .communication-text, .destinatario-badge');
                allText.forEach(el => {
                    el.innerHTML = highlightText(el.textContent, searchTerm);
                });
                comm.style.display = 'block';
                hasVisibleComm = true;
                totalCommunications++;
            } else {
                comm.style.display = 'none';
            }
        });

        // Se o número do processo bate, mostra o card mesmo sem comunicações visíveis
        if (hasVisibleComm || processMatches) {
            card.style.display = 'block';
            visibleCount++;

            // Destaca o número do processo se houver match
            if (processMatches) {
                const processNumEl = card.querySelector('.process-number');
                const originalText = processNumEl.getAttribute('data-original') || processNumEl.innerHTML;
                if (!processNumEl.getAttribute('data-original')) {
                    processNumEl.setAttribute('data-original', originalText);
                }
                processNumEl.innerHTML = highlightText(processNumEl.textContent, searchTerm);
            }
        } else {
            card.style.display = 'none';
        }
    });

    filterCount.textContent = `${visibleCount} processo(s), ${totalCommunications} comunicação(ões)`;
}

function clearPageFilter() {
    document.getElementById('pageFilter').value = '';

    // Remove todos os highlights e data-original
    const processCards = document.querySelectorAll('.process-card');
    processCards.forEach(card => {
        card.style.display = 'block';

        // Restaura número do processo
        const processNumEl = card.querySelector('.process-number');
        if (processNumEl && processNumEl.getAttribute('data-original')) {
            processNumEl.innerHTML = processNumEl.getAttribute('data-original');
            processNumEl.removeAttribute('data-original');
        }

        // Restaura todas as comunicações
        const communications = card.querySelectorAll('.communication-item');
        communications.forEach(comm => {
            comm.style.display = 'block';
            if (comm.getAttribute('data-original')) {
                comm.innerHTML = comm.getAttribute('data-original');
                comm.removeAttribute('data-original');
            }
        });
    });

    // Limpa contador e esconde botão de limpar
    document.getElementById('filterCount').textContent = '';
    document.getElementById('clearPageFilter').style.display = 'none';
}

// Event listeners para o filtro de página
document.addEventListener('DOMContentLoaded', () => {
    const pageFilterInput = document.getElementById('pageFilter');
    const clearBtn = document.getElementById('clearPageFilter');

    if (pageFilterInput) {
        pageFilterInput.addEventListener('input', filterPageResults);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearPageFilter);
    }
});