// Listens for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FILL_FORM") {
    fillForm(request.data);
    console.log(`Pelu Assistant attempted to fill the form.`);
  }

  if (request.action === "INJECT_TEXT") {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
      activeElement.value = request.text;
    } else {
      alert("Please click on a large text field before injecting.");
    }
  }
});

// The form-filling logic
function fillForm(userData) {
    const fieldMappings = {
      firstName: ['nombre', 'first name', 'fname', 'given', 'name'],
      lastName: ['apellido', 'last name', 'surname', 'lname'],
      email: ['email', 'correo'],
      phone: ['teléfono', 'phone', 'mobile', 'celular']
    };

    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    
    inputs.forEach(input => {
      const inputId = (input.id || '').toLowerCase();
      const inputName = (input.name || '').toLowerCase();
      const inputPlaceholder = (input.placeholder || '').toLowerCase();
      
      let labelText = '';
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          labelText = label.textContent.toLowerCase().trim();
        }
      }

      for (const key in fieldMappings) {
        const keywords = fieldMappings[key];
        
        if (keywords.some(keyword => 
            inputId.includes(keyword) || 
            inputName.includes(keyword) || 
            inputPlaceholder.includes(keyword) ||
            labelText.includes(keyword)
        )) {
          if (userData[key]) {
            input.value = userData[key];
          }
        }
      }
    });
}