/*
================================================================================
|| INSTRUÇÕES DE DIAGNÓSTICO ||
================================================================================

Olá! Se o construtor ainda não funciona, estes passos ajudar-nos-ão a descobrir porquê.

O passo mais importante é verificar a "Consola do Desenvolvedor" do seu navegador.

COMO ABRIR A CONSOLA:
  - No Chrome, Firefox ou Edge: Pressione a tecla F12 e clique na aba "Consola".
  - No Safari: Vá a Preferências > Avançado e ative "Mostrar menu Desenvolver na barra de menus". Depois, pode usar o atalho Option + ⌘ + C.

O QUE PROCURAR NA CONSOLA:
  1. Procure por mensagens a vermelho (erros). Elas dir-nos-ão exatamente o que está a falhar.
  2. Veja se as minhas mensagens de diagnóstico aparecem. Você deverá ver algo como:
     - "Firebase inicializado com sucesso."
     - "A configurar a funcionalidade de arrastar e soltar..."
     - "A carregar o estado do Firebase..."
     - "Estado carregado com sucesso!" ou "Erro ao carregar o estado do Firebase: ..."

Se vir um erro, ele geralmente indica o problema (ex: problema com as regras do Firebase, falha de rede, etc.).
Lembre-se que continua a ser essencial usar um servidor local (como a extensão "Live Server") e ter as regras do Firebase como públicas.

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

// ==== INICIALIZAÇÃO E DIAGNÓSTICO ====
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("✅ Firebase inicializado com sucesso.");
} catch (error) {
    console.error("❌ ERRO CRÍTICO AO INICIALIZAR O FIREBASE:", error);
    Swal.fire({
        icon: 'error',
        title: 'Erro de Conexão com o Firebase',
        text: 'Não foi possível ligar à base de dados. Verifique a consola (F12) para mais detalhes.',
    });
}


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

// ==== FUNÇÃO PRINCIPAL DA APLICAÇÃO ====

/**
 * Esta é a função principal que executa toda a lógica da aplicação.
 * Só é chamada depois de termos a certeza que o Firebase e a biblioteca de ícones (Lucide) estão prontos.
 */
async function startApp() {
    if (!db) {
        console.error("A base de dados não foi inicializada. A aplicação não pode continuar.");
        return;
    }

    console.log("🚀 A iniciar a lógica principal da aplicação...");
    
    // Ativa os ícones do Lucide
    lucide.createIcons();
    
    // Popula as bibliotecas com os dados iniciais
    populateEntityLibrary();
    populateFieldsToolbox();

    // Configura toda a lógica de arrastar e soltar
    setupDragAndDrop();
    
    // Carrega o estado salvo do Firebase ao iniciar
    console.log("⏳ A carregar o estado do Firebase...");
    try {
        await loadStateFromFirebase();
        console.log("✅ Estado carregado com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao carregar o estado do Firebase:", error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Carregar Dados',
            text: 'Não foi possível carregar as configurações guardadas. Verifique a consola (F12) para mais detalhes.',
        });
    }

    // Adiciona os listeners de eventos para cliques e outras interações
    setupEventListeners();
}


// ==== PONTO DE ENTRADA DA APLICAÇÃO (CORRIGIDO) ====

/**
 * Espera que o DOM esteja pronto e depois verifica se as dependências (Lucide) estão carregadas
 * antes de iniciar a aplicação.
 */
document.addEventListener('DOMContentLoaded', () => {
    waitForDependenciesAndStart();
});

/**
 * Verifica repetidamente se as dependências externas, como a biblioteca de ícones,
 * estão prontas para serem usadas.
 */
function waitForDependenciesAndStart() {
    const maxRetries = 50; // Tenta por 5 segundos (50 * 100ms)
    let retries = 0;

    const check = setInterval(() => {
        // Verificação mais robusta: garante que 'lucide' existe e tem o método 'createIcons'.
        if (typeof lucide !== 'undefined' && lucide && typeof lucide.createIcons === 'function') {
            clearInterval(check); // Para a verificação
            console.log("✨ Biblioteca Lucide carregada e pronta. A iniciar a aplicação.");
            startApp(); // Inicia a aplicação principal
        } else {
            retries++;
            if (retries > maxRetries) {
                // Se exceder o tempo limite, para a verificação e informa o utilizador.
                clearInterval(check);
                console.error("❌ A biblioteca de ícones (Lucide) não conseguiu carregar após 5 segundos. A aplicação não pode continuar.");
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de Carregamento',
                    text: 'Não foi possível carregar a biblioteca de ícones. Verifique a sua ligação à internet e a consola (F12) para erros de rede.',
                });
            } else {
                console.log(`⌛ A aguardar pela biblioteca de ícones (Lucide)... Tentativa ${retries}/${maxRetries}`);
            }
        }
    }, 100); // Verifica a cada 100 milissegundos
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
        clone.querySelector('.entity-icon').setAttribute('data-lucide', entity.icon);
        clone.querySelector('.entity-name').textContent = entity.name;
        list.appendChild(clone);
    });
    lucide.createIcons();
}

function populateFieldsToolbox() {
    const toolbox = document.getElementById('fields-toolbox');
    const template = document.getElementById('toolbox-field-template');
    toolbox.innerHTML = '';
    fieldTypes.forEach(field => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.toolbox-item');
        item.dataset.fieldType = field.type;
        clone.querySelector('.field-icon').setAttribute('data-lucide', field.icon);
        clone.querySelector('.field-name').textContent = field.name;
        toolbox.appendChild(clone);
    });
    lucide.createIcons();
}

// ==== LÓGICA DE DRAG-AND-DROP ====

function setupDragAndDrop() {
    console.log("🛠️ A configurar a funcionalidade de arrastar e soltar...");
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
    console.log("👍 Funcionalidade de arrastar e soltar configurada.");
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
    clone.querySelector('.entity-icon').setAttribute('data-lucide', entityInfo.icon);
    clone.querySelector('.entity-name').textContent = entityName;
    
    item.replaceWith(clone);
    lucide.createIcons();

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

// ==== RENDERIZAÇÃO E MANIPULAÇÃO DA UI ====

function renderFormField(fieldData) {
    const dropzone = document.getElementById('form-builder-dropzone');
    const template = document.getElementById('form-field-template');
    const clone = template.content.cloneNode(true);

    const card = clone.querySelector('.form-field-card');
    card.dataset.fieldId = fieldData.id;
    card.dataset.fieldData = JSON.stringify(fieldData);

    const fieldInfo = fieldTypes.find(f => f.type === fieldData.type);
    clone.querySelector('.field-icon').setAttribute('data-lucide', fieldInfo.icon);
    clone.querySelector('.field-label').textContent = fieldData.label + (fieldData.required ? '*' : '');
    clone.querySelector('.field-type').textContent = fieldInfo.name;

    dropzone.appendChild(clone);
    lucide.createIcons();
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
    console.log("🎧 A configurar os listeners de eventos...");
    document.body.addEventListener('click', e => {
        const configureBtn = e.target.closest('.configure-btn');
        if (configureBtn) {
            const card = configureBtn.closest('.dropped-entity-card');
            openModal(card);
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
    console.log("👍 Listeners de eventos configurados.");
}

// ==== INTERAÇÃO COM FIREBASE REALTIME DATABASE ====

async function saveEntityToModule(moduleId, entityId, entityName) {
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) {
        console.log(`A criar placeholder para a entidade '${entityName}' no módulo '${moduleId}'.`);
        await set(dbRef, {
            entityName: entityName,
            attributes: []
        });
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
    
    console.log(`💾 A guardar a estrutura para '${entityName}'...`);
    set(dbRef, schema)
        .then(() => {
            console.log("✅ Estrutura guardada com sucesso.");
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
        console.log("🔎 Foram encontradas estruturas guardadas no Firebase. A renderizá-las...");
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
                    clone.querySelector('.entity-icon').setAttribute('data-lucide', entityInfo?.icon || 'help-circle');
                    clone.querySelector('.entity-name').textContent = entityData.entityName;
                    card.classList.remove('animate-pulse');

                    dropzone.appendChild(clone);
                }
            }
        }
        lucide.createIcons();
     } else {
        console.log("ℹ️ Nenhuma estrutura encontrada no Firebase para carregar.");
     }
}

async function loadStructureForEntity(moduleId, entityId) {
    const path = `schemas/${moduleId}/${entityId}`;
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
        const schema = snapshot.val();
        if (schema.attributes && schema.attributes.length > 0) {
            console.log(`Renderizando ${schema.attributes.length} campo(s) para a entidade '${entityId}'.`);
            schema.attributes.forEach(attr => renderFormField(attr));
        } else {
            console.log(`A entidade '${entityId}' não tem campos configurados.`);
        }
    }
}
