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
        document.getElementById('loading-overlay').innerHTML = 'Erro ao ligar à base de dados.';
        return;
    }
    
    await loadAllEntities();
    await loadAndRenderModules();
    
    populateFieldsToolbox();
    setupEventListeners();
    
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', initApp);

// ---- Funções de Suporte ----
function tryCreateIcons() { if (iconsAvailable) { lucide.createIcons(); } }

function renderEntityInLibrary(entity) {
    const list = document.getElementById('entity-list');
    const template = document.getElementById('entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.entity-card');
    card.dataset.entityId = entity.id;
    card.dataset.entityName = entity.name;
    card.dataset.entityIcon = entity.icon; 
    
    const iconEl = clone.querySelector('.entity-icon');
    if (iconsAvailable) { iconEl.setAttribute('data-lucide', entity.icon); }
    else { iconEl.style.display = 'none'; }

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
    new Sortable(list, { group: { name: 'entities', pull: 'clone', put: false }, sort: false, animation: 150 });
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
    new Sortable(toolbox, { group: { name: 'fields', pull: 'clone', put: false }, sort: false, animation: 150 });
}

function setupDragAndDropForModule(moduleElement) {
    const dropzone = moduleElement.querySelector('.entities-dropzone');
    new Sortable(dropzone, { group: 'entities', animation: 150, onAdd: handleEntityDrop });
}

function handleEntityDrop(event) {
    const { item, to } = event;
    const { entityId, entityName, entityIcon } = item.dataset;
    const moduleEl = to.closest('.module-quadro');
    const moduleId = moduleEl.dataset.moduleId;

    if (moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)) {
        item.remove();
        Swal.fire({ icon: 'warning', title: 'Entidade já existe!', timer: 2000, showConfirmButton: false });
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
    setTimeout(() => document.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)?.classList.remove('animate-pulse'), 500);
    saveEntityToModule(moduleId, entityId, entityName);
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
            confirmButtonText: 'Criar Nova (Independente)',
            denyButtonText: `Ligar a Existente`,
        });

        if (choice === true) {
            const { value: label, isConfirmed } = await Swal.fire({ title: 'Nome da Nova Sub-Entidade', input: 'text', inputPlaceholder: 'Ex: Endereços, Contactos', showCancelButton: true, inputValidator: (v) => !v && 'O nome é obrigatório!' });
            if (isConfirmed && label) {
                const fieldData = { id: `field_${Date.now()}`, type: 'sub-entity', label, subType: 'independent', subSchema: { attributes: [] } };
                renderFormField(fieldData);
            }
        } else if (choice === false) {
            const currentEntityId = JSON.parse(document.getElementById('entity-builder-modal').dataset.context).entityId;
            const availableEntities = allEntities.filter(e => e.id !== currentEntityId);
            if (availableEntities.length === 0) {
                Swal.fire('Aviso', 'Não existem outras entidades para criar uma ligação.', 'warning');
                return;
            }
            const entityOptions = availableEntities.map(e => `<option value="${e.id}|${e.name}">${e.name}</option>`).join('');
            const { value: formValues, isConfirmed } = await Swal.fire({
                title: 'Ligar a uma Entidade Existente',
                html: `<input id="swal-input-label" class="swal2-input" placeholder="Nome do Campo (ex: Cliente Associado)"><p class="text-sm mt-4 mb-2">Ligar a qual entidade?</p><select id="swal-input-target-entity" class="swal2-select">${entityOptions}</select>`,
                preConfirm: () => {
                    const label = document.getElementById('swal-input-label').value;
                    const [targetEntityId, targetEntityName] = document.getElementById('swal-input-target-entity').value.split('|');
                    if (!label) { Swal.showValidationMessage('O nome do campo é obrigatório.'); return false; }
                    return { label, targetEntityId, targetEntityName };
                }
            });
            if(isConfirmed && formValues) {
                const fieldData = { id: `field_${Date.now()}`, type: 'sub-entity', ...formValues, subType: 'relationship' };
                renderFormField(fieldData);
            }
        }

    } else {
        const { value: label, isConfirmed } = await Swal.fire({ title: `Adicionar Propriedade`, input: 'text', inputPlaceholder: 'Nome da Propriedade (ex: Nome Fantasia)', showCancelButton: true, inputValidator: (v) => !v && 'O nome é obrigatório!' });
        if (isConfirmed && label) {
            const fieldData = { id: `field_${Date.now()}`, type: fieldType, label };
            renderFormField(fieldData);
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
        clone.querySelector('.field-type').textContent = fieldData.subType === 'independent' ? `Sub-Entidade` : `Relação -> ${fieldData.targetEntityName}`;
        clone.querySelector('.edit-sub-entity-btn').classList.remove('hidden');
        clone.querySelector('.edit-field-btn').style.display = 'none';
    } else {
        clone.querySelector('.field-type').textContent = fieldInfo.name;
    }
    
    dropzone.appendChild(clone);
    tryCreateIcons();
}

function updateModalBreadcrumb() {
    const breadcrumbContainer = document.getElementById('modal-breadcrumb');
    const backBtn = document.getElementById('modal-back-btn');
    breadcrumbContainer.innerHTML = '';
    
    if (modalNavigationStack.length === 0) {
        backBtn.classList.add('hidden');
        const context = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
        const titleSpan = document.createElement('span');
        titleSpan.className = 'font-bold';
        titleSpan.textContent = `Editando: ${context.entityName}`;
        breadcrumbContainer.appendChild(titleSpan);
    } else {
        backBtn.classList.remove('hidden');
        modalNavigationStack.forEach((state) => {
            const nameSpan = document.createElement('span');
            nameSpan.textContent = state.entityName;
            nameSpan.className = 'text-slate-500';
            breadcrumbContainer.appendChild(nameSpan);
            const separator = document.createElement('span');
            separator.className = 'mx-2 text-slate-400';
            separator.textContent = '>';
            breadcrumbContainer.appendChild(separator);
        });
        const context = JSON.parse(document.getElementById('entity-builder-modal').dataset.context);
        const currentTitleSpan = document.createElement('span');
        currentTitleSpan.className = 'font-bold';
        currentTitleSpan.textContent = context.label;
        breadcrumbContainer.appendChild(currentTitleSpan);
    }
}

function openModal(context) {
    const modal = document.getElementById('entity-builder-modal');
    modal.dataset.context = JSON.stringify(context);
    
    updateModalBreadcrumb();
    const dropzone = document.getElementById('form-builder-dropzone');
    dropzone.innerHTML = '';
    
    new Sortable(dropzone, { group: 'fields', animation: 150, onAdd: handleFieldDrop, handle: '[data-lucide="grip-vertical"]' });

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

    document.getElementById('form-builder-dropzone').addEventListener('click', e => {
         const deleteBtn = e.target.closest('.delete-field-btn');
         if (deleteBtn) {
            Swal.fire({ title: 'Tem certeza?', text: "Não poderá reverter esta ação!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, eliminar!', cancelButtonText: 'Cancelar' })
                .then(result => { if (result.isConfirmed) { deleteBtn.closest('.form-field-card').remove(); Swal.fire('Eliminado!', 'O campo foi removido.', 'success'); } });
         }
    });
}

async function handleAddNewEntity() {
    const iconHtml = availableEntityIcons.map(icon => `<button class="icon-picker-btn p-2 rounded-md hover:bg-indigo-100" data-icon="${icon}"><i data-lucide="${icon}"></i></button>`).join('');
    const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Criar Nova Entidade',
        html: `<input id="swal-input-name" class="swal2-input" placeholder="Nome da Entidade (ex: Fornecedor)"><p class="text-sm mt-4 mb-2">Escolha um ícone:</p><div class="grid grid-cols-8 gap-2">${iconHtml}</div>`,
        focusConfirm: false,
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
            if (!name) { Swal.showValidationMessage('O nome da entidade é obrigatório.'); return false; }
            if (!selectedIconEl) { Swal.showValidationMessage('Por favor, escolha um ícone.'); return false; }
            return { name, icon: selectedIconEl.dataset.icon };
        }
    });
    if (isConfirmed && formValues) {
        const newEntityData = { name: formValues.name, icon: formValues.icon };
        const newEntityRef = db.ref('entities').push();
        await newEntityRef.set(newEntityData);
        await loadAllEntities();
        Swal.fire('Criado!', 'A sua nova entidade está pronta para ser usada.', 'success');
    }
}

async function handleAddNewModule() {
    const { value: name, isConfirmed } = await Swal.fire({
        title: 'Criar Novo Módulo',
        input: 'text',
        inputLabel: 'Nome do Módulo',
        inputPlaceholder: 'Ex: Vendas, Recursos Humanos...',
        showCancelButton: true,
        confirmButtonText: 'Criar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => { if (!value) { return 'O nome do módulo é obrigatório!' } }
    });

    if (isConfirmed && name) {
        const newModuleRef = db.ref('modules').push();
        const newModuleData = { id: newModuleRef.key, name };
        await newModuleRef.set(newModuleData);
        renderModule(newModuleData);
        Swal.fire('Criado!', `O módulo '${name}' foi criado com sucesso.`, 'success');
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
            Swal.fire('Erro', 'A entidade relacionada já não existe.', 'error');
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
    Swal.fire({ title: `Remover '${entityName}'?`, text: `Tem a certeza que deseja remover esta entidade do módulo?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, remover!', cancelButtonText: 'Cancelar' })
        .then(result => { if (result.isConfirmed) { card.remove(); deleteEntityFromModule(moduleId, entityId); } });
}

function confirmAndRemoveCustomEntity(card) {
    const { entityId, entityName } = card.dataset;
    Swal.fire({ title: `Eliminar Entidade '${entityName}'?`, text: `Isto irá remover a entidade da biblioteca e de todos os módulos onde foi usada. Esta ação é PERMANENTE.`, icon: 'error', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, eliminar para sempre!', cancelButtonText: 'Cancelar' })
        .then(async result => {
            if (result.isConfirmed) {
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
                Swal.fire('Eliminado!', `A entidade '${entityName}' foi eliminada permanentemente.`, 'success');
            }
        });
}

function confirmAndRemoveModule(moduleEl) {
    const moduleId = moduleEl.dataset.moduleId;
    const moduleName = moduleEl.querySelector('.module-title').textContent;
    Swal.fire({ title: `Eliminar Módulo '${moduleName}'?`, text: `Isto irá remover o módulo e TODAS as entidades dentro dele. Esta ação é PERMANENTE.`, icon: 'error', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, eliminar para sempre!', cancelButtonText: 'Cancelar' })
        .then(async (result) => {
            if (result.isConfirmed) {
                await db.ref(`modules/${moduleId}`).remove();
                await db.ref(`schemas/${moduleId}`).remove();
                moduleEl.remove();
                Swal.fire('Eliminado!', `O módulo '${moduleName}' foi eliminado permanentemente.`, 'success');
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
                Swal.fire({ icon: 'success', title: 'Guardado!', text: 'A estrutura da sub-entidade foi guardada.', timer: 2000, showConfirmButton: false });
            }
        }
    } else {
        // Guardar a estrutura da entidade principal
        const schema = { entityName: context.entityName, attributes };
        await db.ref(`schemas/${context.moduleId}/${context.entityId}`).set(schema);
        Swal.fire({ icon: 'success', title: 'Guardado!', text: `A estrutura da entidade '${context.entityName}' foi guardada.`, timer: 2000, showConfirmButton: false });
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
        }
    }
}
