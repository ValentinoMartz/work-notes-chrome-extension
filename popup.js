document.addEventListener('DOMContentLoaded', () => {
    const translations = {
        es: {
            profile: 'Perfil',
            baseOnly: '— Solo datos base —',
            fillButton: 'Rellenar formulario',
            openOptions: 'Abrir Opciones',
            injectPrefix: 'Insertar',
            injected: 'Texto insertado.',
            injectFail: 'No hay un campo de texto activo. Hacé clic en un área de texto primero.',
            noTab: 'No se pudo acceder a la pestaña activa.',
            fillError: 'No se pudo comunicar con la página.',
            fillStatus: (filled, unmatched) => filled + ' campos rellenados, ' + unmatched + ' sin coincidencia.'
        },
        en: {
            profile: 'Profile',
            baseOnly: '— Base data only —',
            fillButton: 'Fill form',
            openOptions: 'Open Options',
            injectPrefix: 'Insert',
            injected: 'Text inserted.',
            injectFail: 'No active text field. Click a text area first.',
            noTab: 'Could not access the active tab.',
            fillError: 'Could not reach the page.',
            fillStatus: (filled, unmatched) => filled + ' fields filled, ' + unmatched + ' unmatched.'
        }
    };

    const langButtons = {
        es: document.getElementById('lang-es'),
        en: document.getElementById('lang-en')
    };
    const fillButton = document.getElementById('fillButton');
    const variantSelect = document.getElementById('variantSelect');
    const variantLabel = document.getElementById('variantLabel');
    const statusLine = document.getElementById('statusLine');
    const answersContainer = document.getElementById('answersContainer');
    const openOptions = document.getElementById('openOptions');

    let currentLang = 'es';
    let variants = [];
    let selectedVariantId = '';

    function t() {
        return translations[currentLang];
    }

    function updateUIForLanguage() {
        langButtons.es.classList.toggle('active', currentLang === 'es');
        langButtons.en.classList.toggle('active', currentLang === 'en');
        fillButton.textContent = t().fillButton;
        variantLabel.textContent = t().profile;
        openOptions.textContent = t().openOptions;
    }

    function populateVariants() {
        variantSelect.innerHTML = '';
        const baseOption = document.createElement('option');
        baseOption.value = '';
        baseOption.textContent = t().baseOnly;
        variantSelect.appendChild(baseOption);

        variants.forEach((variant) => {
            const option = document.createElement('option');
            option.value = variant.id;
            option.textContent = variant.label || variant.company || variant.id;
            variantSelect.appendChild(option);
        });

        if (selectedVariantId && variants.some((v) => v.id === selectedVariantId)) {
            variantSelect.value = selectedVariantId;
        } else {
            selectedVariantId = '';
            variantSelect.value = '';
        }
    }

    function renderAnswers() {
        answersContainer.innerHTML = '';
        const variant = getSelectedVariant();
        if (!variant || !Array.isArray(variant.answers) || !variant.answers.length) return;

        variant.answers.forEach((answer) => {
            const button = document.createElement('button');
            button.className = 'answer-button';
            const label = answer.label || 'Texto';
            button.textContent = t().injectPrefix + ': ' + label;
            button.addEventListener('click', () => injectAnswer(answer));
            answersContainer.appendChild(button);
        });
    }

    function getSelectedVariant() {
        if (!selectedVariantId) return null;
        return variants.find((v) => v.id === selectedVariantId) || null;
    }

    function showStatus(message) {
        statusLine.textContent = message;
    }

    function injectAnswer(answer) {
        const text = answer[currentLang] || answer.es || answer.en || '';
        if (!text.trim()) {
            showStatus(t().injectFail);
            return;
        }
        getActiveTabId((tabId) => {
            if (tabId == null) {
                showStatus(t().noTab);
                return;
            }
            chrome.tabs.sendMessage(tabId, { action: 'INJECT_TEXT', text: text }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus(t().injectFail);
                    return;
                }
                if (response && response.ok) showStatus(t().injected);
                else showStatus(t().injectFail);
            });
        });
    }

    function fillForm() {
        const variant = getSelectedVariant();
        chrome.storage.sync.get(['base'], (result) => {
            if (chrome.runtime.lastError) {
                showStatus(t().fillError);
                return;
            }
            const base = (result && result.base) || {};
            getActiveTabId((tabId) => {
                if (tabId == null) {
                    showStatus(t().noTab);
                    return;
                }
                chrome.tabs.sendMessage(tabId, { action: 'FILL_FORM', base: base, variant: variant }, (response) => {
                    if (chrome.runtime.lastError) {
                        showStatus(t().fillError);
                        return;
                    }
                    const filled = (response && response.filled) ? response.filled.length : 0;
                    const unmatched = (response && response.unmatched) ? response.unmatched.length : 0;
                    showStatus(t().fillStatus(filled, unmatched));
                });
            });
        });
    }

    Object.keys(langButtons).forEach((lang) => {
        langButtons[lang].addEventListener('click', () => {
            currentLang = lang;
            chrome.storage.sync.set({ language: currentLang });
            updateUIForLanguage();
            populateVariants();
            renderAnswers();
        });
    });

    variantSelect.addEventListener('change', () => {
        selectedVariantId = variantSelect.value;
        renderAnswers();
    });

    fillButton.addEventListener('click', fillForm);

    openOptions.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    chrome.storage.sync.get(['language', 'variants'], (result) => {
        if (result && result.language) currentLang = result.language;
        variants = (result && Array.isArray(result.variants)) ? result.variants : [];
        updateUIForLanguage();
        populateVariants();
        renderAnswers();
    });
});

function getActiveTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
            callback(tabs[0].id);
        } else {
            callback(null);
        }
    });
}
