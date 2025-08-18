document.addEventListener('DOMContentLoaded', () => {
    // --- Translation Dictionary ---
    const translations = {
        es: {
            fillButton: "Rellenar Datos Básicos",
            injectSummary: "Insertar Resumen",
            injectExperience: "Insertar Exp. Accenture"
        },
        en: {
            fillButton: "Fill Basic Info",
            injectSummary: "Insert Summary",
            injectExperience: "Insert Exp. Accenture"
        }
    };

    // --- DOM Element References ---
    const langButtons = {
        es: document.getElementById('lang-es'),
        en: document.getElementById('lang-en')
    };
    const fillButton = document.getElementById('fillButton');
    const injectSummaryButton = document.getElementById('injectSummary');
    const injectExperienceButton = document.getElementById('injectExperience');

    let currentLang = 'es'; // Default language

    // --- Functions ---
    function updateUIForLanguage() {
        langButtons.es.classList.toggle('active', currentLang === 'es');
        langButtons.en.classList.toggle('active', currentLang === 'en');
        fillButton.textContent = translations[currentLang].fillButton;
        injectSummaryButton.textContent = translations[currentLang].injectSummary;
        injectExperienceButton.textContent = translations[currentLang].injectExperience;
    }

    // --- Main Logic ---
    // Load language preference on startup
    chrome.storage.local.get(['language'], (result) => {
        if (result.language) {
            currentLang = result.language;
        }
        updateUIForLanguage();
    });

    // Listeners for language change
    Object.keys(langButtons).forEach(lang => {
        langButtons[lang].addEventListener('click', () => {
            currentLang = lang;
            chrome.storage.local.set({ language: currentLang });
            updateUIForLanguage();
        });
    });
    
    // --- Action Logic ---
    fillButton.addEventListener('click', () => {
        const keys = ['firstName', 'lastName', 'email', 'phone'];
        chrome.storage.sync.get(keys, (data) => {
            getActiveTabId(tabId => {
                chrome.tabs.sendMessage(tabId, { action: "FILL_FORM", data: data });
            });
        });
    });

    document.querySelectorAll('.text-injector').forEach(button => {
        button.addEventListener('click', () => {
            const textKey = button.getAttribute('data-text-key');
            chrome.storage.sync.get([textKey], (data) => {
                if (data[textKey] && data[textKey][currentLang]) {
                    getActiveTabId(tabId => {
                        chrome.tabs.sendMessage(tabId, { action: "INJECT_TEXT", text: data[textKey][currentLang] });
                    });
                }
            });
        });
    });
});

function getActiveTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
            callback(tabs[0].id);
        }
    });
}