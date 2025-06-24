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
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('path'); 

    if (!path) {
        document.getElementById('view-container').style.display = 'none';
        document.getElementById('help-container').classList.remove('hidden');
    } else {
        document.getElementById('help-container').style.display = 'none';
        document.getElementById('view-container').classList.remove('opacity-0');
        loadAndRenderForm(path);
    }
    
    document.getElementById('save-data-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if(path) {
            saveFormData(path);
        } else {
            Swal.fire('Erro', 'Nenhum caminho de entidade especificado para guardar os dados.', 'error');
        }
    });
});

/**
 * Carrega o esquema e constrói o formulário na página.
 * @param {string} path - O caminho para o esquema, ex: 'vendas/cliente'
 */
async function loadAndRenderForm(path) {
    const schemaRef = ref(db, `schemas/${path}`);
    const snapshot = await get(schemaRef);

    if (!snapshot.exists()) {
         document.getElementById('form-title').textContent = "Erro 404";
         document.getElementById('dynamic-form').innerHTML = `<p class="text-red-500">A estrutura para '${path}' não foi encontrada. Verifique o caminho na URL e se guardou a estrutura no construtor.</p>`;
         document.getElementById('save-data-btn').disabled = true;
         return;
    }
    
    const schema = snapshot.val();
    document.getElementById('form-title').textContent = `Registo de ${schema.entityName}`;
    const formContainer = document.getElementById('dynamic-form');
    formContainer.innerHTML = '';

    if (schema.attributes) {
        // Usa Promise.all para esperar que todos os campos, incluindo os de relacionamento, sejam criados.
        const fieldPromises = schema.attributes.map(attr => createFieldHtml(attr));
        const fieldHtmls = await Promise.all(fieldPromises);
        formContainer.innerHTML = fieldHtmls.join('');
    } else {
        formContainer.innerHTML = `<p class="text-slate-500">Esta entidade ainda não tem campos configurados.</p>`;
        document.getElementById('save-data-btn').disabled = true;
    }
}

/**
 * Cria o HTML para um único campo. Para relacionamentos, esta função é assíncrona.
 * @param {object} attr - O objeto de atributo do esquema.
 * @returns {Promise<string>} - Uma promessa que resolve para o HTML do campo.
 */
async function createFieldHtml(attr) {
    const requiredLabel = attr.required ? '<span class="text-red-500">*</span>' : '';
    const baseInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200";
    
    let field = `<div><label for="${attr.id}" class="block text-sm font-medium text-slate-700">${attr.label} ${requiredLabel}</label>`;

    switch(attr.type) {
        case 'relationship':
            field += `<select id="${attr.id}" name="${attr.id}" class="${baseInputClasses}" ${attr.required ? 'required' : ''}>`;
            field += `<option value="">Carregando registos...</option>`;
            
            // Procura os dados da entidade relacionada em todos os módulos
            const dataRef = ref(db, 'data');
            const dataSnapshot = await get(dataRef);
            if(dataSnapshot.exists()) {
                const allData = dataSnapshot.val();
                let optionsHtml = '';
                for (const moduleId in allData) {
                    if (allData[moduleId][attr.targetEntityId]) {
                        const records = allData[moduleId][attr.targetEntityId];
                        for(const recordId in records) {
                            // Tenta encontrar um campo de nome óbvio para exibir na dropdown
                            const recordData = records[recordId];
                            const displayName = recordData.Nome || recordData.name || recordData.Título || recordData.titulo || recordData.Label || recordData.label || recordId;
                            optionsHtml += `<option value="${recordId}">${displayName}</option>`;
                        }
                    }
                }
                field += optionsHtml;
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
        case 'checkbox':
             field = `
                <div class="flex items-center">
                    <input id="${attr.id}" name="${attr.label}" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                    <label for="${attr.id}" class="ml-2 block text-sm text-slate-900">${attr.label} ${requiredLabel}</label>
                </div>
            `;
            return field;
        case 'file':
            field += `<input type="file" id="${attr.id}" name="${attr.label}" class="${baseInputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">`;
            break;
        default:
            field += `<input type="${attr.type}" id="${attr.id}" name="${attr.label}" class="${baseInputClasses}" placeholder="${attr.placeholder || ''}" ${attr.required ? 'required' : ''}>`;
            break;
    }
    
    field += `</div>`;
    return field;
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

    const formData = new FormData(form);
    const dataToSave = {};
    for (let [key, value] of formData.entries()) {
        const inputElement = form.querySelector(`[name="${key}"]`);
        if(inputElement.type === 'checkbox'){
            dataToSave[key] = inputElement.checked;
        } else {
             dataToSave[key] = value;
        }
    }
    
    const dataRef = ref(db, `data/${path}`);
    push(dataRef, dataToSave)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Dados Guardados!',
                text: 'O seu registo foi guardado com sucesso na base de dados.',
            });
            form.reset();
        })
        .catch(error => {
            console.error("Erro ao guardar dados: ", error);
             Swal.fire({
                icon: 'error',
                title: 'Erro ao Guardar',
                text: 'Ocorreu um problema ao tentar guardar os dados.',
            });
        });
}
