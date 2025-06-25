// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAtuwWlErlNOW_c5BlBE_ktwSSmHGLjN2c",
    authDomain: "prototipoos.firebaseapp.com",
    databaseURL: "https://prototipoos-default-rtdb.firebaseio.com",
    projectId: "prototipoos",
    storageBucket: "prototipoos.firebasestorage.app",
    messagingSenderId: "969276068015",
    appId: "1:969276068015:web:ef7d8c7bfc6f8d5104445a",
    measurementId: "G-85EK8CECR5"
};

// Variáveis globais
let db;
let iconsAvailable = false;
let allEntities = [];
let modalNavigationStack = [];
let mobileSidebarOpen = false;
let modalSidebarOpen = false;

// Variáveis para controle de dicas
const TIPS_STATE = {
    WELCOME_TIP: 'welcomeTipClosed',
    QUICK_TIP: 'quickTipClosed'
};

// ==== DADOS DE CONFIGURAÇÃO INICIAL ====
const availableEntityIcons = ['user-round', 'file-text', 'package', 'phone', 'building', 'truck', 'dollar-sign', 'tag', 'shopping-cart', 'receipt', 'landmark', 'briefcase'];
const fieldTypes = [
    { type: 'text', name: 'Texto Curto', icon: 'type' },
    { type: 'textarea', name: 'Texto Longo', icon: 'pilcrow' },
    { type: 'number', name: 'Número', icon: 'hash' },
    { type: 'date', name: 'Data', icon: 'calendar' },
    { type: 'email', name: 'Email', icon: 'at-sign' },
    { type: 'checkbox', name: 'Caixa de Seleção', icon: 'check-square' },
    { type: 'select', name: 'Lista Suspensa', icon: 'chevron-down-square' },
    { type: 'file', name: 'Upload de Ficheiro', icon: 'upload-cloud' },
    { type: 'sub-entity', name: 'Tabela / Relação', icon: 'table-2' },
];

// ==== PONTO DE ENTRADA DA APLICAÇÃO ====
async function initApp() {
    if (typeof lucide !== 'undefined' && lucide) { iconsAvailable = true; }
    
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    } catch (error) {
        document.getElementById('loading-overlay').innerHTML = '<div class="text-center p-4 sm:p-5 bg-white rounded-lg shadow-md max-w-xs sm:max-w-sm"><div class="text-red-600 text-xl sm:text-2xl mb-3"><i data-lucide="alert-triangle"></i></div><p class="text-base sm:text-lg font-semibold text-red-700">Erro ao ligar à base de dados.</p><p class="text-slate-600 mt-2 text-sm sm:text-base">Verifique sua conexão com a internet e tente novamente.</p></div>';
        tryCreateIcons();
        return;
    }
    
    await loadAllEntities();
    await loadAndRenderModules();
    
    populateFieldsToolbox();
    setupEventListeners();
    setupMobileInteractions();
    setupTips();
    checkEmptyStates();
    
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', initApp);

// ---- Funções de Suporte ----
function tryCreateIcons() { 
    if (iconsAvailable) { 
        try {
            lucide.createIcons(); 
        } catch (error) {
            console.error("Erro ao criar ícones:", error);
        }
    } 
}

function setupMobileInteractions() {
    // Toggle menu mobile
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const desktopSidebar = document.getElementById('desktop-sidebar');
    const closeMobileMenu = document.getElementById('close-mobile-menu');
    
    if (mobileMenuToggle && desktopSidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            desktopSidebar.classList.add('open');
            mobileSidebarOpen = true;
        });
    }
    
    if (closeMobileMenu && desktopSidebar) {
        closeMobileMenu.addEventListener('click', () => {
            desktopSidebar.classList.remove('open');
            mobileSidebarOpen = false;
        });
    }
    
    // Fechar menu ao clicar fora (overlay)
    document.addEventListener('click', (e) => {
        if (mobileSidebarOpen && desktopSidebar && !desktopSidebar.contains(e.target) && e.target !== mobileMenuToggle) {
            desktopSidebar.classList.remove('open');
            mobileSidebarOpen = false;
        }
    });
    
    // Toggle para a sidebar do modal em dispositivos móveis
    const toggleModalSidebar = document.getElementById('toggle-modal-sidebar');
    const modalSidebarContent = document.getElementById('modal-sidebar-content');
    const modalSidebarContainer = document.getElementById('modal-sidebar-container');
    
    if (toggleModalSidebar && modalSidebarContent) {
        toggleModalSidebar.addEventListener('click', () => {
            modalSidebarContent.classList.toggle('hidden');
            modalSidebarOpen = !modalSidebarOpen;
            
            // Rotacionar ícone
            const icon = toggleModalSidebar.querySelector('i');
            if (icon) {
                if (modalSidebarOpen) {
                    icon.setAttribute('data-lucide', 'chevron-up');
                } else {
                    icon.setAttribute('data-lucide', 'chevron-down');
                }
                tryCreateIcons();
            }
        });
    }
    
    // Botão flutuante para adicionar módulo em dispositivos móveis
    const mobileAddModuleBtn = document.getElementById('mobile-add-module-btn');
    if (mobileAddModuleBtn) {
        mobileAddModuleBtn.addEventListener('click', handleAddNewModule);
    }
}

// Configura o sistema de dicas
function setupTips() {
    // Verifica o estado das dicas
    const welcomeTipClosed = localStorage.getItem(TIPS_STATE.WELCOME_TIP) === 'true';
    const quickTipClosed = localStorage.getItem(TIPS_STATE.QUICK_TIP) === 'true';
    
    const welcomeTip = document.getElementById('welcome-tip');
    const quickTip = document.getElementById('quick-tip');
    
    // Na primeira visita, mostra as dicas
    // Se o localStorage estiver vazio (primeira visita), mostra as dicas
    if (welcomeTip) {
        if (!welcomeTipClosed) {
            welcomeTip.classList.remove('hidden');
        }
    }
    
    if (quickTip) {
        if (!quickTipClosed) {
            quickTip.classList.remove('hidden');
        }
    }
    
    // Configura os botões de fechar
    document.querySelectorAll('.close-tip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tipId = btn.dataset.tipId;
            const tipElement = document.getElementById(tipId);
            
            if (tipElement) {
                tipElement.classList.add('hidden');
                
                // Salva a preferência do usuário
                if (tipId === 'welcome-tip') {
                    localStorage.setItem(TIPS_STATE.WELCOME_TIP, 'true');
                } else if (tipId === 'quick-tip') {
                    localStorage.setItem(TIPS_STATE.QUICK_TIP, 'true');
                }
            }
        });
    });
    
    // Configura o botão de ajuda para mostrar as dicas novamente
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            // Mostra as dicas quando o botão de ajuda é clicado
            if (welcomeTip) welcomeTip.classList.remove('hidden');
            if (quickTip) quickTip.classList.remove('hidden');
            
            // Exibe uma animação sutil para chamar atenção para as dicas
            if (welcomeTip) {
                welcomeTip.classList.add('animate-pulse');
                setTimeout(() => welcomeTip.classList.remove('animate-pulse'), 1000);
            }
            if (quickTip) {
                quickTip.classList.add('animate-pulse');
                setTimeout(() => quickTip.classList.remove('animate-pulse'), 1000);
            }
        });
    }
}

function checkEmptyStates() {
    // Verifica se existem módulos
    const moduleContainer = document.getElementById('module-container');
    const emptyState = document.getElementById('empty-state');
    
    if (moduleContainer.children.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function renderEntityInLibrary(entity) {
    const list = document.getElementById('entity-list');
    const template = document.getElementById('entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.entity-card');
    card.dataset.entityId = entity.id;
    card.dataset.entityName = entity.name;
    card.dataset.entityIcon = entity.icon; 
    
    const iconEl = clone.querySelector('.entity-icon');
    if (iconsAvailable) { 
        iconEl.setAttribute('data-lucide', entity.icon || 'box'); 
    } else { 
        iconEl.style.display = 'none'; 
    }

    clone.querySelector('.entity-name').textContent = entity.name;
    
    if (entity.id.startsWith('-')) { // Assumindo que IDs do Firebase começam com '-'
        clone.querySelector('.delete-custom-entity-btn').classList.remove('hidden');
    }
    
    list.appendChild(clone);
    tryCreateIcons();
}

async function loadAllEntities() {
    const list = document.getElementById('entity-list');
    list.innerHTML = '';
    allEntities = [];
    const snapshot = await db.ref('entities').get();
    if (snapshot.exists()) {
        const customEntities = snapshot.val();
        for (const entityId in customEntities) {
            allEntities.push({ ...customEntities[entityId], id: entityId });
        }
    }
    allEntities.forEach(renderEntityInLibrary);
    new Sortable(list, { 
        group: { name: 'entities', pull: 'clone', put: false }, 
        sort: false, 
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        delay: 50, // Delay para dispositivos móveis
        delayOnTouchOnly: true, // Aplicar delay apenas em touch
    });
}


function populateFieldsToolbox() {
    const toolbox = document.getElementById('fields-toolbox');
    toolbox.innerHTML = '';
    fieldTypes.forEach(field => {
        const clone = document.getElementById('toolbox-field-template').content.cloneNode(true);
        const item = clone.querySelector('.toolbox-item');
        item.dataset.fieldType = field.type;
        const iconEl = clone.querySelector('.field-icon');
        if (iconsAvailable) { iconEl.setAttribute('data-lucide', field.icon); }
        else { iconEl.style.display = 'none'; }
        clone.querySelector('.field-name').textContent = field.name;
        toolbox.appendChild(clone);
    });
    tryCreateIcons();
    new Sortable(toolbox, { 
        group: { name: 'fields', pull: 'clone', put: false }, 
        sort: false, 
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        delay: 50, // Delay para dispositivos móveis
        delayOnTouchOnly: true, // Aplicar delay apenas em touch
    });
}

function setupDragAndDropForModule(moduleElement) {
    const dropzone = moduleElement.querySelector('.entities-dropzone');
    new Sortable(dropzone, { 
        group: 'entities', 
        animation: 150, 
        onAdd: handleEntityDrop,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        delay: 50, // Delay para dispositivos móveis
        delayOnTouchOnly: true, // Aplicar delay apenas em touch
    });
}

function handleEntityDrop(event) {
    const { item, to } = event;
    const { entityId, entityName, entityIcon } = item.dataset;
    const moduleEl = to.closest('.module-quadro');
    const moduleId = moduleEl.dataset.moduleId;

    if (moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)) {
        item.remove();
        Swal.fire({ 
            icon: 'warning', 
            title: 'Entidade já existe!', 
            text: `A entidade "${entityName}" já está presente neste módulo.`,
            timer: 2000, 
            showConfirmButton: false, 
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
        return;
    }
    
    const template = document.getElementById('dropped-entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.dropped-entity-card');
    card.dataset.entityId = entityId;
    card.dataset.entityName = entityName;
    card.dataset.moduleId = moduleId;
    
    const iconEl = clone.querySelector('.entity-icon');
    if (iconsAvailable && entityIcon) {
       iconEl.setAttribute('data-lucide', entityIcon);
    } else {
       iconEl.style.display = 'none';
    }

    clone.querySelector('.entity-name').textContent = entityName;
    item.replaceWith(clone);
    tryCreateIcons();
    setTimeout(() => {
        const entityCard = document.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`);
        if (entityCard) {
            entityCard.classList.remove('animate-pulse');
        }
    }, 2000);
    
    saveEntityToModule(moduleId, entityId, entityName);
    
    // Notificação de sucesso em formato toast
    const Toast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    });
    
    Toast.fire({
        icon: 'success',
        title: `Entidade adicionada!`,
        text: 'Clique em configurar para definir seus campos.'
    });
}

async function handleFieldDrop(event) {
    const { item } = event;
    const fieldType = item.dataset.fieldType;
    item.remove();

    if (fieldType === 'sub-entity') {
        const { value: choice } = await Swal.fire({
            title: 'Como deseja criar esta tabela?',
            text: 'Pode criar uma sub-entidade nova ou ligar a uma que já existe.',
            showDenyButton: true,
            confirmButtonText: 'Criar Nova',
            denyButtonText: `Ligar a Existente`,
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });

        if (choice === true) {
            const { value: label, isConfirmed } = await Swal.fire({ 
                title: 'Nome da Nova Sub-Entidade', 
                input: 'text', 
                inputPlaceholder: 'Ex: Endereços, Contactos', 
                showCancelButton: true, 
                inputValidator: (v) => !v && 'O nome é obrigatório!',
                customClass: {
                    popup: 'shadow-xl rounded-xl',
                    input: 'rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
                }
            });
            if (isConfirmed && label) {
                const fieldData = { id: `field_${Date.now()}`, type: 'sub-entity', label, subType: 'independent', subSchema: { attributes: [] } };
                renderFormField(fieldData);
            }
        } else if (choice === false) {
            const currentEntityId = JSON.parse(document.getElementById('entity-builder-modal').dataset.context).entityId;
            const availableEntities = allEntities.filter(e => e.id !== currentEntityId);
            if (availableEntities.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Aviso', 
                    text: 'Não existem outras entidades para criar uma ligação. Crie pelo menos uma outra entidade primeiro.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
                return;
            }
            const entityOptions = availableEntities.map(e => `<option value="${e.id}|${e.name}">${e.name}</option>`).join('');
            const { value: formValues, isConfirmed } = await Swal.fire({
                title: 'Ligar a uma Entidade Existente',
                html: `
                    <div class="mb-4">
                        <label for="swal-input-label" class="block text-sm font-medium text-slate-700 mb-1 text-left">Nome do Campo</label>
                        <input id="swal-input-label" class="swal2-input w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Cliente Associado">
                    </div>
                    <div>
                        <label for="swal-input-target-entity" class="block text-sm font-medium text-slate-700 mb-1 text-left">Ligar a qual entidade?</label>
                        <select id="swal-input-target-entity" class="swal2-select w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">${entityOptions}</select>
                    </div>
                `,
                showCancelButton: true,
                focusConfirm: false,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                },
                preConfirm: () => {
                    const label = document.getElementById('swal-input-label').value;
                    const selectElement = document.getElementById('swal-input-target-entity');
                    const [targetEntityId, targetEntityName] = selectElement.value.split('|');
                    if (!label) { 
                        Swal.showValidationMessage('O nome do campo é obrigatório.'); 
                        return false; 
                    }
                    return { label, targetEntityId, targetEntityName };
                }
            });
            if(isConfirmed && formValues) {
                const fieldData = { id: `field_${Date.now()}`, type: 'sub-entity', ...formValues, subType: 'relationship' };
                renderFormField(fieldData);
            }
        }

    } else {
        const { value: label, isConfirmed } = await Swal.fire({ 
            title: `Adicionar Campo`, 
            input: 'text', 
            inputPlaceholder: 'Nome do Campo (ex: Nome Fantasia)', 
            showCancelButton: true, 
            inputValidator: (v) => !v && 'O nome é obrigatório!',
            customClass: {
                popup: 'shadow-xl rounded-xl',
                input: 'rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
            }
        });
        if (isConfirmed && label) {
            const fieldData = { id: `field_${Date.now()}`, type: fieldType, label };
            renderFormField(fieldData);
            
            // Notificação de sucesso
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
            
            Toast.fire({
                icon: 'success',
                title: `Campo adicionado!`
            });
        }
    }
}

function renderFormField(fieldData) {
    const dropzone = document.getElementById('form-builder-dropzone');
    const template = document.getElementById('form-field-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.form-field-card');
    card.dataset.fieldId = fieldData.id;
    card.dataset.fieldData = JSON.stringify(fieldData);
    const fieldInfo = fieldTypes.find(f => f.type === fieldData.type);
    
    const iconEl = clone.querySelector('.field-icon');
    if (iconsAvailable) { iconEl.setAttribute('data-lucide', fieldInfo.icon); } 
    else { iconEl.style.display = 'none'; }
    
    const handleEl = clone.querySelector('[data-lucide="grip-vertical"]');
    if (!iconsAvailable) { handleEl.style.display = 'none'; }
    
    clone.querySelector('.field-label').textContent = fieldData.label;
    
    if (fieldData.type === 'sub-entity') {
        clone.querySelector('.field-type').textContent = fieldData.subType === 'independent' ? 
            `Sub-Entidade` : 
            `Relação → ${fieldData.targetEntityName}`;
        clone.querySelector('.edit-sub-entity-btn').classList.remove('hidden');
        clone.querySelector('.edit-field-btn').style.display = 'none';
    } else {
        clone.querySelector('.field-type').textContent = fieldInfo.name;
    }
    
    dropzone.appendChild(clone);
    
    // Adiciona classe de animação e a remove após a animação
    const newField = dropzone.lastElementChild;
    newField.classList.add('animate-pulse');
    setTimeout(() => newField.classList.remove('animate-pulse'), 2000);
    
    tryCreateIcons();
    
    // Verifica se o formulário está vazio
    const emptyFormState = document.getElementById('empty-form-state');
    if (dropzone.children.length > 0) {
        emptyFormState.classList.add('hidden');
    } else {
        emptyFormState.classList.remove('hidden');
    }
}

function updateModalBreadcrumb() {
    const breadcrumbContainer = document.getElementById('modal-breadcrumb');
    const backBtn = document.getElementById('modal-back-btn');
    breadcrumbContainer.innerHTML = '';
    
    if (modalNavigationStack.length === 0) {
        backBtn.classList.add('hidden');
        const context = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
        const titleSpan = document.createElement('span');
        titleSpan.className = 'font-bold text-indigo-800';
        titleSpan.innerHTML = `<i data-lucide="file-edit" class="inline h-4 w-4 sm:h-5 sm:w-5 mr-1 text-indigo-600"></i> <span class="text-slate-800">${context.entityName}</span>`;
        breadcrumbContainer.appendChild(titleSpan);
    } else {
        backBtn.classList.remove('hidden');
        // Em telas pequenas, mostrar apenas o último item
        if (window.innerWidth < 640) {
            const currentContext = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
            const currentTitleSpan = document.createElement('span');
            currentTitleSpan.className = 'font-semibold text-indigo-800';
            currentTitleSpan.textContent = currentContext.label || currentContext.entityName;
            breadcrumbContainer.appendChild(currentTitleSpan);
        } else {
            // Em telas maiores, mostrar toda a navegação
            modalNavigationStack.forEach((state, index) => {
                const nameSpan = document.createElement('span');
                nameSpan.textContent = state.entityName || state.label;
                nameSpan.className = 'text-slate-500 truncate';
                breadcrumbContainer.appendChild(nameSpan);
                
                if (index < modalNavigationStack.length - 1) {
                    const separator = document.createElement('span');
                    separator.className = 'mx-1 sm:mx-2 text-slate-400';
                    separator.innerHTML = `<i data-lucide="chevron-right" class="inline h-3 w-3 sm:h-4 sm:w-4"></i>`;
                    breadcrumbContainer.appendChild(separator);
                } else {
                    const separator = document.createElement('span');
                    separator.className = 'mx-1 sm:mx-2 text-slate-400';
                    separator.innerHTML = `<i data-lucide="chevron-right" class="inline h-3 w-3 sm:h-4 sm:w-4"></i>`;
                    breadcrumbContainer.appendChild(separator);
                }
            });
            
            const context = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
            const currentTitleSpan = document.createElement('span');
            currentTitleSpan.className = 'font-semibold text-indigo-800 truncate';
            currentTitleSpan.textContent = context.label || context.entityName;
            breadcrumbContainer.appendChild(currentTitleSpan);
        }
    }
    
    tryCreateIcons();
}

function openModal(context) {
    const modal = document.getElementById('entity-builder-modal');
    modal.dataset.context = JSON.stringify(context);
    
    updateModalBreadcrumb();
    const dropzone = document.getElementById('form-builder-dropzone');
    dropzone.innerHTML = '';
    
    // Certifique-se de que o sidebar modal esteja visível em desktop, mas escondido em mobile
    const modalSidebarContent = document.getElementById('modal-sidebar-content');
    if (modalSidebarContent) {
        if (window.innerWidth >= 640) {
            modalSidebarContent.classList.remove('hidden');
        } else {
            modalSidebarContent.classList.add('hidden');
        }
    }
    
    // Resetar o ícone do toggle da sidebar do modal
    const toggleModalSidebar = document.getElementById('toggle-modal-sidebar');
    if (toggleModalSidebar) {
        const icon = toggleModalSidebar.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'chevron-down');
            tryCreateIcons();
        }
    }
    
    new Sortable(dropzone, { 
        group: 'fields', 
        animation: 150, 
        onAdd: handleFieldDrop, 
        handle: '[data-lucide="grip-vertical"]',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        delay: 50, // Delay para dispositivos móveis
        delayOnTouchOnly: true, // Aplicar delay apenas em touch
    });

    if (context.isSubEntity) {
        (context.subSchema.attributes || []).forEach(renderFormField);
    } else {
        loadStructureForEntity(context.moduleId, context.entityId);
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => modal.querySelector('.bg-white').classList.remove('scale-95', 'opacity-0'), 10);
}

function closeModal() {
    const modal = document.getElementById('entity-builder-modal');
    modal.querySelector('.bg-white').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modalNavigationStack = [];
    }, 300);
}

function setupEventListeners() {
    document.body.addEventListener('click', e => {
        const configureBtn = e.target.closest('.configure-btn');
        if (configureBtn) {
            const card = configureBtn.closest('.dropped-entity-card');
            openModal({ moduleId: card.dataset.moduleId, entityId: card.dataset.entityId, entityName: card.dataset.entityName });
            return;
        }
        const deleteEntityBtn = e.target.closest('.delete-entity-btn');
        if (deleteEntityBtn) { confirmAndRemoveEntityFromModule(deleteEntityBtn.closest('.dropped-entity-card')); return; }
        const deleteCustomEntityBtn = e.target.closest('.delete-custom-entity-btn');
        if (deleteCustomEntityBtn) { confirmAndRemoveCustomEntity(deleteCustomEntityBtn.closest('.entity-card')); return; }
        const deleteModuleBtn = e.target.closest('.delete-module-btn');
        if (deleteModuleBtn) { confirmAndRemoveModule(deleteModuleBtn.closest('.module-quadro')); return; }
        const editSubEntityBtn = e.target.closest('.edit-sub-entity-btn');
        if (editSubEntityBtn) { handleEditSubEntity(editSubEntityBtn); return; }
    });
    
    document.getElementById('add-new-entity-btn').addEventListener('click', handleAddNewEntity);
    document.getElementById('add-new-module-btn').addEventListener('click', handleAddNewModule);
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('save-structure-btn').addEventListener('click', saveCurrentStructure);
    document.getElementById('modal-back-btn').addEventListener('click', handleModalBack);
    
    // Botão adicional para estado vazio
    const emptyAddModuleBtn = document.getElementById('empty-add-module-btn');
    if (emptyAddModuleBtn) {
        emptyAddModuleBtn.addEventListener('click', handleAddNewModule);
    }

    document.getElementById('form-builder-dropzone').addEventListener('click', e => {
         const deleteBtn = e.target.closest('.delete-field-btn');
         if (deleteBtn) {
            Swal.fire({ 
                title: 'Tem certeza?', 
                text: "Não poderá reverter esta ação!", 
                icon: 'warning', 
                showCancelButton: true, 
                confirmButtonColor: '#d33', 
                cancelButtonColor: '#6366f1', 
                confirmButtonText: 'Sim, eliminar!', 
                cancelButtonText: 'Cancelar',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            })
            .then(result => { 
                if (result.isConfirmed) { 
                    const fieldCard = deleteBtn.closest('.form-field-card');
                    const fieldName = fieldCard.querySelector('.field-label').textContent;
                    fieldCard.remove();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Eliminado!',
                        text: `O campo "${fieldName}" foi removido.`,
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'shadow-xl rounded-xl'
                        }
                    });
                    
                    // Verifica se o formulário está vazio
                    const dropzone = document.getElementById('form-builder-dropzone');
                    const emptyFormState = document.getElementById('empty-form-state');
                    if (dropzone.children.length === 0) {
                        emptyFormState.classList.remove('hidden');
                    }
                } 
            });
         }
    });
    
    // Adicionar ouvinte de redimensionamento para atualizar a navegação do breadcrumb
    window.addEventListener('resize', () => {
        if (document.getElementById('entity-builder-modal') && !document.getElementById('entity-builder-modal').classList.contains('hidden')) {
            updateModalBreadcrumb();
        }
    });
}

async function handleAddNewEntity() {
    const iconHtml = availableEntityIcons.map(icon => 
        `<button class="icon-picker-btn p-2 rounded-md hover:bg-indigo-100 transition-all" data-icon="${icon}">
            <div class="h-6 w-6 sm:h-8 sm:w-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
                <i data-lucide="${icon}"></i>
            </div>
         </button>`
    ).join('');
    
    const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Criar Nova Entidade',
        html: `
            <div class="mb-4">
                <label for="swal-input-name" class="block text-sm font-medium text-slate-700 mb-1 text-left">Nome da Entidade</label>
                <input id="swal-input-name" class="swal2-input w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Fornecedor, Produto, Funcionário...">
            </div>
            <div>
                <p class="text-sm font-medium text-slate-700 mb-2 text-left">Escolha um ícone:</p>
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">${iconHtml}</div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Criar Entidade',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        customClass: {
            popup: 'shadow-xl rounded-xl'
        },
        didOpen: () => {
            tryCreateIcons();
            document.querySelector('#swal2-html-container').addEventListener('click', e => {
                const button = e.target.closest('.icon-picker-btn');
                if (button) {
                    document.querySelectorAll('.icon-picker-btn').forEach(btn => btn.classList.remove('bg-indigo-200'));
                    button.classList.add('bg-indigo-200');
                }
            });
        },
        preConfirm: () => {
            const name = document.getElementById('swal-input-name').value;
            const selectedIconEl = document.querySelector('.icon-picker-btn.bg-indigo-200');
            if (!name) { 
                Swal.showValidationMessage('O nome da entidade é obrigatório.'); 
                return false; 
            }
            if (!selectedIconEl) { 
                Swal.showValidationMessage('Por favor, escolha um ícone.'); 
                return false; 
            }
            return { name, icon: selectedIconEl.dataset.icon };
        }
    });
    
    if (isConfirmed && formValues) {
        const newEntityData = { name: formValues.name, icon: formValues.icon };
        
        // Mostra um spinner enquanto cria a entidade
        Swal.fire({
            title: 'Criando entidade...',
            text: 'Por favor, aguarde...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            const newEntityRef = db.ref('entities').push();
            await newEntityRef.set(newEntityData);
            await loadAllEntities();
            
            Swal.fire({
                icon: 'success',
                title: 'Entidade Criada!',
                text: `A entidade "${formValues.name}" está pronta para ser usada.`,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        } catch (error) {
            console.error("Erro ao criar entidade:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Ocorreu um erro ao criar a entidade. Tente novamente.',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        }
    }
}

async function handleAddNewModule() {
    const { value: name, isConfirmed } = await Swal.fire({
        title: 'Criar Novo Módulo',
        html: `
            <div>
                <label for="swal-input-module-name" class="block text-sm font-medium text-slate-700 mb-1 text-left">Nome do Módulo</label>
                <input id="swal-input-module-name" class="swal2-input w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Vendas, Recursos Humanos, Financeiro...">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Criar Módulo',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        customClass: {
            popup: 'shadow-xl rounded-xl',
            input: 'rounded-lg border-slate-300'
        },
        preConfirm: () => {
            const moduleName = document.getElementById('swal-input-module-name').value;
            if (!moduleName) {
                Swal.showValidationMessage('O nome do módulo é obrigatório!');
                return false;
            }
            return moduleName;
        }
    });

    if (isConfirmed && name) {
        // Mostra um spinner enquanto cria o módulo
        Swal.fire({
            title: 'Criando módulo...',
            text: 'Por favor, aguarde...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            const newModuleRef = db.ref('modules').push();
            const newModuleData = { id: newModuleRef.key, name };
            await newModuleRef.set(newModuleData);
            renderModule(newModuleData);
            checkEmptyStates();
            
            Swal.fire({
                icon: 'success',
                title: 'Módulo Criado!',
                text: `O módulo "${name}" foi criado com sucesso.`,
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
            
            // Dica após criar o primeiro módulo
            if (document.querySelectorAll('.module-quadro').length === 1) {
                setTimeout(() => {
                    Swal.fire({
                        title: 'Dica',
                        text: 'Agora arraste entidades da biblioteca para o seu novo módulo.',
                        icon: 'info',
                        confirmButtonText: 'Entendi',
                        customClass: {
                            popup: 'shadow-xl rounded-xl'
                        }
                    });
                }, 2500);
            }
        } catch (error) {
            console.error("Erro ao criar módulo:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Ocorreu um erro ao criar o módulo. Tente novamente.',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        }
    }
}

function handleEditSubEntity(button) {
    const card = button.closest('.form-field-card');
    const fieldData = JSON.parse(card.dataset.fieldData);
    
    if (fieldData.subType === 'independent') {
        const parentContext = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
        modalNavigationStack.push(parentContext);
        
        openModal({
            isSubEntity: true,
            label: fieldData.label,
            parentFieldId: fieldData.id,
            subSchema: fieldData.subSchema,
        });
    } else if (fieldData.subType === 'relationship') {
        const targetEntity = allEntities.find(e => e.id === fieldData.targetEntityId);
        if (!targetEntity) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'A entidade relacionada já não existe.',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
            return;
        }
        
        const parentContext = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
        modalNavigationStack.push(parentContext);

        openModal({
            moduleId: 'system', // A entidade relacionada é global, não pertence a um módulo específico neste contexto
            entityId: targetEntity.id,
            entityName: targetEntity.name,
        });
    }
}

function handleModalBack() {
    if (modalNavigationStack.length > 0) {
        const parentContext = modalNavigationStack.pop();
        openModal(parentContext);
    }
}

function confirmAndRemoveEntityFromModule(card) {
    const { entityName, moduleId, entityId } = card.dataset;
    Swal.fire({ 
        title: `Remover '${entityName}'?`, 
        text: `Tem a certeza que deseja remover esta entidade do módulo?`,
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#6366f1', 
        confirmButtonText: 'Sim, remover!', 
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    })
    .then(async result => { 
        if (result.isConfirmed) { 
            try {
                await deleteEntityFromModule(moduleId, entityId);
                card.remove();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Removido!',
                    text: `A entidade "${entityName}" foi removida do módulo.`,
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            } catch (error) {
                console.error("Erro ao remover entidade:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Ocorreu um erro ao remover a entidade. Tente novamente.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            }
        } 
    });
}

function confirmAndRemoveCustomEntity(card) {
    const { entityId, entityName } = card.dataset;
    Swal.fire({ 
        title: `Eliminar Entidade?`, 
        html: `<p class="mb-2">Isto irá remover <strong>${entityName}</strong> da biblioteca e de <strong>todos os módulos</strong>.</p><p class="font-bold text-red-600">Esta ação é PERMANENTE.</p>`, 
        icon: 'error', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#6366f1', 
        confirmButtonText: 'Sim, eliminar!', 
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    })
    .then(async result => {
        if (result.isConfirmed) {
            // Mostra um spinner enquanto exclui a entidade
            Swal.fire({
                title: 'Eliminando entidade...',
                text: 'Por favor, aguarde...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                await db.ref(`entities/${entityId}`).remove();
                const snapshot = await db.ref('schemas').get();
                if (snapshot.exists()) {
                    const updates = {};
                    for (const moduleId in snapshot.val()) { 
                        updates[`/schemas/${moduleId}/${entityId}`] = null;
                    }
                    await db.ref().update(updates);
                }
                await loadAllEntities();
                document.querySelectorAll(`.dropped-entity-card[data-entity-id="${entityId}"]`).forEach(c => c.remove());
                
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado!',
                    text: `A entidade "${entityName}" foi eliminada permanentemente.`,
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            } catch (error) {
                console.error("Erro ao eliminar entidade:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Ocorreu um erro ao eliminar a entidade. Tente novamente.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            }
        }
    });
}

function confirmAndRemoveModule(moduleEl) {
    const moduleId = moduleEl.dataset.moduleId;
    const moduleName = moduleEl.querySelector('.module-title').textContent;
    Swal.fire({ 
        title: `Eliminar Módulo?`, 
        html: `<p class="mb-2">Isto irá remover <strong>${moduleName}</strong> e <strong>TODAS as entidades</strong> dentro dele.</p><p class="font-bold text-red-600">Esta ação é PERMANENTE.</p>`, 
        icon: 'error', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#6366f1', 
        confirmButtonText: 'Sim, eliminar!', 
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'shadow-xl rounded-xl'
        }
    })
    .then(async (result) => {
        if (result.isConfirmed) {
            // Mostra um spinner enquanto exclui o módulo
            Swal.fire({
                title: 'Eliminando módulo...',
                text: 'Por favor, aguarde...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                await db.ref(`modules/${moduleId}`).remove();
                await db.ref(`schemas/${moduleId}`).remove();
                moduleEl.remove();
                checkEmptyStates();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado!',
                    text: `O módulo "${moduleName}" foi eliminado permanentemente.`,
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            } catch (error) {
                console.error("Erro ao eliminar módulo:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Ocorreu um erro ao eliminar o módulo. Tente novamente.',
                    customClass: {
                        popup: 'shadow-xl rounded-xl'
                    }
                });
            }
        }
    });
}


async function deleteEntityFromModule(moduleId, entityId) {
    await db.ref(`schemas/${moduleId}/${entityId}`).remove();
}

async function saveEntityToModule(moduleId, entityId, entityName) {
    const path = `schemas/${moduleId}/${entityId}`;
    const snapshot = await db.ref(path).get();
    if (!snapshot.exists()) { await db.ref(path).set({ entityName, attributes: [] }); }
}

async function saveCurrentStructure() {
    const modal = document.getElementById('entity-builder-modal');
    const context = JSON.parse(modal.dataset.context);
    const fieldCards = document.getElementById('form-builder-dropzone').querySelectorAll('.form-field-card');
    const attributes = Array.from(fieldCards).map(card => JSON.parse(card.dataset.fieldData));

    // Mostra um spinner enquanto salva
    Swal.fire({
        title: 'Guardando estrutura...',
        text: 'Por favor, aguarde...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        if (context.isSubEntity) {
            // Guardar a estrutura da sub-entidade de volta no seu campo pai
            const parentContext = modalNavigationStack[modalNavigationStack.length - 1];
            const parentSchemaSnapshot = await db.ref(`schemas/${parentContext.moduleId}/${parentContext.entityId}`).get();
            if (parentSchemaSnapshot.exists()) {
                const parentSchema = parentSchemaSnapshot.val();
                const parentField = parentSchema.attributes.find(attr => attr.id === context.parentFieldId);
                if (parentField) {
                    parentField.subSchema.attributes = attributes;
                    await db.ref(`schemas/${parentContext.moduleId}/${parentContext.entityId}`).set(parentSchema);
                    
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Guardado!', 
                        text: 'A estrutura da sub-entidade foi guardada com sucesso.',
                        timer: 2000, 
                        showConfirmButton: false,
                        customClass: {
                            popup: 'shadow-xl rounded-xl'
                        }
                    });
                }
            }
        } else {
            // Guardar a estrutura da entidade principal
            const schema = { entityName: context.entityName, attributes };
            await db.ref(`schemas/${context.moduleId}/${context.entityId}`).set(schema);
            
            Swal.fire({ 
                icon: 'success', 
                title: 'Guardado!', 
                text: `A estrutura da entidade "${context.entityName}" foi guardada com sucesso.`,
                timer: 2000, 
                showConfirmButton: false,
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        }
    } catch (error) {
        console.error("Erro ao salvar estrutura:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Ocorreu um erro ao guardar a estrutura. Tente novamente.',
            customClass: {
                popup: 'shadow-xl rounded-xl'
            }
        });
    }
}


function renderModule(moduleData) {
    const container = document.getElementById('module-container');
    const template = document.getElementById('module-template');
    const clone = template.content.cloneNode(true);
    const moduleEl = clone.querySelector('.module-quadro');
    
    moduleEl.dataset.moduleId = moduleData.id;
    clone.querySelector('.module-title').textContent = moduleData.name;
    
    container.appendChild(clone);
    const newModuleEl = container.querySelector(`[data-module-id="${moduleData.id}"]`);
    setupDragAndDropForModule(newModuleEl);
    tryCreateIcons();
    
    // Adiciona classe de animação e a remove após a animação
    newModuleEl.classList.add('animate-pulse');
    setTimeout(() => newModuleEl.classList.remove('animate-pulse'), 2000);
}

async function loadAndRenderModules() {
    const snapshot = await db.ref('modules').get();
    if (snapshot.exists()) {
        const modules = snapshot.val();
        for (const moduleId in modules) {
            renderModule({ ...modules[moduleId], id: moduleId });
        }
    }
    await loadDroppedEntitiesIntoModules();
    checkEmptyStates();
}

async function loadDroppedEntitiesIntoModules() {
     const snapshot = await db.ref('schemas').get();
     if (snapshot.exists()) {
        const schemas = snapshot.val();
        for (const moduleId in schemas) {
            const moduleEl = document.querySelector(`.module-quadro[data-module-id="${moduleId}"]`);
            if(moduleEl) {
                const dropzone = moduleEl.querySelector('.entities-dropzone');
                dropzone.innerHTML = ''; 
                for(const entityId in schemas[moduleId]) {
                    if (!schemas[moduleId][entityId]) continue;
                    const entityInfo = allEntities.find(e => e.id === entityId);
                    if (!entityInfo) continue;
                    const entityData = schemas[moduleId][entityId];
                    const template = document.getElementById('dropped-entity-card-template');
                    const clone = template.content.cloneNode(true);
                    const card = clone.querySelector('.dropped-entity-card');
                    card.dataset.entityId = entityId;
                    card.dataset.entityName = entityData.entityName;
                    card.dataset.moduleId = moduleId;
                    const iconEl = clone.querySelector('.entity-icon');
                    if (iconsAvailable && entityInfo) {
                       iconEl.setAttribute('data-lucide', entityInfo.icon || 'box');
                    } else {
                       iconEl.style.display = 'none';
                    }
                    clone.querySelector('.entity-name').textContent = entityData.entityName;
                    card.classList.remove('animate-pulse');
                    dropzone.appendChild(clone);
                }
            }
        }
        tryCreateIcons();
     }
}

async function loadStructureForEntity(moduleId, entityId) {
    const snapshot = await db.ref(`schemas/${moduleId}/${entityId}`).get();
    if (snapshot.exists()) {
        const schema = snapshot.val();
        if (schema.attributes && schema.attributes.length > 0) {
            schema.attributes.forEach(attr => renderFormField(attr));
        } else {
            // Se não houver atributos, mostra o estado vazio
            document.getElementById('empty-form-state').classList.remove('hidden');
        }
    } else {
        // Se não houver schema, mostra o estado vazio
        document.getElementById('empty-form-state').classList.remove('hidden');
    }
}