// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, get, set, push, remove, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// A mesma configuração do Firebase usada na página do construtor
const firebaseConfig = {
    apiKey: "AIzaSyAtuwWlErlNOW_c5BlBE_ktwSSmHGLjN2c",
    authDomain: "prototipoos.firebaseapp.com",
    databaseURL: "https://prototipoos-default-rtdb.firebaseio.com",
    projectId: "prototipoos",
    storageBucket: "prototipoos.firebasestorage.app",
    messagingSenderId: "969276068015",
    appId: "1:969276068015:web:ef7d8c7bfc6f8d5104445a",
};

// Inicialização de variáveis globais
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estado da aplicação
const state = {
    path: '',
    moduleId: '',
    entityId: '',
    schema: null,
    entityData: [],
    currentView: 'table',
    currentRecord: null,
    isEditMode: false,
    filterField: '',
    filterOperator: 'eq',
    filterValue: '',
    kanbanField: '',
    entityIcon: 'clipboard-list'
};

// Evento que dispara quando o conteúdo HTML da página está pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa ícones
    if (typeof lucide !== 'undefined' && lucide) {
        lucide.createIcons();
    }
    
    // Carrega os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    state.path = urlParams.get('path'); 

    if (!state.path) {
        // Se não houver caminho, mostra a tela de ajuda
        document.getElementById('view-container').style.display = 'none';
        document.getElementById('help-container').classList.remove('hidden');
    } else {
        // Processa o caminho
        const pathParts = state.path.split('/');
        if (pathParts.length !== 2) {
            showError('Caminho inválido', 'O formato do caminho deve ser "modulo/entidade".');
            return;
        }
        
        state.moduleId = pathParts[0];
        state.entityId = pathParts[1];
        
        document.getElementById('help-container').style.display = 'none';
        
        // Anima a transição de entrada
        setTimeout(() => {
            document.getElementById('view-container').classList.remove('opacity-0');
        }, 100);
        
        // Inicia o carregamento dos dados
        initialize();
    }
    
    // Configura os event listeners
    setupEventListeners();
});

/**
 * Inicializa a aplicação carregando os esquemas e dados necessários
 */
async function initialize() {
    try {
        // Carrega o esquema da entidade
        await loadEntitySchema();
        
        // Atualiza a interface com as informações da entidade
        updateEntityInfo();
        
        // Configura os filtros baseados no esquema
        setupFilters();
        
        // Carrega os dados da entidade e atualiza a visualização atual
        await loadEntityData();
        
        // Inicializa a visualização atual
        updateActiveView();
        
    } catch (error) {
        console.error("Erro ao inicializar:", error);
        showError('Erro ao inicializar', error.message);
    }
}

/**
 * Configura todos os event listeners necessários
 */
function setupEventListeners() {
    // Botões de troca de visualização
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.currentView = tab.dataset.view;
            updateActiveView();
        });
    });
    
    // Botão para criar novo registro
    document.getElementById('new-record-btn').addEventListener('click', () => {
        openRecordModal();
    });
    
    // Botões do formulário principal
    document.getElementById('save-data-btn').addEventListener('click', (e) => {
        e.preventDefault();
        saveFormData();
    });
    
    // Botões de filtro
    document.getElementById('apply-filter-btn').addEventListener('click', applyFilter);
    document.getElementById('clear-filter-btn').addEventListener('click', clearFilter);
    
    // Select do Kanban
    document.getElementById('kanban-field').addEventListener('change', (e) => {
        state.kanbanField = e.target.value;
        renderKanbanBoard();
    });
    
    // Botões do modal de registro
    document.getElementById('close-record-modal-btn').addEventListener('click', closeRecordModal);
    document.getElementById('save-record-btn').addEventListener('click', saveRecord);
    document.getElementById('delete-record-btn').addEventListener('click', confirmDeleteRecord);
}

/**
 * Carrega o esquema da entidade do Firebase
 */
async function loadEntitySchema() {
    const schemaRef = ref(db, `schemas/${state.moduleId}/${state.entityId}`);
    const snapshot = await get(schemaRef);
    
    if (!snapshot.exists()) {
        throw new Error(`A estrutura para '${state.path}' não existe. Verifique o caminho na URL e certifique-se de ter salvo a estrutura no construtor.`);
    }
    
    state.schema = snapshot.val();
    
    // Carrega o ícone da entidade
    const entityRef = ref(db, `entities/${state.entityId}`);
    const entitySnapshot = await get(entityRef);
    if (entitySnapshot.exists()) {
        const entity = entitySnapshot.val();
        state.entityIcon = entity.icon || 'clipboard-list';
    }
}

/**
 * Atualiza as informações da entidade na interface
 */
function updateEntityInfo() {
    document.getElementById('entity-title').textContent = state.schema.entityName || 'Entidade';
    document.getElementById('entity-subtitle').textContent = `Visualize e gerencie ${state.schema.entityName.toLowerCase()} com múltiplas visualizações`;
    
    // Atualiza o ícone
    const iconElement = document.getElementById('entity-icon');
    if (iconElement) {
        iconElement.setAttribute('data-lucide', state.entityIcon);
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    }
}

/**
 * Configura os filtros baseados no esquema da entidade
 */
function setupFilters() {
    if (!state.schema || !state.schema.attributes || state.schema.attributes.length === 0) {
        return;
    }
    
    // Mostra o container de filtros
    document.getElementById('filters-container').classList.remove('hidden');
    
    // Preenche o select de campos para filtro
    const filterFieldSelect = document.getElementById('filter-field');
    filterFieldSelect.innerHTML = '<option value="">Selecione um campo</option>';
    
    state.schema.attributes.forEach(attr => {
        if (attr.type !== 'file' && attr.type !== 'sub-entity') {
            const option = document.createElement('option');
            option.value = attr.label;
            option.textContent = attr.label;
            filterFieldSelect.appendChild(option);
        }
    });
    
    // Preenche o select de campos para o Kanban
    const kanbanFieldSelect = document.getElementById('kanban-field');
    kanbanFieldSelect.innerHTML = '<option value="">Selecione um campo</option>';
    
    state.schema.attributes.forEach(attr => {
        if (attr.type === 'select') {
            const option = document.createElement('option');
            option.value = attr.label;
            option.textContent = attr.label;
            kanbanFieldSelect.appendChild(option);
        }
    });
}

/**
 * Carrega os dados da entidade do Firebase
 */
async function loadEntityData() {
    try {
        const dataRef = ref(db, `data/${state.moduleId}/${state.entityId}`);
        
        // Usar onValue para manter os dados atualizados em tempo real
        onValue(dataRef, (snapshot) => {
            state.entityData = [];
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                for (const id in data) {
                    state.entityData.push({
                        id,
                        ...data[id]
                    });
                }
            }
            
            // Atualiza a visualização atual com os novos dados
            updateActiveView();
        });
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showError('Erro ao carregar dados', error.message);
    }
}

/**
 * Atualiza a visualização ativa com base no estado atual
 */
function updateActiveView() {
    // Atualiza a aparência das abas
    document.querySelectorAll('.view-tab').forEach(tab => {
        if (tab.dataset.view === state.currentView) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Esconde todos os painéis de visualização
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // Mostra o painel atual
    const currentPanel = document.getElementById(`${state.currentView}-view`);
    if (currentPanel) {
        currentPanel.classList.remove('hidden');
    }
    
    // Renderiza a visualização atual
    switch (state.currentView) {
        case 'table':
            renderTableView();
            break;
        case 'form':
            renderFormView();
            break;
        case 'kanban':
            renderKanbanBoard();
            break;
        case 'gallery':
            renderGalleryView();
            break;
    }
}

/**
 * Renderiza a visualização em tabela
 */
function renderTableView() {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    
    // Se não houver esquema ou atributos, mostra mensagem de erro
    if (!state.schema || !state.schema.attributes || state.schema.attributes.length === 0) {
        tableHeader.innerHTML = `<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Erro</th>`;
        tableBody.innerHTML = `
            <tr>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                    Esta entidade não possui campos configurados.
                </td>
            </tr>
        `;
        return;
    }
    
    // Filtra os atributos para exibir na tabela (exclui arquivos e sub-entidades)
    const displayAttributes = state.schema.attributes.filter(attr => 
        attr.type !== 'file' && attr.type !== 'sub-entity'
    );
    
    // Se não houver dados para exibir, mostra mensagem
    if (state.entityData.length === 0) {
        // Renderiza o cabeçalho
        let headerHtml = '<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>';
        displayAttributes.forEach(attr => {
            headerHtml += `<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">${attr.label}</th>`;
        });
        headerHtml += '<th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>';
        tableHeader.innerHTML = headerHtml;
        
        // Mostra mensagem de "nenhum dado"
        tableBody.innerHTML = `
            <tr>
                <td colspan="${displayAttributes.length + 2}" class="px-4 py-8 text-center text-slate-500">
                    <div class="flex flex-col items-center">
                        <div class="bg-slate-100 p-3 rounded-full mb-3">
                            <i data-lucide="database" class="h-6 w-6 text-slate-400"></i>
                        </div>
                        <p class="text-slate-600 mb-4">Nenhum dado encontrado</p>
                        <button id="add-first-record-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2">
                            <i data-lucide="plus" class="h-4 w-4"></i>
                            <span>Adicionar Primeiro Registro</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        // Adiciona event listener para o botão
        setTimeout(() => {
            const addFirstButton = document.getElementById('add-first-record-btn');
            if (addFirstButton) {
                addFirstButton.addEventListener('click', () => {
                    openRecordModal();
                });
            }
            
            if (typeof lucide !== 'undefined' && lucide) {
                lucide.createIcons();
            }
        }, 0);
        
        return;
    }
    
    // Filtra os dados se houver um filtro ativo
    let filteredData = [...state.entityData];
    if (state.filterField && state.filterValue) {
        filteredData = applyFilterToData(filteredData);
    }
    
    // Renderiza o cabeçalho
    let headerHtml = '<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>';
    displayAttributes.forEach(attr => {
        headerHtml += `<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">${attr.label}</th>`;
    });
    headerHtml += '<th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>';
    tableHeader.innerHTML = headerHtml;
    
    // Renderiza o corpo da tabela
    let bodyHtml = '';
    
    if (filteredData.length === 0) {
        bodyHtml = `
            <tr>
                <td colspan="${displayAttributes.length + 2}" class="px-4 py-8 text-center text-slate-500">
                    <div class="flex flex-col items-center">
                        <div class="bg-slate-100 p-3 rounded-full mb-3">
                            <i data-lucide="filter-x" class="h-6 w-6 text-slate-400"></i>
                        </div>
                        <p class="text-slate-600 mb-2">Nenhum resultado encontrado para o filtro aplicado</p>
                        <button id="clear-filter-btn-inline" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm flex items-center gap-1">
                            <i data-lucide="x" class="h-3.5 w-3.5"></i>
                            <span>Limpar Filtro</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    } else {
        filteredData.forEach(record => {
            bodyHtml += `<tr class="hover:bg-slate-50 transition-colors">`;
            
            // ID da linha
            bodyHtml += `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded">${record.id.slice(0, 8)}...</span>
                </td>
            `;
            
            // Campos do registro
            displayAttributes.forEach(attr => {
                let value = record[attr.label];
                
                // Formatação do valor de acordo com o tipo
                if (value === undefined || value === null) {
                    value = '-';
                } else if (attr.type === 'checkbox') {
                    value = value ? 
                        '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sim</span>' : 
                        '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Não</span>';
                } else if (attr.type === 'date') {
                    try {
                        const date = new Date(value);
                        value = date.toLocaleDateString();
                    } catch (e) {
                        // Mantém o valor original se não for possível converter
                    }
                } else if (typeof value === 'string' && value.length > 50) {
                    value = value.slice(0, 50) + '...';
                }
                
                bodyHtml += `<td class="px-4 py-3 whitespace-nowrap text-sm text-slate-700">${value}</td>`;
            });
            
            // Ações
            bodyHtml += `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <button class="view-record-btn px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors mr-1" data-record-id="${record.id}">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button class="edit-record-btn px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors" data-record-id="${record.id}">
                        <i data-lucide="pencil" class="h-4 w-4"></i>
                    </button>
                </td>
            `;
            
            bodyHtml += '</tr>';
        });
    }
    
    tableBody.innerHTML = bodyHtml;
    
    // Adiciona event listeners para os botões de ação
    setTimeout(() => {
        // Botão de limpar filtro inline
        const clearFilterBtnInline = document.getElementById('clear-filter-btn-inline');
        if (clearFilterBtnInline) {
            clearFilterBtnInline.addEventListener('click', clearFilter);
        }
        
        // Botões de visualizar registro
        document.querySelectorAll('.view-record-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const recordId = btn.dataset.recordId;
                openRecordModal(recordId, false); // Modo visualização
            });
        });
        
        // Botões de editar registro
        document.querySelectorAll('.edit-record-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const recordId = btn.dataset.recordId;
                openRecordModal(recordId, true); // Modo edição
            });
        });
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    }, 0);
}

/**
 * Renderiza a visualização em formulário
 */
function renderFormView() {
    const form = document.getElementById('dynamic-form');
    
    // Se não houver esquema ou atributos, mostra mensagem de erro
    if (!state.schema || !state.schema.attributes || state.schema.attributes.length === 0) {
        form.innerHTML = `
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-5 text-center">
                <div class="bg-amber-100 p-3 rounded-full inline-flex items-center justify-center text-amber-600 mb-3">
                    <i data-lucide="alert-triangle" class="h-6 w-6"></i>
                </div>
                <h3 class="text-lg font-semibold text-amber-800 mb-1">Formulário vazio</h3>
                <p class="text-amber-700">Esta entidade ainda não tem campos configurados. Volte ao construtor para adicionar campos.</p>
            </div>
        `;
        
        document.getElementById('save-data-btn').disabled = true;
        document.getElementById('save-data-btn').classList.add('opacity-50', 'cursor-not-allowed');
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        return;
    }
    
    // Constrói o HTML do formulário
    const formPromises = state.schema.attributes.map(attr => createFieldHtml(attr));
    Promise.all(formPromises).then(fieldHtmls => {
        form.innerHTML = fieldHtmls.join('');
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    });
}

/**
 * Renderiza a visualização em Kanban
 */
function renderKanbanBoard() {
    const kanbanBoard = document.getElementById('kanban-board');
    
    // Se não houver campo selecionado para o Kanban, mostra mensagem
    if (!state.kanbanField) {
        kanbanBoard.innerHTML = `
            <div class="flex items-center justify-center w-full text-slate-500">
                <div class="text-center p-8">
                    <div class="bg-slate-100 p-3 rounded-full inline-flex mb-3">
                        <i data-lucide="layout-kanban" class="h-6 w-6 text-slate-400"></i>
                    </div>
                    <p>Selecione um campo para visualizar o quadro Kanban</p>
                </div>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        return;
    }
    
    // Encontra o campo selecionado no esquema
    const kanbanFieldSchema = state.schema.attributes.find(attr => attr.label === state.kanbanField);
    
    // Se o campo não for encontrado ou não for do tipo select, mostra erro
    if (!kanbanFieldSchema || kanbanFieldSchema.type !== 'select') {
        kanbanBoard.innerHTML = `
            <div class="flex items-center justify-center w-full text-slate-500">
                <div class="text-center p-8">
                    <div class="bg-red-100 p-3 rounded-full inline-flex mb-3">
                        <i data-lucide="alert-triangle" class="h-6 w-6 text-red-500"></i>
                    </div>
                    <p class="text-red-500">O campo selecionado não é válido para o Kanban</p>
                </div>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        return;
    }
    
    // Obtém as opções do campo select
    const options = kanbanFieldSchema.options || [];
    
    // Se não houver opções, mostra erro
    if (options.length === 0) {
        kanbanBoard.innerHTML = `
            <div class="flex items-center justify-center w-full text-slate-500">
                <div class="text-center p-8">
                    <div class="bg-amber-100 p-3 rounded-full inline-flex mb-3">
                        <i data-lucide="alert-circle" class="h-6 w-6 text-amber-500"></i>
                    </div>
                    <p>O campo selecionado não possui opções definidas</p>
                </div>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        return;
    }
    
    // Filtra os dados se houver um filtro ativo
    let filteredData = [...state.entityData];
    if (state.filterField && state.filterValue) {
        filteredData = applyFilterToData(filteredData);
    }
    
    // Agrupa os registros por opção
    const groupedData = {};
    options.forEach(option => {
        groupedData[option] = [];
    });
    
    // Adiciona uma coluna para valores não categorizados
    groupedData['Sem valor'] = [];
    
    // Distribui os registros nos grupos
    filteredData.forEach(record => {
        const value = record[state.kanbanField];
        if (value && groupedData[value]) {
            groupedData[value].push(record);
        } else {
            groupedData['Sem valor'].push(record);
        }
    });
    
    // Constrói o HTML do quadro Kanban
    let html = '';
    
    for (const option in groupedData) {
        const records = groupedData[option];
        
        html += `
            <div class="kanban-column" data-option="${option}">
                <div class="kanban-column-header flex justify-between items-center">
                    <div class="font-medium text-slate-700">${option}</div>
                    <div class="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">${records.length}</div>
                </div>
                <div class="kanban-items" id="kanban-${option.replace(/\s+/g, '-').toLowerCase()}">
        `;
        
        if (records.length === 0) {
            html += `
                <div class="p-4 text-center text-sm text-slate-500">
                    Nenhum item
                </div>
            `;
        } else {
            records.forEach(record => {
                html += `
                    <div class="kanban-item" data-record-id="${record.id}">
                        <div class="font-medium text-slate-700 mb-1">${getRecordTitle(record)}</div>
                        <div class="text-xs text-slate-500">${getRecordSubtitle(record)}</div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    kanbanBoard.innerHTML = html;
    
    // Configura o Sortable.js para cada coluna
    options.concat(['Sem valor']).forEach(option => {
        const columnId = `kanban-${option.replace(/\s+/g, '-').toLowerCase()}`;
        const column = document.getElementById(columnId);
        
        if (column) {
            new Sortable(column, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function(evt) {
                    const recordId = evt.item.dataset.recordId;
                    const newOption = evt.to.closest('.kanban-column').dataset.option;
                    
                    // Atualiza o valor no Firebase
                    updateRecordField(recordId, state.kanbanField, newOption);
                }
            });
            
            // Adiciona event listeners para os itens do Kanban
            column.querySelectorAll('.kanban-item').forEach(item => {
                item.addEventListener('click', () => {
                    const recordId = item.dataset.recordId;
                    openRecordModal(recordId, false); // Modo visualização
                });
            });
        }
    });
    
    if (typeof lucide !== 'undefined' && lucide) {
        lucide.createIcons();
    }
}

/**
 * Renderiza a visualização em galeria
 */
function renderGalleryView() {
    const galleryGrid = document.getElementById('gallery-grid');
    
    // Se não houver dados para exibir, mostra mensagem
    if (state.entityData.length === 0) {
        galleryGrid.innerHTML = `
            <div class="col-span-full py-8 text-center text-slate-500">
                <div class="flex flex-col items-center">
                    <div class="bg-slate-100 p-3 rounded-full mb-3">
                        <i data-lucide="database" class="h-6 w-6 text-slate-400"></i>
                    </div>
                    <p class="text-slate-600 mb-4">Nenhum dado encontrado</p>
                    <button id="add-first-record-gallery" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2">
                        <i data-lucide="plus" class="h-4 w-4"></i>
                        <span>Adicionar Primeiro Registro</span>
                    </button>
                </div>
            </div>
        `;
        
        // Adiciona event listener para o botão
        setTimeout(() => {
            const addFirstButton = document.getElementById('add-first-record-gallery');
            if (addFirstButton) {
                addFirstButton.addEventListener('click', () => {
                    openRecordModal();
                });
            }
            
            if (typeof lucide !== 'undefined' && lucide) {
                lucide.createIcons();
            }
        }, 0);
        
        return;
    }
    
    // Filtra os dados se houver um filtro ativo
    let filteredData = [...state.entityData];
    if (state.filterField && state.filterValue) {
        filteredData = applyFilterToData(filteredData);
    }
    
    // Se não houver dados filtrados, mostra mensagem
    if (filteredData.length === 0) {
        galleryGrid.innerHTML = `
            <div class="col-span-full py-8 text-center text-slate-500">
                <div class="flex flex-col items-center">
                    <div class="bg-slate-100 p-3 rounded-full mb-3">
                        <i data-lucide="filter-x" class="h-6 w-6 text-slate-400"></i>
                    </div>
                    <p class="text-slate-600 mb-2">Nenhum resultado encontrado para o filtro aplicado</p>
                    <button id="clear-filter-btn-gallery" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm flex items-center gap-1">
                        <i data-lucide="x" class="h-3.5 w-3.5"></i>
                        <span>Limpar Filtro</span>
                    </button>
                </div>
            </div>
        `;
        
        // Adiciona event listener para o botão
        setTimeout(() => {
            const clearFilterBtn = document.getElementById('clear-filter-btn-gallery');
            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', clearFilter);
            }
            
            if (typeof lucide !== 'undefined' && lucide) {
                lucide.createIcons();
            }
        }, 0);
        
        return;
    }
    
    // Constrói o HTML da galeria
    let html = '';
    
    filteredData.forEach(record => {
        html += `
            <div class="gallery-item" data-record-id="${record.id}">
                <div class="gallery-item-header">
                    <div class="font-medium text-slate-800">${getRecordTitle(record)}</div>
                    <div class="text-xs text-slate-500 mt-1">${getRecordSubtitle(record)}</div>
                </div>
                <div class="gallery-item-body">
                    ${getGalleryItemContent(record)}
                </div>
                <div class="gallery-item-footer flex justify-end gap-2">
                    <button class="view-record-btn-gallery px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors text-xs" data-record-id="${record.id}">
                        <i data-lucide="eye" class="h-3.5 w-3.5"></i>
                    </button>
                    <button class="edit-record-btn-gallery px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors text-xs" data-record-id="${record.id}">
                        <i data-lucide="pencil" class="h-3.5 w-3.5"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    galleryGrid.innerHTML = html;
    
    // Adiciona event listeners para os botões de ação
    setTimeout(() => {
        // Botões de visualizar registro
        document.querySelectorAll('.view-record-btn-gallery').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = btn.dataset.recordId;
                openRecordModal(recordId, false); // Modo visualização
            });
        });
        
        // Botões de editar registro
        document.querySelectorAll('.edit-record-btn-gallery').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = btn.dataset.recordId;
                openRecordModal(recordId, true); // Modo edição
            });
        });
        
        // Clicar no item da galeria também abre a visualização
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const recordId = item.dataset.recordId;
                openRecordModal(recordId, false); // Modo visualização
            });
        });
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    }, 0);
}

/**
 * Cria o HTML para um campo do formulário
 * @param {Object} attr - Atributo do esquema
 * @returns {Promise<string>} - HTML do campo
 */
async function createFieldHtml(attr) {
    const requiredLabel = attr.required ? '<span class="text-red-500 ml-1">*</span>' : '';
    const baseInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200";
    
    let field = `<div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">`;
    
    if (attr.type === 'checkbox') {
        field += `
            <div class="flex items-center">
                <input id="${attr.id}" name="${attr.label}" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                <label for="${attr.id}" class="ml-2 block text-sm font-medium text-slate-700">${attr.label} ${requiredLabel}</label>
            </div>
        `;
    } else {
        field += `<label for="${attr.id}" class="block text-sm font-medium text-slate-700 mb-1 flex items-center">
            <i data-lucide="${getIconForFieldType(attr.type)}" class="h-4 w-4 text-indigo-500 mr-1.5"></i>
            ${attr.label} ${requiredLabel}
        </label>`;

        switch(attr.type) {
            case 'relationship':
                field += `<select id="${attr.id}" name="${attr.id}" class="${baseInputClasses}" ${attr.required ? 'required' : ''}>`;
                field += `<option value="">Selecione uma opção...</option>`;
                
                // Procura os dados da entidade relacionada em todos os módulos
                try {
                    const dataRef = ref(db, 'data');
                    const dataSnapshot = await get(dataRef);
                    if(dataSnapshot.exists()) {
                        const allData = dataSnapshot.val();
                        let optionsHtml = '';
                        let hasOptions = false;
                        
                        for (const moduleId in allData) {
                            if (allData[moduleId][attr.targetEntityId]) {
                                const records = allData[moduleId][attr.targetEntityId];
                                for(const recordId in records) {
                                    // Tenta encontrar um campo de nome óbvio para exibir na dropdown
                                    const recordData = records[recordId];
                                    const displayName = recordData.Nome || recordData.name || recordData.Título || recordData.titulo || recordData.Label || recordData.label || recordId;
                                    optionsHtml += `<option value="${recordId}">${displayName}</option>`;
                                    hasOptions = true;
                                }
                            }
                        }
                        
                        if (!hasOptions) {
                            optionsHtml = `<option value="" disabled>Nenhum registro encontrado</option>`;
                        }
                        
                        field += optionsHtml;
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados relacionados:", error);
                    field += `<option value="" disabled>Erro ao carregar opções</option>`;
                }

                field += `</select>`;
                break;
                
            case 'textarea':
                field += `<textarea id="${attr.id}" name="${attr.label}" rows="4" class="${baseInputClasses}" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}></textarea>`;
                break;
                
            case 'select':
                field += `<select id="${attr.id}" name="${attr.label}" class="${baseInputClasses}" ${attr.required ? 'required' : ''}>`;
                field += `<option value="">${attr.placeholder || 'Selecione...'}</option>`;
                (attr.options || []).forEach(opt => {
                    field += `<option value="${opt}">${opt}</option>`;
                });
                field += `</select>`;
                break;
                
            case 'file':
                field += `
                    <div class="mt-1 flex items-center">
                        <label for="${attr.id}" class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                            <i data-lucide="upload-cloud" class="h-5 w-5"></i>
                            <span>Escolher Arquivo</span>
                        </label>
                        <span id="${attr.id}-filename" class="ml-3 text-sm text-slate-500">Nenhum arquivo selecionado</span>
                        <input type="file" id="${attr.id}" name="${attr.label}" class="hidden" ${attr.required ? 'required' : ''} onchange="document.getElementById('${attr.id}-filename').textContent = this.files[0]?.name || 'Nenhum arquivo selecionado'">
                    </div>
                `;
                break;
                
            case 'date':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="calendar" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}>
                    </div>
                `;
                break;
                
            case 'email':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="at-sign" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}>
                    </div>
                `;
                break;
                
            case 'number':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="hash" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}>
                    </div>
                `;
                break;
                
            default:
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="${getIconForFieldType(attr.type)}" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}>
                    </div>
                `;
                break;
        }
    }
    
    field += `</div>`;
    return field;
}

/**
 * Salva os dados do formulário no Firebase
 */
function saveFormData() {
    const form = document.getElementById('dynamic-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Mostra loading durante o salvamento
    Swal.fire({
        title: 'Guardando dados...',
        text: 'Por favor, aguarde...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const formData = new FormData(form);
    const dataToSave = {};
    
    for (let [key, value] of formData.entries()) {
        const inputElement = form.querySelector(`[name="${key}"]`);
        if(inputElement.type === 'checkbox'){
            dataToSave[key] = inputElement.checked;
        } else if (inputElement.type === 'file') {
            // Para arquivos, armazenamos apenas o nome para esta demo
            // Em uma implementação real, você usaria Firebase Storage
            dataToSave[key] = inputElement.files.length > 0 ? inputElement.files[0].name : '';
        } else {
            dataToSave[key] = value;
        }
    }
    
    // Adiciona timestamp
    dataToSave['created_at'] = new Date().toISOString();
    
    const dataRef = ref(db, `data/${state.moduleId}/${state.entityId}`);
    push(dataRef, dataToSave)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Dados Guardados!',
                text: 'O seu registo foi guardado com sucesso na base de dados.',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
            form.reset();
            
            // Resetar nomes de arquivos
            document.querySelectorAll('[id$="-filename"]').forEach(el => {
                el.textContent = 'Nenhum arquivo selecionado';
            });
        })
        .catch(error => {
            console.error("Erro ao guardar dados: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao Guardar',
                text: 'Ocorreu um problema ao tentar guardar os dados: ' + error.message,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        });
}

/**
 * Abre o modal para visualizar ou editar um registro
 * @param {string} recordId - ID do registro a ser visualizado/editado (se nulo, cria um novo)
 * @param {boolean} isEdit - Indica se o modal deve ser aberto em modo de edição
 */
function openRecordModal(recordId = null, isEdit = true) {
    const modal = document.getElementById('record-modal');
    const modalTitle = document.getElementById('record-modal-title');
    const recordForm = document.getElementById('record-form');
    const saveBtn = document.getElementById('save-record-btn');
    const deleteBtn = document.getElementById('delete-record-btn');
    
    // Configura o estado do modal
    state.currentRecord = recordId;
    state.isEditMode = isEdit;
    
    // Atualiza o título do modal
    if (recordId) {
        modalTitle.textContent = isEdit ? 'Editar Registro' : 'Visualizar Registro';
        deleteBtn.classList.remove('hidden');
    } else {
        modalTitle.textContent = 'Novo Registro';
        deleteBtn.classList.add('hidden');
    }
    
    // Carrega o formulário no modal
    recordForm.innerHTML = `
        <div id="record-form-loading" class="py-6 sm:py-10 flex flex-col items-center justify-center text-center">
            <div class="spinner mb-4"></div>
            <p class="text-slate-600">Carregando dados...</p>
        </div>
    `;
    
    // Configura os botões do modal
    saveBtn.disabled = !isEdit;
    saveBtn.classList.toggle('opacity-50', !isEdit);
    saveBtn.classList.toggle('cursor-not-allowed', !isEdit);
    
    // Mostra o modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.bg-white').classList.remove('scale-95', 'opacity-0');
    }, 10);
    
    // Carrega o formulário para o registro
    loadRecordForm(recordId, isEdit);
}

/**
 * Carrega o formulário para visualizar/editar um registro
 * @param {string} recordId - ID do registro a ser carregado (se nulo, cria um novo)
 * @param {boolean} isEditable - Indica se os campos devem ser editáveis
 */
async function loadRecordForm(recordId, isEditable) {
    const recordForm = document.getElementById('record-form');
    
    // Se não houver esquema ou atributos, mostra mensagem de erro
    if (!state.schema || !state.schema.attributes || state.schema.attributes.length === 0) {
        recordForm.innerHTML = `
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-5 text-center">
                <div class="bg-amber-100 p-3 rounded-full inline-flex items-center justify-center text-amber-600 mb-3">
                    <i data-lucide="alert-triangle" class="h-6 w-6"></i>
                </div>
                <h3 class="text-lg font-semibold text-amber-800 mb-1">Formulário vazio</h3>
                <p class="text-amber-700">Esta entidade ainda não tem campos configurados. Volte ao construtor para adicionar campos.</p>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        return;
    }
    
    try {
        // Constrói o HTML do formulário
        let record = null;
        
        // Se for um registro existente, carrega os dados
        if (recordId) {
            record = state.entityData.find(r => r.id === recordId);
            if (!record) {
                throw new Error('Registro não encontrado');
            }
        }
        
        // Gera os campos do formulário
        const formPromises = state.schema.attributes.map(attr => 
            createModalFieldHtml(attr, record, isEditable)
        );
        
        const fieldHtmls = await Promise.all(formPromises);
        recordForm.innerHTML = fieldHtmls.join('');
        
        // Preenche os valores dos campos se for um registro existente
        if (record) {
            fillFormWithRecord(record);
        }
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    } catch (error) {
        console.error("Erro ao carregar formulário:", error);
        recordForm.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                <div class="bg-red-100 p-3 rounded-full inline-flex items-center justify-center text-red-600 mb-3">
                    <i data-lucide="alert-circle" class="h-6 w-6"></i>
                </div>
                <h3 class="text-lg font-semibold text-red-800 mb-1">Erro ao carregar registro</h3>
                <p class="text-red-700">${error.message || 'Ocorreu um erro inesperado. Tente novamente mais tarde.'}</p>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    }
}

/**
 * Cria o HTML de um campo para o modal de registro
 * @param {Object} attr - Atributo do esquema
 * @param {Object} record - Dados do registro (pode ser nulo)
 * @param {boolean} isEditable - Indica se o campo deve ser editável
 * @returns {Promise<string>} - HTML do campo
 */
async function createModalFieldHtml(attr, record, isEditable) {
    // Similar ao createFieldHtml, mas com suporte para preenchimento de valores e desabilitar campos
    const requiredLabel = attr.required ? '<span class="text-red-500 ml-1">*</span>' : '';
    const baseInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200";
    const disabledAttr = isEditable ? '' : 'disabled';
    
    let field = `<div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">`;
    
    if (attr.type === 'checkbox') {
        const checked = record && record[attr.label] ? 'checked' : '';
        field += `
            <div class="flex items-center">
                <input id="modal-${attr.id}" name="${attr.label}" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${checked} ${disabledAttr}>
                <label for="modal-${attr.id}" class="ml-2 block text-sm font-medium text-slate-700">${attr.label} ${requiredLabel}</label>
            </div>
        `;
    } else {
        field += `<label for="modal-${attr.id}" class="block text-sm font-medium text-slate-700 mb-1 flex items-center">
            <i data-lucide="${getIconForFieldType(attr.type)}" class="h-4 w-4 text-indigo-500 mr-1.5"></i>
            ${attr.label} ${requiredLabel}
        </label>`;

        const value = record ? record[attr.label] || '' : '';

        switch(attr.type) {
            case 'relationship':
                field += `<select id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses}" ${attr.required ? 'required' : ''} ${disabledAttr}>`;
                field += `<option value="">Selecione uma opção...</option>`;
                
                // Procura os dados da entidade relacionada em todos os módulos
                try {
                    const dataRef = ref(db, 'data');
                    const dataSnapshot = await get(dataRef);
                    if(dataSnapshot.exists()) {
                        const allData = dataSnapshot.val();
                        let optionsHtml = '';
                        let hasOptions = false;
                        
                        for (const moduleId in allData) {
                            if (allData[moduleId][attr.targetEntityId]) {
                                const records = allData[moduleId][attr.targetEntityId];
                                for(const recordId in records) {
                                    // Tenta encontrar um campo de nome óbvio para exibir na dropdown
                                    const recordData = records[recordId];
                                    const displayName = recordData.Nome || recordData.name || recordData.Título || recordData.titulo || recordData.Label || recordData.label || recordId;
                                    const selected = value === recordId ? 'selected' : '';
                                    optionsHtml += `<option value="${recordId}" ${selected}>${displayName}</option>`;
                                    hasOptions = true;
                                }
                            }
                        }
                        
                        if (!hasOptions) {
                            optionsHtml = `<option value="" disabled>Nenhum registro encontrado</option>`;
                        }
                        
                        field += optionsHtml;
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados relacionados:", error);
                    field += `<option value="" disabled>Erro ao carregar opções</option>`;
                }

                field += `</select>`;
                break;
                
            case 'textarea':
                field += `<textarea id="modal-${attr.id}" name="${attr.label}" rows="4" class="${baseInputClasses}" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''} ${disabledAttr}>${value}</textarea>`;
                break;
                
            case 'select':
                field += `<select id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses}" ${attr.required ? 'required' : ''} ${disabledAttr}>`;
                field += `<option value="">${attr.placeholder || 'Selecione...'}</option>`;
                (attr.options || []).forEach(opt => {
                    const selected = value === opt ? 'selected' : '';
                    field += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                field += `</select>`;
                break;
                
            case 'file':
                field += `
                    <div class="mt-1 flex items-center">
                        <label for="modal-${attr.id}" class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}">
                            <i data-lucide="upload-cloud" class="h-5 w-5"></i>
                            <span>Escolher Arquivo</span>
                        </label>
                        <span id="modal-${attr.id}-filename" class="ml-3 text-sm text-slate-500">${value || 'Nenhum arquivo selecionado'}</span>
                        <input type="file" id="modal-${attr.id}" name="${attr.label}" class="hidden" ${attr.required ? 'required' : ''} ${disabledAttr} onchange="document.getElementById('modal-${attr.id}-filename').textContent = this.files[0]?.name || 'Nenhum arquivo selecionado'">
                    </div>
                `;
                break;
                
            case 'date':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="calendar" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" value="${value}" ${attr.required ? 'required' : ''} ${disabledAttr}>
                    </div>
                `;
                break;
                
            case 'email':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="at-sign" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" value="${value}" ${attr.required ? 'required' : ''} ${disabledAttr}>
                    </div>
                `;
                break;
                
            case 'number':
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="hash" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" value="${value}" ${attr.required ? 'required' : ''} ${disabledAttr}>
                    </div>
                `;
                break;
                
            default:
                field += `
                    <div class="relative mt-1">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <i data-lucide="${getIconForFieldType(attr.type)}" class="h-5 w-5"></i>
                        </div>
                        <input type="${attr.type}" id="modal-${attr.id}" name="${attr.label}" class="${baseInputClasses} pl-10" placeholder="${attr.placeholder || ''}" value="${value}" ${attr.required ? 'required' : ''} ${disabledAttr}>
                    </div>
                `;
                break;
        }
    }
    
    field += `</div>`;
    return field;
}

/**
 * Preenche o formulário com os dados de um registro
 * @param {Object} record - Dados do registro
 */
function fillFormWithRecord(record) {
    state.schema.attributes.forEach(attr => {
        const value = record[attr.label];
        if (value !== undefined && value !== null) {
            const inputElement = document.getElementById(`modal-${attr.id}`);
            if (inputElement) {
                if (attr.type === 'checkbox') {
                    inputElement.checked = value;
                } else if (attr.type === 'file') {
                    // Para arquivos, atualizamos apenas o texto do nome do arquivo
                    const filenameElement = document.getElementById(`modal-${attr.id}-filename`);
                    if (filenameElement && value) {
                        filenameElement.textContent = value;
                    }
                } else {
                    inputElement.value = value;
                }
            }
        }
    });
}

/**
 * Fecha o modal de registro
 */
function closeRecordModal() {
    const modal = document.getElementById('record-modal');
    modal.querySelector('.bg-white').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        state.currentRecord = null;
        state.isEditMode = false;
    }, 300);
}

/**
 * Salva o registro do modal
 */
function saveRecord() {
    const form = document.getElementById('record-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Mostra loading durante o salvamento
    Swal.fire({
        title: 'Guardando dados...',
        text: 'Por favor, aguarde...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const formData = new FormData(form);
    const dataToSave = {};
    
    for (let [key, value] of formData.entries()) {
        const inputElement = form.querySelector(`[name="${key}"]`);
        if(inputElement.type === 'checkbox'){
            dataToSave[key] = inputElement.checked;
        } else if (inputElement.type === 'file') {
            // Para arquivos, se houver um arquivo selecionado, use o nome dele
            // Caso contrário, mantenha o valor anterior (para não perder referências a arquivos)
            if (inputElement.files.length > 0) {
                dataToSave[key] = inputElement.files[0].name;
            } else {
                const filenameElement = document.getElementById(`modal-${inputElement.id.replace('modal-', '')}-filename`);
                const currentValue = filenameElement?.textContent;
                if (currentValue && currentValue !== 'Nenhum arquivo selecionado') {
                    dataToSave[key] = currentValue;
                } else {
                    dataToSave[key] = '';
                }
            }
        } else {
            dataToSave[key] = value;
        }
    }
    
    // Se for um novo registro, adiciona o timestamp
    if (!state.currentRecord) {
        dataToSave['created_at'] = new Date().toISOString();
    } else {
        // Se for edição, preserva o timestamp original
        const originalRecord = state.entityData.find(r => r.id === state.currentRecord);
        if (originalRecord && originalRecord.created_at) {
            dataToSave['created_at'] = originalRecord.created_at;
        } else {
            dataToSave['created_at'] = new Date().toISOString();
        }
        
        // Adiciona timestamp de atualização
        dataToSave['updated_at'] = new Date().toISOString();
    }
    
    try {
        // Determina a referência para salvar os dados
        let dataRef;
        if (state.currentRecord) {
            // Atualiza registro existente
            dataRef = ref(db, `data/${state.moduleId}/${state.entityId}/${state.currentRecord}`);
            set(dataRef, dataToSave).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Registro atualizado!',
                    text: 'O registro foi atualizado com sucesso.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
                closeRecordModal();
            }).catch(error => {
                console.error("Erro ao atualizar registro:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao atualizar',
                    text: 'Ocorreu um erro ao atualizar o registro: ' + error.message,
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            });
        } else {
            // Cria novo registro
            dataRef = ref(db, `data/${state.moduleId}/${state.entityId}`);
            push(dataRef, dataToSave).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Registro criado!',
                    text: 'O novo registro foi criado com sucesso.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
                closeRecordModal();
            }).catch(error => {
                console.error("Erro ao criar registro:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao criar',
                    text: 'Ocorreu um erro ao criar o registro: ' + error.message,
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            });
        }
    } catch (error) {
        console.error("Erro ao salvar registro:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            text: 'Ocorreu um erro ao salvar o registro: ' + error.message,
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
    }
}

/**
 * Confirma e exclui o registro atual
 */
function confirmDeleteRecord() {
    if (!state.currentRecord) return;
    
    Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não pode ser revertida!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6366f1',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            deleteRecord();
        }
    });
}

/**
 * Exclui o registro atual
 */
function deleteRecord() {
    if (!state.currentRecord) return;
    
    // Mostra loading durante a exclusão
    Swal.fire({
        title: 'Excluindo registro...',
        text: 'Por favor, aguarde...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    const recordRef = ref(db, `data/${state.moduleId}/${state.entityId}/${state.currentRecord}`);
    remove(recordRef).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Excluído!',
            text: 'O registro foi excluído com sucesso.',
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
        closeRecordModal();
    }).catch(error => {
        console.error("Erro ao excluir registro:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao excluir',
            text: 'Ocorreu um erro ao excluir o registro: ' + error.message,
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
    });
}

/**
 * Atualiza um campo específico de um registro
 * @param {string} recordId - ID do registro a ser atualizado
 * @param {string} field - Nome do campo a ser atualizado
 * @param {*} value - Novo valor para o campo
 */
function updateRecordField(recordId, field, value) {
    if (!recordId || !field) return;
    
    const record = state.entityData.find(r => r.id === recordId);
    if (!record) return;
    
    // Cria uma cópia do registro com o campo atualizado
    const updatedRecord = { ...record };
    updatedRecord[field] = value;
    updatedRecord['updated_at'] = new Date().toISOString();
    
    // Remove o id da cópia (não é parte dos dados no Firebase)
    delete updatedRecord.id;
    
    // Atualiza o registro no Firebase
    const recordRef = ref(db, `data/${state.moduleId}/${state.entityId}/${recordId}`);
    set(recordRef, updatedRecord).then(() => {
        // Feedback sutil para não interromper o fluxo
        const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
        
        Toast.fire({
            icon: 'success',
            title: 'Registro atualizado!'
        });
    }).catch(error => {
        console.error("Erro ao atualizar campo:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar',
            text: 'Ocorreu um erro ao atualizar o campo: ' + error.message,
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
    });
}

/**
 * Aplica filtro aos dados
 */
function applyFilter() {
    state.filterField = document.getElementById('filter-field').value;
    state.filterOperator = document.getElementById('filter-operator').value;
    state.filterValue = document.getElementById('filter-value').value;
    
    // Se não houver campo ou valor, limpa o filtro
    if (!state.filterField || state.filterValue === '') {
        clearFilter();
        return;
    }
    
    // Atualiza a visualização atual
    updateActiveView();
    
    // Feedback sutil para não interromper o fluxo
    const Toast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    });
    
    Toast.fire({
        icon: 'success',
        title: 'Filtro aplicado!'
    });
}

/**
 * Limpa o filtro aplicado
 */
function clearFilter() {
    state.filterField = '';
    state.filterOperator = 'eq';
    state.filterValue = '';
    
    // Limpa os campos de filtro na interface
    document.getElementById('filter-field').value = '';
    document.getElementById('filter-operator').value = 'eq';
    document.getElementById('filter-value').value = '';
    
    // Atualiza a visualização atual
    updateActiveView();
}

/**
 * Aplica o filtro atual aos dados
 * @param {Array} data - Dados a serem filtrados
 * @returns {Array} - Dados filtrados
 */
function applyFilterToData(data) {
    if (!state.filterField || state.filterValue === '') {
        return data;
    }
    
    return data.filter(record => {
        const recordValue = record[state.filterField];
        
        // Se o valor do registro for null/undefined, só retorna true se o filtro for "não é igual"
        if (recordValue === undefined || recordValue === null) {
            return state.filterOperator === 'neq';
        }
        
        // Converte para string para comparações
        const recordStr = String(recordValue).toLowerCase();
        const filterStr = state.filterValue.toLowerCase();
        
        switch (state.filterOperator) {
            case 'eq': // é igual a
                return recordStr === filterStr;
            case 'neq': // não é igual a
                return recordStr !== filterStr;
            case 'contains': // contém
                return recordStr.includes(filterStr);
            case 'starts': // começa com
                return recordStr.startsWith(filterStr);
            case 'ends': // termina com
                return recordStr.endsWith(filterStr);
            case 'gt': // maior que
                return Number(recordValue) > Number(state.filterValue);
            case 'lt': // menor que
                return Number(recordValue) < Number(state.filterValue);
            default:
                return true;
        }
    });
}

/**
 * Obtém um título representativo para o registro (para uso no Kanban e Galeria)
 * @param {Object} record - Dados do registro
 * @returns {string} - Título do registro
 */
function getRecordTitle(record) {
    // Tenta encontrar um campo de título óbvio
    const titleFields = ['Nome', 'Título', 'Title', 'Name', 'Descricao', 'Descrição', 'Description'];
    
    for (const field of titleFields) {
        if (record[field] && typeof record[field] === 'string') {
            return record[field];
        }
    }
    
    // Se não encontrar, usa o primeiro campo de texto não vazio
    if (state.schema && state.schema.attributes) {
        for (const attr of state.schema.attributes) {
            if ((attr.type === 'text' || attr.type === 'textarea') && record[attr.label]) {
                return record[attr.label];
            }
        }
    }
    
    // Se ainda não encontrar, usa o ID
    return `Registro ${record.id.slice(0, 8)}...`;
}

/**
 * Obtém um subtítulo representativo para o registro (para uso no Kanban e Galeria)
 * @param {Object} record - Dados do registro
 * @returns {string} - Subtítulo do registro
 */
function getRecordSubtitle(record) {
    // Se houver um campo de data, usa-o
    if (record.created_at) {
        try {
            const date = new Date(record.created_at);
            return `Criado em ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        } catch (e) {
            // Ignora se não for possível formatar a data
        }
    }
    
    // Tenta encontrar um campo de descrição ou subtítulo óbvio que não seja o título
    const titleField = getTitleField(record);
    const subtitleFields = ['Descrição', 'Descricao', 'Description', 'Subtítulo', 'Subtitle', 'Nota', 'Note', 'Observação', 'Observation'];
    
    for (const field of subtitleFields) {
        if (record[field] && typeof record[field] === 'string' && field !== titleField) {
            return record[field].length > 50 ? record[field].slice(0, 50) + '...' : record[field];
        }
    }
    
    // Se não encontrar, tenta qualquer outro campo de texto que não seja o título
    if (state.schema && state.schema.attributes) {
        for (const attr of state.schema.attributes) {
            if ((attr.type === 'text' || attr.type === 'textarea') && 
                record[attr.label] && attr.label !== titleField) {
                const value = record[attr.label];
                return typeof value === 'string' && value.length > 50 ? value.slice(0, 50) + '...' : value;
            }
        }
    }
    
    // Se ainda não encontrar, usa o ID
    return `ID: ${record.id.slice(0, 8)}...`;
}

/**
 * Retorna o nome do campo usado como título
 * @param {Object} record - Dados do registro
 * @returns {string|null} - Nome do campo usado como título
 */
function getTitleField(record) {
    const titleFields = ['Nome', 'Título', 'Title', 'Name', 'Descricao', 'Descrição', 'Description'];
    
    for (const field of titleFields) {
        if (record[field] && typeof record[field] === 'string') {
            return field;
        }
    }
    
    // Se não encontrar, procura o primeiro campo de texto não vazio
    if (state.schema && state.schema.attributes) {
        for (const attr of state.schema.attributes) {
            if ((attr.type === 'text' || attr.type === 'textarea') && record[attr.label]) {
                return attr.label;
            }
        }
    }
    
    return null;
}

/**
 * Gera o conteúdo para um item da galeria
 * @param {Object} record - Dados do registro
 * @returns {string} - HTML com o conteúdo do item
 */
function getGalleryItemContent(record) {
    let content = '';
    
    // Limita a quantidade de campos para não sobrecarregar a visualização
    const maxFields = 3;
    let fieldCount = 0;
    
    if (state.schema && state.schema.attributes) {
        const titleField = getTitleField(record);
        
        for (const attr of state.schema.attributes) {
            // Pula o campo usado como título
            if (attr.label === titleField) {
                continue;
            }
            
            // Pula campos complexos
            if (attr.type === 'file' || attr.type === 'sub-entity' || attr.type === 'relationship') {
                continue;
            }
            
            const value = record[attr.label];
            if (value !== undefined && value !== null) {
                let displayValue = value;
                
                // Formata o valor de acordo com o tipo
                if (attr.type === 'checkbox') {
                    displayValue = value ? 
                        '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sim</span>' : 
                        '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Não</span>';
                } else if (attr.type === 'date') {
                    try {
                        const date = new Date(value);
                        displayValue = date.toLocaleDateString();
                    } catch (e) {
                        // Mantém o valor original se não for possível converter
                    }
                } else if (typeof value === 'string' && value.length > 30) {
                    displayValue = value.slice(0, 30) + '...';
                }
                
                content += `
                    <div class="flex items-start gap-2 mb-2">
                        <div class="text-xs font-medium text-slate-500">${attr.label}:</div>
                        <div class="text-xs text-slate-700">${displayValue}</div>
                    </div>
                `;
                
                fieldCount++;
                if (fieldCount >= maxFields) {
                    break;
                }
            }
        }
    }
    
    if (fieldCount === 0) {
        content = `<div class="text-xs text-slate-500 text-center">Sem detalhes adicionais</div>`;
    }
    
    return content;
}

/**
 * Mostra uma mensagem de erro
 * @param {string} title - Título do erro
 * @param {string} message - Mensagem de erro
 */
function showError(title, message) {
    // Atualiza o título da página
    document.getElementById('entity-title').textContent = 'Erro';
    document.getElementById('entity-subtitle').textContent = title;
    
    // Esconde o botão de novo registro
    document.getElementById('new-record-btn').style.display = 'none';
    
    // Mostra a mensagem de erro em todas as visualizações
    const errorHtml = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div class="bg-red-100 p-3 rounded-full inline-flex items-center justify-center text-red-600 mb-3">
                <i data-lucide="alert-circle" class="h-8 w-8"></i>
            </div>
            <h3 class="text-lg font-semibold text-red-800 mb-2">${title}</h3>
            <p class="text-red-700">${message}</p>
            <div class="mt-4">
                <a href="index.html" class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                    <i data-lucide="arrow-left" class="h-4 w-4"></i>
                    <span>Voltar ao Construtor</span>
                </a>
            </div>
        </div>
    `;
    
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.innerHTML = errorHtml;
    });
    
    // Esconde o seletor de visualizações
    document.querySelector('.flex.border-b.border-slate-200').style.display = 'none';
    
    // Atualiza a entrada da visualização
    setTimeout(() => {
        document.getElementById('view-container').classList.remove('opacity-0');
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
    }, 100);
}

/**
 * Retorna o ícone apropriado para o tipo de campo
 * @param {string} fieldType - O tipo de campo
 * @returns {string} - O nome do ícone
 */
function getIconForFieldType(fieldType) {
    const iconMap = {
        'text': 'type',
        'textarea': 'pilcrow',
        'number': 'hash',
        'date': 'calendar',
        'email': 'at-sign',
        'checkbox': 'check-square',
        'select': 'chevron-down-square',
        'file': 'upload-cloud',
        'sub-entity': 'table-2',
        'relationship': 'link'
    };
    
    return iconMap[fieldType] || 'circle';
}