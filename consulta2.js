const API_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
let allResults = [];

// Initialize date fields
window.addEventListener('load', function () {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    document.getElementById('startDate').value = sevenDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// Toggle advanced filters
function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    const icon = document.getElementById('advancedToggle');
    filters.classList.toggle('expanded');
    icon.classList.toggle('rotated');
}

// Clear advanced filters
function clearAdvancedFilters() {
    document.getElementById('filterTribunal').value = '';
    document.getElementById('filterOrgao').value = '';
    document.getElementById('filterTipo').value = '';
}

// Extract process numbers from text
function extractProcessNumbers(text) {
    const regex = /\b\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}\b/g;
    const matches = text.match(regex);
    return matches ? [...new Set(matches)] : [];
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado para área de transferência!', 'success');
    }).catch(err => {
        showToast('Erro ao copiar', 'error');
    });
}

// Show toast notification
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `status ${type}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Show status
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `<i class="fas fa-${type === 'loading' ? 'spinner fa-spin' : type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
}

// Fetch single process
async function fetchSingleProcess(processNumber, startDate, endDate) {
    const url = `${API_BASE_URL}?numeroProcesso=${encodeURIComponent(processNumber)}&dataDisponibilizacaoInicio=${startDate}&dataDisponibilizacaoFim=${endDate}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Limite de consultas excedido');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const items = data.items || data || [];
        return Array.isArray(items) ? items : [];

    } catch (error) {
        console.error(`Error fetching process ${processNumber}:`, error);
        return { error: error.message };
    }
}

// Apply filters to results
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

// Display results
function displayResults(processResults) {
    const resultsEl = document.getElementById('results');
    const statsEl = document.getElementById('stats');
    const exportBtn = document.getElementById('exportBtn');

    allResults = processResults;

    // Show stats
    statsEl.classList.remove('hidden');
    const totalProcesses = processResults.length;
    const totalResults = processResults.reduce((sum, p) => sum + (p.results?.length || 0), 0);

    document.getElementById('totalProcesses').textContent = totalProcesses;
    document.getElementById('totalResults').textContent = totalResults;

    const dataSize = new Blob([JSON.stringify(processResults)]).size;
    document.getElementById('dataSize').textContent = formatFileSize(dataSize);

    exportBtn.disabled = false;

    // Display results
    resultsEl.innerHTML = '';

    if (totalProcesses === 0) {
        resultsEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhum processo encontrado</h3>
                <p>Verifique os números de processo inseridos</p>
            </div>
        `;
        return;
    }

    processResults.forEach(processData => {
        const card = createProcessCard(processData);
        resultsEl.appendChild(card);
    });
}

// Create process card
function createProcessCard(processData) {
    const card = document.createElement('div');
    card.className = 'process-card';

    const header = document.createElement('div');
    header.className = 'process-header';

    if (!processData.results || processData.results.length === 0) {
        header.classList.add('no-results');
        header.innerHTML = `
            <div class="process-number">
                <i class="fas fa-file"></i>
                ${processData.processNumber}
            </div>
            <div class="process-actions">
                <button class="icon-btn" onclick="copyToClipboard('${processData.processNumber}')" title="Copiar número">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;
    } else {
        header.innerHTML = `
            <div class="process-number">
                <i class="fas fa-file"></i>
                ${processData.processNumber}
                <span class="process-badge">${processData.results.length}</span>
            </div>
            <div class="process-actions">
                <button class="icon-btn" onclick="copyToClipboard('${processData.processNumber}')" title="Copiar número">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="icon-btn" onclick="exportProcess('${processData.processNumber}')" title="Exportar processo">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'process-body';

        processData.results.forEach((item, index) => {
            const commItem = createCommunicationItem(item, index + 1);
            body.appendChild(commItem);
        });

        card.appendChild(body);
    }

    card.insertBefore(header, card.firstChild);
    return card;
}

// Create communication item
function createCommunicationItem(item, index) {
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
                    ${item.data_disponibilizacao ? `
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            ${item.data_disponibilizacao}
                        </span>
                    ` : ''}
                    ${item.siglaTribunal ? `
                        <span class="meta-item">
                            <i class="fas fa-building"></i>
                            ${item.siglaTribunal}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="communication-tags">
                ${typeTag}
            </div>
        </div>
        
        <div class="communication-content">
            ${item.nomeOrgao ? `
                <div class="info-row">
                    <span class="info-label">Órgão:</span>
                    <span class="info-value">${item.nomeOrgao}</span>
                </div>
            ` : ''}
            
            ${item.nomeClasse ? `
                <div class="info-row">
                    <span class="info-label">Classe:</span>
                    <span class="info-value">${item.nomeClasse}</span>
                </div>
            ` : ''}
            
            ${item.meiocompleto ? `
                <div class="info-row">
                    <span class="info-label">Meio:</span>
                    <span class="info-value">${item.meiocompleto}</span>
                </div>
            ` : ''}
            
            ${item.link ? `
                <div class="info-row">
                    <span class="info-label">Link:</span>
                    <a href="${item.link}" target="_blank" class="communication-link">
                        Acessar documento <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            ` : ''}
            
            ${item.texto && item.texto !== 'Não foi possível extrair conteúdo do documento' ? `
                <div class="communication-text">${item.texto}</div>
            ` : ''}
            
            ${item.destinatarios && item.destinatarios.length > 0 ? `
                <div class="destinatarios-section">
                    <div class="destinatarios-title">Destinatários</div>
                    <div class="destinatarios-list">
                        ${item.destinatarios.map(dest => `
                            <span class="destinatario-badge">
                                ${dest.nome} ${dest.polo ? `(${dest.polo})` : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${item.destinatarioadvogados && item.destinatarioadvogados.length > 0 ? `
                <div class="destinatarios-section">
                    <div class="destinatarios-title">Advogados</div>
                    <div class="destinatarios-list">
                        ${item.destinatarioadvogados.map(adv => `
                            <span class="destinatario-badge">
                                ${adv.advogado.nome} - ${adv.advogado.numero_oab}/${adv.advogado.uf_oab}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    return div;
}

// Get type tag
function getTypeTag(tipo) {
    const typeClass = tipo?.toLowerCase().includes('intima') ? 'intimacao' :
        tipo?.toLowerCase().includes('edital') ? 'edital' : 'lista';
    return `<span class="tag ${typeClass}">${tipo || 'N/A'}</span>`;
}

// Export results
function exportResults() {
    const filteredResults = applyFilters(allResults);
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `djen-consulta-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Resultados exportados com sucesso!', 'success');
}

// Export single process
function exportProcess(processNumber) {
    const processData = allResults.find(p => p.processNumber === processNumber);
    if (!processData) return;

    const dataStr = JSON.stringify(processData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `processo-${processNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Processo exportado com sucesso!', 'success');
}

// Main fetch function
async function fetchMultipleProcesses() {
    const processText = document.getElementById('processNumbers').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!processText) {
        showStatus('Por favor, insira os números de processo.', 'error');
        return;
    }

    if (!startDate || !endDate) {
        showStatus('Por favor, selecione as datas inicial e final.', 'error');
        return;
    }

    const btn = document.getElementById('fetchBtn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span> Consultando...';

    const startTime = performance.now();

    try {
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

            if (results && typeof results === 'object' && results.error) {
                processResults.push({
                    processNumber: processNumber,
                    results: [],
                    error: results.error
                });
            } else {
                processResults.push({
                    processNumber: processNumber,
                    results: results
                });
            }

            if (i < processNumbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const filteredResults = applyFilters(processResults);

        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        document.getElementById('responseTime').textContent = `${totalTime}ms`;

        const totalResults = filteredResults.reduce((sum, p) => sum + (p.results?.length || 0), 0);
        const processesWithResults = filteredResults.filter(p => p.results && p.results.length > 0).length;

        showStatus(`Consulta concluída! ${processesWithResults}/${processNumbers.length} processos com resultados (${totalResults} comunicações)`, 'success');

        displayResults(filteredResults);

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Erro: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-search"></i> Consultar Processos';
    }
}