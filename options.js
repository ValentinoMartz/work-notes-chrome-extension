// Saves the options to chrome.storage
function saveOptions() {
  const data = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    professionalSummary: {
      es: document.getElementById('summary_es').value,
      en: document.getElementById('summary_en').value
    },
    accentureExperience: {
      es: document.getElementById('experience_es').value,
      en: document.getElementById('experience_en').value
    }
  };

  chrome.storage.sync.set(data, () => {
    const status = document.getElementById('status');
    status.textContent = 'Configuration saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

// Loads options from chrome.storage into the form
function loadOptions() {
  const keys = [
    'firstName', 'lastName', 'email', 'phone',
    'professionalSummary', 'accentureExperience'
  ];
  
  chrome.storage.sync.get(keys, (items) => {
    document.getElementById('firstName').value = items.firstName || '';
    document.getElementById('lastName').value = items.lastName || '';
    document.getElementById('email').value = items.email || '';
    document.getElementById('phone').value = items.phone || '';
    
    if (items.professionalSummary) {
      document.getElementById('summary_es').value = items.professionalSummary.es || '';
      document.getElementById('summary_en').value = items.professionalSummary.en || '';
    }
    if (items.accentureExperience) {
      document.getElementById('experience_es').value = items.accentureExperience.es || '';
      document.getElementById('experience_en').value = items.accentureExperience.en || '';
    }
  });
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);