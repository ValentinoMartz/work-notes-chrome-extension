let base = {};
let variants = [];
let editingId = null;

const BASE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'country', 'linkedin', 'github', 'portfolio'];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveBaseButton').addEventListener('click', saveBase);
    document.getElementById('newVariantButton').addEventListener('click', () => openVariantForm(null));
    document.getElementById('saveVariantButton').addEventListener('click', saveVariant);
    document.getElementById('cancelVariantButton').addEventListener('click', closeVariantForm);
    document.getElementById('addAnswerButton').addEventListener('click', () => addAnswerRow({}));

    loadData();
});

function loadData() {
    chrome.storage.sync.get(['base', 'variants'], (result) => {
        base = (result && result.base) || {};
        variants = (result && Array.isArray(result.variants)) ? result.variants : [];
        fillBaseForm();
        renderVariantList();
    });
}

function fillBaseForm() {
    BASE_FIELDS.forEach((field) => {
        const input = document.getElementById('base_' + field);
        if (input) input.value = base[field] || '';
    });
}

function saveBase() {
    const next = {};
    BASE_FIELDS.forEach((field) => {
        const input = document.getElementById('base_' + field);
        next[field] = input ? input.value.trim() : '';
    });

    chrome.storage.sync.get(['language'], (result) => {
        if (result && result.language) next.language = result.language;
        base = next;
        chrome.storage.sync.set({ base: base }, () => {
            setStatus('baseStatus', 'Datos base guardados.');
        });
    });
}

function renderVariantList() {
    const container = document.getElementById('variantList');
    container.innerHTML = '';

    if (!variants.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'Todavía no hay variantes. Creá una para guardar respuestas por empresa y puesto.';
        container.appendChild(empty);
        return;
    }

    variants.forEach((variant) => {
        const item = document.createElement('div');
        item.className = 'variant-item';

        const info = document.createElement('div');
        info.className = 'variant-info';
        const title = document.createElement('strong');
        title.textContent = variant.label || '(sin etiqueta)';
        const meta = document.createElement('span');
        meta.className = 'variant-meta';
        meta.textContent = [variant.company, variant.position].filter(Boolean).join(' · ') || '—';
        info.appendChild(title);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'variant-actions';

        const edit = document.createElement('button');
        edit.className = 'btn-sm';
        edit.textContent = 'Editar';
        edit.addEventListener('click', () => openVariantForm(variant.id));

        const duplicate = document.createElement('button');
        duplicate.className = 'btn-sm';
        duplicate.textContent = 'Duplicar';
        duplicate.addEventListener('click', () => duplicateVariant(variant.id));

        const remove = document.createElement('button');
        remove.className = 'btn-sm btn-danger';
        remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => deleteVariant(variant.id));

        actions.appendChild(edit);
        actions.appendChild(duplicate);
        actions.appendChild(remove);

        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

function openVariantForm(id) {
    editingId = id || null;
    const form = document.getElementById('variantForm');
    const title = document.getElementById('variantFormTitle');
    const variant = id ? variants.find((v) => v.id === id) : null;

    if (variant) {
        title.textContent = 'Editar variante';
        document.getElementById('v_label').value = variant.label || '';
        document.getElementById('v_company').value = variant.company || '';
        document.getElementById('v_position').value = variant.position || '';
        document.getElementById('v_salary').value = variant.salary || '';
        document.getElementById('v_hours').value = variant.hours || '';
        document.getElementById('v_startDate').value = variant.startDate || '';
        renderAnswerRows(variant.answers || []);
    } else {
        title.textContent = 'Nueva variante';
        ['v_label', 'v_company', 'v_position', 'v_salary', 'v_hours', 'v_startDate'].forEach((fieldId) => {
            document.getElementById(fieldId).value = '';
        });
        renderAnswerRows([]);
    }

    form.classList.remove('hidden');
    document.getElementById('v_label').focus();
}

function closeVariantForm() {
    editingId = null;
    document.getElementById('variantForm').classList.add('hidden');
    setStatus('variantStatus', '');
}

function renderAnswerRows(answers) {
    const container = document.getElementById('answersList');
    container.innerHTML = '';
    answers.forEach((answer) => addAnswerRow(answer));
}

function addAnswerRow(answer) {
    const container = document.getElementById('answersList');
    const row = document.createElement('div');
    row.className = 'answer-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'answer-label';
    labelInput.placeholder = 'Etiqueta (ej. Details)';
    labelInput.value = answer.label || '';

    const esInput = document.createElement('textarea');
    esInput.className = 'answer-es';
    esInput.rows = 2;
    esInput.placeholder = 'Texto en español';
    esInput.value = answer.es || '';

    const enInput = document.createElement('textarea');
    enInput.className = 'answer-en';
    enInput.rows = 2;
    enInput.placeholder = 'Text in English';
    enInput.value = answer.en || '';

    const remove = document.createElement('button');
    remove.className = 'btn-sm btn-danger remove-answer';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => row.remove());

    row.appendChild(labelInput);
    row.appendChild(esInput);
    row.appendChild(enInput);
    row.appendChild(remove);
    container.appendChild(row);
}

function collectAnswers() {
    const rows = Array.from(document.querySelectorAll('#answersList .answer-row'));
    return rows.map((row) => {
        const label = row.querySelector('.answer-label').value.trim();
        const es = row.querySelector('.answer-es').value;
        const en = row.querySelector('.answer-en').value;
        if (!label && !es.trim() && !en.trim()) return null;
        return { id: generateId('ans'), label: label, es: es, en: en };
    }).filter(Boolean);
}

function saveVariant() {
    const label = document.getElementById('v_label').value.trim();
    const company = document.getElementById('v_company').value.trim();
    const position = document.getElementById('v_position').value.trim();

    if (!label && !company && !position) {
        setStatus('variantStatus', 'Completá al menos la etiqueta, empresa o puesto.');
        return;
    }

    const variant = {
        id: editingId || generateId('var'),
        label: label || [company, position].filter(Boolean).join(' — '),
        company: company,
        position: position,
        salary: document.getElementById('v_salary').value.trim(),
        hours: document.getElementById('v_hours').value.trim(),
        startDate: document.getElementById('v_startDate').value.trim(),
        answers: collectAnswers()
    };

    if (editingId) {
        const index = variants.findIndex((v) => v.id === editingId);
        if (index !== -1) variants[index] = variant;
        else variants.push(variant);
    } else {
        variants.push(variant);
    }

    persistVariants(() => {
        closeVariantForm();
        renderVariantList();
    });
}

function duplicateVariant(id) {
    const source = variants.find((v) => v.id === id);
    if (!source) return;
    const copy = {
        id: generateId('var'),
        label: (source.label || '') + ' (copia)',
        company: source.company || '',
        position: source.position || '',
        salary: source.salary || '',
        hours: source.hours || '',
        startDate: source.startDate || '',
        answers: (source.answers || []).map((answer) => ({
            id: generateId('ans'),
            label: answer.label || '',
            es: answer.es || '',
            en: answer.en || ''
        }))
    };
    variants.push(copy);
    persistVariants(renderVariantList);
}

function deleteVariant(id) {
    const source = variants.find((v) => v.id === id);
    if (!source) return;
    if (!confirm('¿Eliminar la variante "' + (source.label || id) + '"?')) return;
    variants = variants.filter((v) => v.id !== id);
    persistVariants(renderVariantList);
}

function persistVariants(callback) {
    chrome.storage.sync.set({ variants: variants }, () => {
        if (callback) callback();
    });
}

function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function setStatus(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    if (message) {
        setTimeout(() => {
            if (el.textContent === message) el.textContent = '';
        }, 3000);
    }
}
