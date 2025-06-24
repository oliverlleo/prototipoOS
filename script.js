/*
================================================================================
|| SCRIPT.JS - VERSÃO COM CRIAÇÃO DE ENTIDADES DINÂMICAS ||
================================================================================
Este script foi reestruturado para permitir a criação de entidades pelo
utilizador. As entidades personalizadas são guardadas no Firebase e carregadas
ao iniciar a aplicação, tornando o sistema verdadeiramente modular.
================================================================================
*/

// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, set, get, push, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

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

// ==== DADOS DE CONFIGURAÇÃO INICIAL ====
const predefinedEntities = [
    { id: 'cliente', name: 'Cliente', icon: 'user-round', predefined: true },
    { id: 'proposta', name: 'Proposta', icon: 'file-text', predefined: true },
    { id: 'produto', name: 'Produto', icon: 'package', predefined: true },
    { id: 'chamado', name: 'Chamado', icon: 'phone', predefined: true },
];

const availableIcons = ['building', 'truck', 'dollar-sign', 'tag', 'shopping-cart', 'receipt', 'landmark', 'briefcase'];

const fieldTypes = [
    { type: 'text', name: 'Texto Curto', icon: 'type' },
    { type: 'textarea', name: 'Texto Longo', icon: 'pilcrow' },
    { type: 'number', name: 'Número', icon: 'hash' },
    { type: 'date', name: 'Data', icon: 'calendar' },
    { type: 'email', name: 'Email', icon: 'at-sign' },
    { type: 'checkbox', name: 'Caixa de Seleção', icon: 'check-square' },
    { type: 'select', name: 'Lista Suspensa', icon: 'chevron-down-square' },
    { type: 'file', name: 'Upload de Ficheiro', icon: 'upload-cloud' },
];

// ==== PONTO DE ENTRADA DA APLICAÇÃO ====
async function initApp() {
    console.log("🚀 A aplicação está a iniciar...");
    if (typeof lucide !== 'undefined' && lucide) {
        iconsAvailable = true;
    }
    try {
        const appFirebase = initializeApp(firebaseConfig);
        db = getDatabase(appFirebase);
        console.log("✅ Firebase inicializado.");
    } catch (error) {
        console.error("❌ ERRO CRÍTICO AO INICIALIZAR O FIREBASE:", error);
        document.getElementById('loading-overlay').innerHTML = 'Erro ao ligar à base de dados.';
        return;
    }
    
    await loadAllEntities();
    
    populateFieldsToolbox();
    setupDragAndDrop();
    setupEventListeners();
    
    await loadModuleStateFromFirebase();

    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app');
    loadingOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
    console.log("👍 Aplicação pronta.");
}

window.onload = initApp;

// ---- Funções de Suporte ----

function tryCreateIcons() {
    if (iconsAvailable) {
        lucide.createIcons();
    }
}

/**
 * Renderiza um único cartão de entidade na biblioteca da esquerda.
 * @param {object} entity - O objeto da entidade a ser renderizada.
 */
function renderEntityInLibrary(entity) {
    const list = document.getElementById('entity-list');
    const template = document.getElementById('entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.entity-card');

    card.dataset.entityId = entity.id;
    card.dataset.entityName = entity.name;
    // CORREÇÃO: Guarda a informação do ícone diretamente no dataset do elemento.
    card.dataset.entityIcon = entity.icon; 
    
    const iconEl = clone.querySelector('.entity-icon');
    if (iconsAvailable) {
        iconEl.setAttribute('data-lucide', entity.icon);
    } else {
        iconEl.style.display = 'none';
    }

    clone.querySelector('.entity-name').textContent = entity.name;
    
    if (!entity.predefined) {
        const deleteBtn = clone.querySelector('.delete-custom-entity-btn');
        deleteBtn.classList.remove('hidden');
    }
    
    list.appendChild(clone);
    tryCreateIcons();
}

/**
 * Carrega tanto as entidades predefinidas como as personalizadas guardadas no Firebase.
 */
async function loadAllEntities() {
    console.log("📚 A carregar todas as entidades...");
    document.getElementById('entity-list').innerHTML = '';
    
    predefinedEntities.forEach(renderEntityInLibrary);
    
    const customEntitiesRef = ref(db, 'custom_entities');
    const snapshot = await get(customEntitiesRef);
    if (snapshot.exists()) {
        const customEntities = snapshot.val();
        for (const entityId in customEntities) {
            renderEntityInLibrary({ ...customEntities[entityId], id: entityId });
        }
    }
}


function populateFieldsToolbox() {
    const toolbox = document.getElementById('fields-toolbox');
    const template = document.getElementById('toolbox-field-template');
    toolbox.innerHTML = '';
    fieldTypes.forEach(field => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.toolbox-item');
        item.dataset.fieldType = field.type;
        
        const iconEl = clone.querySelector('.field-icon');
        if (iconsAvailable) {
            iconEl.setAttribute('data-lucide', field.icon);
        } else {
            iconEl.style.display = 'none';
        }
        
        clone.querySelector('.field-name').textContent = field.name;
        toolbox.appendChild(clone);
    });
    tryCreateIcons();
}

function setupDragAndDrop() {
    const entityList = document.getElementById('entity-list');
    new Sortable(entityList, {
        group: { name: 'entities', pull: 'clone', put: false },
        sort: false,
        animation: 150,
    });

    document.querySelectorAll('.entities-dropzone').forEach(dropzone => {
        new Sortable(dropzone, {
            group: 'entities',
            animation: 150,
            onAdd: handleEntityDrop
        });
    });
    
    const fieldsToolbox = document.getElementById('fields-toolbox');
     new Sortable(fieldsToolbox, {
        group: { name: 'fields', pull: 'clone', put: false },
        sort: false,
        animation: 150,
    });
    
    const formBuilderDropzone = document.getElementById('form-builder-dropzone');
    new Sortable(formBuilderDropzone, {
        group: 'fields',
        animation: 150,
        onAdd: handleFieldDrop,
        handle: '[data-lucide="grip-vertical"]',
    });
}

function handleEntityDrop(event) {
    const { item, to } = event;
    const entityId = item.dataset.entityId;
    const entityName = item.dataset.entityName;
    // CORREÇÃO: Obtém o ícone diretamente do dataset do item arrastado.
    const entityIcon = item.dataset.entityIcon;
    const moduleEl = to.closest('.module-quadro');
    const moduleId = moduleEl.dataset.moduleId;

    if (moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)) {
        item.remove();
        Swal.fire({ icon: 'warning', title: 'Entidade já existe!', text: `A entidade '${entityName}' já foi adicionada a este módulo.`, timer: 2000, showConfirmButton: false });
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
       // CORREÇÃO: Usa o ícone obtido do dataset.
       iconEl.setAttribute('data-lucide', entityIcon);
    } else {
       iconEl.style.display = 'none';
    }

    clone.querySelector('.entity-name').textContent = entityName;
    
    item.replaceWith(clone);
    tryCreateIcons();

    const newCard = moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`);
    setTimeout(() => newCard.classList.remove('animate-pulse'), 500);
    
    saveEntityToModule(moduleId, entityId, entityName);
}

async function handleFieldDrop(event) {
    const { item } = event;
    const fieldType = item.dataset.fieldType;
    const fieldInfo = fieldTypes.find(f => f.type === fieldType);
    
    item.remove();

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: `Adicionar Campo: ${fieldInfo.name}`,
        html:
            `<input id="swal-input-label" class="swal2-input" placeholder="Nome do Campo (ex: Nome Fantasia)">` +
            `<input id="swal-input-placeholder" class="swal2-input" placeholder="Texto de ajuda (opcional)">` +
            (fieldType === 'select' ? `<input id="swal-input-options" class="swal2-input" placeholder="Opções separadas por vírgula">` : '') +
            `<div class="flex items-center justify-center mt-4"><input type="checkbox" id="swal-input-required" class="mr-2"><label for="swal-input-required">Campo obrigatório?</label></div>`,
        focusConfirm: false,
        preConfirm: () => {
            const label = document.getElementById('swal-input-label').value;
            if (!label) {
               Swal.showValidationMessage(`Por favor, insira um nome para o campo`);
               return false;
            }
            return {
                label: label,
                placeholder: document.getElementById('swal-input-placeholder').value,
                required: document.getElementById('swal-input-required').checked,
                options: fieldType === 'select' ? document.getElementById('swal-input-options').value.split(',').map(s => s.trim()).filter(Boolean) : []
            }
        }
    });

    if (isConfirmed && formValues) {
        const fieldData = { id: `field_${Date.now()}`, type: fieldType, ...formValues };
        renderFormField(fieldData);
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
    if (iconsAvailable) { iconEl.setAttribute('data-lucide', fieldInfo.icon); } else { iconEl.style.display = 'none'; }
    const handleEl = clone.querySelector('[data-lucide="grip-vertical"]');
    if (!iconsAvailable) { handleEl.style.display = 'none'; }
    clone.querySelector('.field-label').textContent = fieldData.label + (fieldData.required ? '*' : '');
    clone.querySelector('.field-type').textContent = fieldInfo.name;
    dropzone.appendChild(clone);
    tryCreateIcons();
}

function openModal(entityCard) {
    const modal = document.getElementById('entity-builder-modal');
    const modalContent = modal.querySelector('.bg-white');
    const title = document.getElementById('modal-title');
    const entityId = entityCard.dataset.entityId;
    const entityName = entityCard.dataset.entityName;
    const moduleId = entityCard.dataset.moduleId;

    title.textContent = `Editando a Entidade: ${entityName}`;
    modal.dataset.currentModuleId = moduleId;
    modal.dataset.currentEntityId = entityId;
    modal.dataset.currentEntityName = entityName;

    document.getElementById('form-builder-dropzone').innerHTML = '';
    loadStructureForEntity(moduleId, entityId);

    modal.classList.remove('hidden');
    setTimeout(() => { modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
}

function closeModal() {
    const modal = document.getElementById('entity-builder-modal');
    const modalContent = modal.querySelector('.bg-white');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function setupEventListeners() {
    document.body.addEventListener('click', e => {
        const configureBtn = e.target.closest('.configure-btn');
        if (configureBtn) { openModal(configureBtn.closest('.dropped-entity-card')); }

        const deleteEntityBtn = e.target.closest('.delete-entity-btn');
        if (deleteEntityBtn) {
            const card = deleteEntityBtn.closest('.dropped-entity-card');
            confirmAndRemoveEntityFromModule(card);
        }

        const deleteCustomEntityBtn = e.target.closest('.delete-custom-entity-btn');
        if (deleteCustomEntityBtn) {
            const card = deleteCustomEntityBtn.closest('.entity-card');
            confirmAndRemoveCustomEntity(card);
        }
    });
    
    document.getElementById('add-new-entity-btn').addEventListener('click', handleAddNewEntity);
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('save-structure-btn').addEventListener('click', saveCurrentStructure);

    document.getElementById('form-builder-dropzone').addEventListener('click', e => {
         const deleteBtn = e.target.closest('.delete-field-btn');
         if (deleteBtn) {
            Swal.fire({ title: 'Tem certeza?', text: "Não poderá reverter esta ação!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, eliminar!', cancelButtonText: 'Cancelar' }).then((result) => {
                if (result.isConfirmed) { deleteBtn.closest('.form-field-card').remove(); Swal.fire('Eliminado!', 'O campo foi removido.', 'success'); }
            });
         }
    });
}

// ==== NOVAS FUNÇÕES PARA CRIAR ENTIDADES ====

async function handleAddNewEntity() {
    const iconHtml = availableIcons.map(icon => 
        `<button class="icon-picker-btn p-2 rounded-md hover:bg-indigo-100" data-icon="${icon}">
            <i data-lucide="${icon}"></i>
        </button>`
    ).join('');

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Criar Nova Entidade',
        html: `
            <input id="swal-input-name" class="swal2-input" placeholder="Nome da Entidade (ex: Fornecedor)">
            <p class="text-sm mt-4 mb-2">Escolha um ícone:</p>
            <div id="swal-icon-grid" class="grid grid-cols-8 gap-2">${iconHtml}</div>
        `,
        focusConfirm: false,
        didOpen: () => {
            tryCreateIcons();
            document.getElementById('swal-icon-grid').addEventListener('click', e => {
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
        const customEntitiesRef = ref(db, 'custom_entities');
        const newEntityRef = push(customEntitiesRef);
        
        const newEntityData = {
            name: formValues.name,
            icon: formValues.icon,
            predefined: false
        };
        
        await set(newEntityRef, newEntityData);
        renderEntityInLibrary({ ...newEntityData, id: newEntityRef.key });
        Swal.fire('Criado!', 'A sua nova entidade está pronta para ser usada.', 'success');
    }
}

function confirmAndRemoveEntityFromModule(card) {
    const entityName = card.dataset.entityName;
    Swal.fire({ title: `Remover '${entityName}'?`, text: `Tem a certeza que deseja remover esta entidade do módulo?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, remover!', cancelButtonText: 'Cancelar' }).then((result) => {
        if (result.isConfirmed) {
            card.remove();
            deleteEntityFromModule(card.dataset.moduleId, card.dataset.entityId);
        }
    });
}

function confirmAndRemoveCustomEntity(card) {
    const entityId = card.dataset.entityId;
    const entityName = card.dataset.entityName;
    Swal.fire({ title: `Eliminar Entidade '${entityName}'?`, text: `Esta ação irá remover a entidade da biblioteca e de todos os módulos onde foi usada. Esta ação é PERMANENTE.`, icon: 'error', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, eliminar para sempre!', cancelButtonText: 'Cancelar' }).then(async (result) => {
        if (result.isConfirmed) {
            await remove(ref(db, `custom_entities/${entityId}`));
            const schemasRef = ref(db, 'schemas');
            const snapshot = await get(schemasRef);
            if (snapshot.exists()) {
                for (const moduleId in snapshot.val()) {
                   await set(ref(db, `schemas/${moduleId}/${entityId}`), null);
                }
            }
            card.remove();
            document.querySelectorAll(`.dropped-entity-card[data-entity-id="${entityId}"]`).forEach(c => c.remove());
            Swal.fire('Eliminado!', `A entidade '${entityName}' foi eliminada permanentemente.`, 'success');
        }
    });
}


// ==== INTERAÇÃO COM FIREBASE ====

async function deleteEntityFromModule(moduleId, entityId) {
    const path = `schemas/${moduleId}/${entityId}`;
    await set(ref(db, path), null);
    console.log(`✅ Entidade '${entityId}' removida do módulo '${moduleId}'.`);
}

async function saveEntityToModule(moduleId, entityId, entityName) {
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) {
        await set(dbRef, { entityName, attributes: [] });
    }
}

function saveCurrentStructure() {
    const modal = document.getElementById('entity-builder-modal');
    const { currentModuleId, currentEntityId, currentEntityName } = modal.dataset;
    const formBuilder = document.getElementById('form-builder-dropzone');
    const fieldCards = formBuilder.querySelectorAll('.form-field-card');
    const attributes = Array.from(fieldCards).map(card => JSON.parse(card.dataset.fieldData));
    const schema = { entityName: currentEntityName, attributes };
    const dbRef = ref(db, `schemas/${currentModuleId}/${currentEntityId}`);
    set(dbRef, schema).then(() => {
        Swal.fire({ icon: 'success', title: 'Guardado!', text: `A estrutura da entidade '${currentEntityName}' foi guardada.`, timer: 2000, showConfirmButton: false });
        closeModal();
    }).catch(error => {
        console.error("❌ Erro ao guardar no Firebase:", error);
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Algo correu mal ao guardar a estrutura!' });
    });
}

async function loadModuleStateFromFirebase() {
     const schemasRef = ref(db, 'schemas');
     const snapshot = await get(schemasRef);
     if (snapshot.exists()) {
        const schemas = snapshot.val();
        for (const moduleId in schemas) {
            const moduleEl = document.querySelector(`.module-quadro[data-module-id="${moduleId}"]`);
            if(moduleEl) {
                const dropzone = moduleEl.querySelector('.entities-dropzone');
                for(const entityId in schemas[moduleId]) {
                    if (!schemas[moduleId][entityId]) continue; 
                    
                    const allEntitiesSnapshot = await get(ref(db, 'custom_entities'));
                    const allEntities = [...predefinedEntities, ...Object.entries(allEntitiesSnapshot.val() || {}).map(([id, data]) => ({...data, id}))];
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
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const schema = snapshot.val();
        if (schema.attributes && schema.attributes.length > 0) {
            schema.attributes.forEach(attr => renderFormField(attr));
        }
    }
}
