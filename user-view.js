// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, get, push } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Evento que dispara quando o conteúdo HTML da página está pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa ícones
    if (typeof lucide !== 'undefined' && lucide) {
        lucide.createIcons();
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('path'); 

    if (!path) {
        document.getElementById('view-container').style.display = 'none';
        document.getElementById('help-container').classList.remove('hidden');
    } else {
        document.getElementById('help-container').style.display = 'none';
        
        // Anima a transição de entrada
        setTimeout(() => {
            document.getElementById('view-container').classList.remove('opacity-0');
        }, 100);
        
        loadAndRenderForm(path);
    }
    
    document.getElementById('save-data-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if(path) {
            saveFormData(path);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Nenhum caminho de entidade especificado para guardar os dados.',
                customClass: {
                    popup: 'shadow-xl rounded-xl'
                }
            });
        }
    });
});

/**
 * Carrega o esquema e constrói o formulário na página.
 * @param {string} path - O caminho para o esquema, ex: 'vendas/cliente'
 */
async function loadAndRenderForm(path) {
    try {
        const [moduleId, entityId] = path.split('/');
        if (!moduleId || !entityId) {
            throw new Error('Caminho inválido');
        }
        
        const schemaRef = ref(db, `schemas/${moduleId}/${entityId}`);
        const snapshot = await get(schemaRef);
        
        if (!snapshot.exists()) {
            document.getElementById('form-loading').innerHTML = `
                <div class="bg-red-100 p-3 rounded-full text-red-600 mb-3">
                    <i data-lucide="x-circle" class="h-8 w-8"></i>
                </div>
                <h3 class="text-lg font-semibold text-red-700 mb-1">Estrutura não encontrada</h3>
                <p class="text-slate-600">A estrutura para '${path}' não existe. Verifique o caminho na URL e certifique-se de ter salvo a estrutura no construtor.</p>
            `;
            
            if (typeof lucide !== 'undefined' && lucide) {
                lucide.createIcons();
            }
            
            document.getElementById('form-title').textContent = "Erro 404";
            document.getElementById('save-data-btn').disabled = true;
            document.getElementById('save-data-btn').classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }
        
        const schema = snapshot.val();
        document.getElementById('form-title').textContent = `Formulário de ${schema.entityName}`;
        document.getElementById('dynamic-form').innerHTML = '';

        if (!schema.attributes || schema.attributes.length === 0) {
            document.getElementById('dynamic-form').innerHTML = `
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
            
            document.getElementById('save-data-btn').disabled = true;
            document.getElementById('save-data-btn').classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }
        
        // Usa Promise.all para esperar que todos os campos, incluindo os de relacionamento, sejam criados.
        const fieldPromises = schema.attributes.map(attr => createFieldHtml(attr));
        const fieldHtmls = await Promise.all(fieldPromises);
        document.getElementById('dynamic-form').innerHTML = fieldHtmls.join('');
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error("Erro ao carregar formulário:", error);
        document.getElementById('dynamic-form').innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                <div class="bg-red-100 p-3 rounded-full inline-flex items-center justify-center text-red-600 mb-3">
                    <i data-lucide="alert-circle" class="h-6 w-6"></i>
                </div>
                <h3 class="text-lg font-semibold text-red-800 mb-1">Erro ao carregar formulário</h3>
                <p class="text-red-700">${error.message || 'Ocorreu um erro inesperado. Tente novamente mais tarde.'}</p>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide) {
            lucide.createIcons();
        }
        
        document.getElementById('save-data-btn').disabled = true;
        document.getElementById('save-data-btn').classList.add('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Cria o HTML para um único campo. Para relacionamentos, esta função é assíncrona.
 * @param {object} attr - O objeto de atributo do esquema.
 * @returns {Promise<string>} - Uma promessa que resolve para o HTML do campo.
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

/**
 * Recolhe os dados do formulário e guarda-os no Firebase.
 * @param {string} path - O caminho da entidade onde os dados serão guardados.
 */
function saveFormData(path) {
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
    
    const dataRef = ref(db, `data/${path}`);
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