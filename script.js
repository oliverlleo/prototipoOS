/*
================================================================================
|| INSTRUÇÕES IMPORTANTES PARA O CÓDIGO FUNCIONAR ||
================================================================================

Olá! Se a aplicação não está a funcionar, provavelmente é por um dos dois motivos abaixo. Por favor, leia com atenção:

--------------------------------------------------------------------------------
1. NECESSIDADE DE UM SERVIDOR WEB LOCAL
--------------------------------------------------------------------------------
Este projeto usa Módulos JavaScript (`import`). Por razões de segurança (CORS), os navegadores não permitem que ficheiros HTML que usam módulos carreguem outros ficheiros quando abertos diretamente do seu computador (usando o caminho `file:///...`).

**SOLUÇÃO:** Você precisa de servir os ficheiros através de um servidor web local. É muito simples:
  - Se usa o Visual Studio Code:
    1. Instale a extensão "Live Server".
    2. Clique com o botão direito no seu ficheiro `index.html`.
    3. Selecione "Open with Live Server".
    4. Isto abrirá o projeto no seu navegador com um endereço como `http://127.0.0.1:5500`, e tudo deverá funcionar.

  - Se não usa o VS Code, pode usar o Python (se o tiver instalado):
    1. Abra o terminal na pasta do seu projeto.
    2. Execute o comando: `python -m http.server`
    3. Abra o seu navegador e aceda a `http://localhost:8000`.

--------------------------------------------------------------------------------
2. REGRAS DE SEGURANÇA DO FIREBASE REALTIME DATABASE
--------------------------------------------------------------------------------
Por defeito, o Firebase não permite que qualquer pessoa leia ou escreva no seu banco de dados. Para um protótipo como este, precisamos de tornar as regras públicas.

**SOLUÇÃO:**
  1. Vá ao seu projeto na consola do Firebase (https://console.firebase.google.com/).
  2. No menu à esquerda, vá a "Realtime Database".
  3. No topo, clique na aba "Regras" (Rules).
  4. Substitua o conteúdo existente por isto:
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
  5. Clique em "Publicar". As alterações podem levar alguns segundos a propagar-se.

Após seguir estes dois passos, a aplicação deverá funcionar como esperado.
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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

// ==== INICIALIZAÇÃO DA UI ====

document.addEventListener('DOMContentLoaded', () => {
    // Ativa os ícones do Lucide
    lucide.createIcons();
    
    // Popula as bibliotecas com os dados iniciais
    populateEntityLibrary();
    populateFieldsToolbox();

    // Configura toda a lógica de arrastar e soltar
    setupDragAndDrop();
    
    // Carrega o estado salvo do Firebase ao iniciar
    loadStateFromFirebase();

    // Adiciona os listeners de eventos para cliques e outras interações
    setupEventListeners();
});

function populateEntityLibrary() {
    const list = document.getElementById('entity-list');
    const template = document.getElementById('entity-card-template');
    list.innerHTML = ''; // Limpa a lista para evitar duplicação
    initialEntities.forEach(entity => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.entity-card');
        card.dataset.entityId = entity.id;
        card.dataset.entityName = entity.name;
        clone.querySelector('.entity-icon').setAttribute('data-lucide', entity.icon);
        clone.querySelector('.entity-name').textContent = entity.name;
        list.appendChild(clone);
    });
    lucide.createIcons(); // Recria ícones após adicionar novos elementos
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
    // 1. Arrastar da Biblioteca de Entidades para os Módulos
    const entityList = document.getElementById('entity-list');
    new Sortable(entityList, {
        group: {
            name: 'entities',
            pull: 'clone', // Clona o item em vez de mover
            put: false
        },
        sort: false, // Não permite reordenar na biblioteca
        animation: 150,
    });

    document.querySelectorAll('.entities-dropzone').forEach(dropzone => {
        new Sortable(dropzone, {
            group: 'entities',
            animation: 150,
            onAdd: handleEntityDrop // Função chamada quando uma entidade é solta aqui
        });
    });
    
    // 2. Arrastar da Toolbox de Campos para o Construtor de Formulário
    const fieldsToolbox = document.getElementById('fields-toolbox');
     new Sortable(fieldsToolbox, {
        group: {
            name: 'fields',
            pull: 'clone',
            put: false
        },
        sort: false,
        animation: 150,
    });
    
    const formBuilderDropzone = document.getElementById('form-builder-dropzone');
    new Sortable(formBuilderDropzone, {
        group: 'fields',
        animation: 150,
        onAdd: handleFieldDrop, // Função chamada quando um campo é solto aqui
        handle: '[data-lucide="grip-vertical"]', // Define o ícone como "alça" para reordenar
    });
}

function handleEntityDrop(event) {
    const { item, to } = event;
    const entityId = item.dataset.entityId;
    const entityName = item.dataset.entityName;
    const moduleEl = to.closest('.module-quadro');
    const moduleId = moduleEl.dataset.moduleId;

    // Previne que a mesma entidade seja adicionada duas vezes ao mesmo módulo
    if (moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`)) {
        item.remove(); // Remove o clone arrastado
        Swal.fire({
            icon: 'warning',
            title: 'Entidade já existe!',
            text: `A entidade '${entityName}' já foi adicionada a este módulo.`,
            timer: 2000,
            showConfirmButton: false
        });
        return;
    }
    
    // Substitui o item clonado da biblioteca por um template customizado para a área de drop
    const template = document.getElementById('dropped-entity-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.dropped-entity-card');
    
    card.dataset.entityId = entityId;
    card.dataset.entityName = entityName;
    card.dataset.moduleId = moduleId;
    
    const entityInfo = initialEntities.find(e => e.id === entityId);
    clone.querySelector('.entity-icon').setAttribute('data-lucide', entityInfo.icon);
    clone.querySelector('.entity-name').textContent = entityName;
    
    item.replaceWith(clone); // Troca o item arrastado pelo template final
    lucide.createIcons();

    // Adiciona uma animação e a remove após um tempo para feedback visual
    const newCard = moduleEl.querySelector(`.dropped-entity-card[data-entity-id="${entityId}"]`);
    setTimeout(() => newCard.classList.remove('animate-pulse'), 500);
    
    saveEntityToModule(moduleId, entityId, entityName);
}

async function handleFieldDrop(event) {
    const { item } = event;
    const fieldType = item.dataset.fieldType;
    const fieldInfo = fieldTypes.find(f => f.type === fieldType);
    
    item.remove(); // Remove o item da toolbox que foi clonado

    // Usa SweetAlert2 para criar um formulário de configuração do campo
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
            id: `field_${Date.now()}`, // ID único baseado no tempo
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
    card.dataset.fieldData = JSON.stringify(fieldData); // Armazena todos os dados do campo no próprio elemento

    const fieldInfo = fieldTypes.find(f => f.type === fieldData.type);
    clone.querySelector('.field-icon').setAttribute('data-lucide', fieldInfo.icon);
    clone.querySelector('.field-label').textContent = fieldData.label + (fieldData.required ? '*' : ''); // Adiciona * se for obrigatório
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
    
    // Armazena o contexto atual (módulo e entidade) no modal para usar ao salvar
    modal.dataset.currentModuleId = moduleId;
    modal.dataset.currentEntityId = entityId;
    modal.dataset.currentEntityName = entityName;

    // Limpa o construtor anterior e carrega a estrutura já salva para esta entidade
    document.getElementById('form-builder-dropzone').innerHTML = '';
    loadStructureForEntity(moduleId, entityId);

    modal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
    }, 10); // Pequeno delay para a animação CSS funcionar
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
    // Abrir e fechar o modal do construtor
    document.body.addEventListener('click', e => {
        const configureBtn = e.target.closest('.configure-btn');
        if (configureBtn) {
            const card = configureBtn.closest('.dropped-entity-card');
            openModal(card);
        }
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('save-structure-btn').addEventListener('click', saveCurrentStructure);

    // Deletar e editar campos no construtor
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
            // A lógica de edição pode ser implementada aqui, abrindo um modal similar ao de criação
            alert('Função de edição a ser implementada!');
         }
    });
}

// ==== INTERAÇÃO COM FIREBASE REALTIME DATABASE ====

async function saveEntityToModule(moduleId, entityId, entityName) {
    // Salva um placeholder para a estrutura da entidade no banco de dados.
    // Isso garante que a entidade exista no módulo antes mesmo de ser configurada.
    const path = `schemas/${moduleId}/${entityId}`;
    const existingData = await get(ref(db, path));
    if (!existingData.exists()) {
        await set(ref(db, path), {
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

    // Mapeia os cards do formulário para um array de objetos de atributos
    const attributes = Array.from(fieldCards).map(card => {
        return JSON.parse(card.dataset.fieldData);
    });

    const schema = {
        entityName,
        attributes
    };
    
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
            console.error("Erro ao guardar no Firebase: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Algo correu mal ao guardar a estrutura!'
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
                    
                     // Renderiza o card da entidade no módulo correspondente
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
     }
}

async function loadStructureForEntity(moduleId, entityId) {
    const path = `schemas/${moduleId}/${entityId}`;
    const snapshot = await get(ref(db, path));

    if (snapshot.exists()) {
        const schema = snapshot.val();
        // Se a entidade tiver atributos guardados, renderiza cada um deles no construtor
        if (schema.attributes && schema.attributes.length > 0) {
            schema.attributes.forEach(attr => renderFormField(attr));
        }
    }
}
