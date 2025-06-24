/*
================================================================================
|| SCRIPT.JS - VERSÃO ROBUSTA E CORRIGIDA ||
================================================================================
Este script foi reestruturado para ser mais resiliente. Ele espera que a página
inteira carregue (`window.onload`) e trata a biblioteca de ícones (Lucide) como
opcional. Se os ícones não carregarem, a aplicação arranca na mesma, garantindo
que a funcionalidade principal nunca é bloqueada.
================================================================================
*/

// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Configuração do Firebase fornecida pelo usuário
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
let iconsAvailable = false; // Flag para controlar se os ícones estão disponíveis

// ==== DADOS DE CONFIGURAÇÃO INICIAL ====
const initialEntities = [
    { id: 'cliente', name: 'Cliente', icon: 'user-round' },
    { id: 'proposta', name: 'Proposta', icon: 'file-text' },
    { id: 'produto', name: 'Produto', icon: 'package' },
    { id: 'chamado', name: 'Chamado', icon: 'phone' },
];

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

/**
 * A função `initApp` é o coração da aplicação.
 * É chamada pelo evento `window.onload`, garantindo que todo o HTML, CSS, imagens e
 * scripts externos estejam completamente carregados.
 */
async function initApp() {
    console.log("🚀 A aplicação está a iniciar...");

    // 1. Verifica se a biblioteca de ícones carregou
    if (typeof lucide !== 'undefined' && lucide) {
        iconsAvailable = true;
        console.log("✨ Ícones (Lucide) disponíveis.");
    } else {
        console.warn("⚠️ A biblioteca de ícones (Lucide) não carregou. A aplicação continuará sem ícones.");
    }

    // 2. Inicializa o Firebase
    try {
        const appFirebase = initializeApp(firebaseConfig);
        db = getDatabase(appFirebase);
        console.log("✅ Firebase inicializado com sucesso.");
    } catch (error) {
        console.error("❌ ERRO CRÍTICO AO INICIALIZAR O FIREBASE:", error);
        document.getElementById('loading-overlay').innerHTML = 'Erro ao ligar à base de dados.';
        return; // Para a execução se o Firebase falhar
    }

    // 3. Inicializa a UI
    if (iconsAvailable) {
        lucide.createIcons();
    }
    
    populateEntityLibrary();
    populateFieldsToolbox();
    console.log("📚 Bibliotecas populadas.");

    setupDragAndDrop();
    console.log("🛠️ Funcionalidade de arrastar e soltar configurada.");

    setupEventListeners();
    console.log("🎧 Listeners de eventos configurados.");
    
    // 4. Carrega os dados guardados do Firebase
    try {
        await loadStateFromFirebase();
        console.log("✅ Estado carregado com sucesso do Firebase!");
    } catch (error) {
        console.error("❌ Erro ao carregar o estado do Firebase:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Carregar Dados',
            text: 'Não foi possível carregar as configurações guardadas. Verifique as regras de segurança do seu Firebase e a consola (F12) para mais detalhes.',
        });
    }

    // 5. Mostra a aplicação e esconde o carregamento
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app');
    
    loadingOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
    console.log("👍 Aplicação pronta e visível!");
}

// Atribui a função initApp ao evento `window.onload`
window.onload = initApp;


// ---- Funções de Suporte ----

function tryCreateIcons() {
    if (iconsAvailable) {
        lucide.createIcons();
    }
}

function populateEntityLibrary() {
    const list = document.getElementById('entity-list');
    const template = document.getElementById('entity-card-template');
    list.innerHTML = '';
    initialEntities.forEach(entity => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.entity-card');
        card.dataset.entityId = entity.id;
        card.dataset.entityName = entity.name;
        
        const iconEl = clone.querySelector('.entity-icon');
        if (iconsAvailable) {
            iconEl.setAttribute('data-lucide', entity.icon);
        } else {
            iconEl.style.display = 'none'; // Esconde o elemento do ícone
        }

        clone.querySelector('.entity-name').textContent = entity.name;
        list.appendChild(clone);
    });
    tryCreateIcons();
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
        // CORREÇÃO: O 'handle' foi reintroduzido para permitir a reordenação dos campos existentes.
        handle: '[data-lucide="grip-vertical"]', 
    });
}

function handleEntityDrop(event) {
    const { item, to } = event;
    const entityId = item.dataset.entityId;
    const entityName = item.dataset.entityName;
    const moduleEl = to.closest('.module-quadro');
    const moduleId = moduleEl.dataset.moduleId;

    if (moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)) {
        item.remove();
        Swal.fire({
            icon: 'warning',
            title: 'Entidade já existe!',
            text: `A entidade '${entityName}' já foi adicionada a este módulo.`,
            timer: 2000,
            showConfirmButton: false
        });
        return;
    }
    
    const template = document.getElementById('dropped-entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.dropped-entity-card');
    
    card.dataset.entityId = entityId;
    card.dataset.entityName = entityName;
    card.dataset.moduleId = moduleId;
    
    const entityInfo = initialEntities.find(e => e.id === entityId);
    
    const iconEl = clone.querySelector('.entity-icon');
    if (iconsAvailable) {
       iconEl.setAttribute('data-lucide', entityInfo.icon);
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
        const fieldData = {
            id: `field_${Date.now()}`,
            type: fieldType,
            ...formValues
        };
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
    if (iconsAvailable) {
        iconEl.setAttribute('data-lucide', fieldInfo.icon);
    } else {
        iconEl.style.display = 'none';
    }
    
    // Adiciona a alça de arrastar apenas se os ícones estiverem disponíveis
    const handleEl = clone.querySelector('[data-lucide="grip-vertical"]');
    if (!iconsAvailable) {
        handleEl.style.display = 'none';
    }
    
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
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('entity-builder-modal');
    const modalContent = modal.querySelector('.bg-white');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function setupEventListeners() {
    document.body.addEventListener('click', e => {
        const configureBtn = e.target.closest('.configure-btn');
        if (configureBtn) {
            const card = configureBtn.closest('.dropped-entity-card');
            openModal(card);
        }

        // NOVO: Listener para o botão de eliminar entidade
        const deleteEntityBtn = e.target.closest('.delete-entity-btn');
        if (deleteEntityBtn) {
            const card = deleteEntityBtn.closest('.dropped-entity-card');
            const entityName = card.dataset.entityName;
            const moduleId = card.dataset.moduleId;
            const entityId = card.dataset.entityId;

            Swal.fire({
                title: `Tem a certeza?`,
                text: `Deseja remover a entidade '${entityName}' deste módulo? Esta ação não pode ser revertida.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, remover!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    card.remove();
                    deleteEntityFromModule(moduleId, entityId);
                    Swal.fire('Removido!', `A entidade '${entityName}' foi removida.`, 'success');
                }
            });
        }
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('save-structure-btn').addEventListener('click', saveCurrentStructure);

    document.getElementById('form-builder-dropzone').addEventListener('click', e => {
         const deleteBtn = e.target.closest('.delete-field-btn');
         if (deleteBtn) {
            Swal.fire({
                title: 'Tem certeza?',
                text: "Não poderá reverter esta ação!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, eliminar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteBtn.closest('.form-field-card').remove();
                    Swal.fire('Eliminado!', 'O campo foi removido.', 'success');
                }
            });
         }
         
         const editBtn = e.target.closest('.edit-field-btn');
         if(editBtn) {
            alert('Função de edição a ser implementada!');
         }
    });
}

// ==== INTERAÇÃO COM FIREBASE REALTIME DATABASE ====

async function saveEntityToModule(moduleId, entityId, entityName) {
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) {
        await set(dbRef, {
            entityName: entityName,
            attributes: []
        });
    }
}

/**
 * NOVO: Remove uma entidade inteira do Firebase.
 * @param {string} moduleId - O ID do módulo.
 * @param {string} entityId - O ID da entidade a ser removida.
 */
async function deleteEntityFromModule(moduleId, entityId) {
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    try {
        await set(dbRef, null); // Definir o valor como null remove o nó no Realtime Database
        console.log(`✅ Entidade '${entityId}' removida com sucesso do módulo '${moduleId}'.`);
    } catch (error) {
        console.error(`❌ Erro ao remover a entidade '${entityId}':`, error);
        Swal.fire('Erro', 'Ocorreu um problema ao remover a entidade da base de dados.', 'error');
    }
}

function saveCurrentStructure() {
    const modal = document.getElementById('entity-builder-modal');
    const moduleId = modal.dataset.currentModuleId;
    const entityId = modal.dataset.currentEntityId;
    const entityName = modal.dataset.currentEntityName;

    const formBuilder = document.getElementById('form-builder-dropzone');
    const fieldCards = formBuilder.querySelectorAll('.form-field-card');

    const attributes = Array.from(fieldCards).map(card => {
        return JSON.parse(card.dataset.fieldData);
    });

    const schema = { entityName, attributes };
    const dbRef = ref(db, `schemas/${moduleId}/${entityId}`);
    
    set(dbRef, schema)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Guardado com sucesso!',
                text: `A estrutura da entidade '${entityName}' foi guardada.`,
                timer: 2000,
                showConfirmButton: false
            });
            closeModal();
        })
        .catch(error => {
            console.error("❌ Erro ao guardar no Firebase:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Algo correu mal ao guardar a estrutura! Verifique a consola (F12).'
            });
        });
}

async function loadStateFromFirebase() {
     const schemasRef = ref(db, 'schemas');
     const snapshot = await get(schemasRef);
     if (snapshot.exists()) {
        const schemas = snapshot.val();
        for (const moduleId in schemas) {
            const moduleEl = document.querySelector(`.module-quadro[data-module-id="${moduleId}"]`);
            if(moduleEl) {
                const dropzone = moduleEl.querySelector('.entities-dropzone');
                for(const entityId in schemas[moduleId]) {
                    const entityData = schemas[moduleId][entityId];
                    
                    const template = document.getElementById('dropped-entity-card-template');
                    const clone = template.content.cloneNode(true);
                    const card = clone.querySelector('.dropped-entity-card');
                    
                    card.dataset.entityId = entityId;
                    card.dataset.entityName = entityData.entityName;
                    card.dataset.moduleId = moduleId;
                    
                    const entityInfo = initialEntities.find(e => e.id === entityId);
                    
                    const iconEl = clone.querySelector('.entity-icon');
                    if (iconsAvailable && entityInfo) {
                       iconEl.setAttribute('data-lucide', entityInfo.icon);
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
