// Pelufiller content script: deterministic ATS form filling and text injection.

const FIELD_KEYWORDS = {
  firstName: ['first name', 'firstname', 'first-name', 'fname', 'given name', 'givenname', 'nombre', 'nombres'],
  lastName: ['last name', 'lastname', 'last-name', 'lname', 'surname', 'family name', 'apellido', 'apellidos'],
  email: ['email', 'e-mail', 'email address', 'correo', 'correo electronico'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'tel', 'telephone', 'telefono', 'celular', 'movil'],
  country: ['country', 'country/region', 'pais', 'nacionalidad'],
  linkedin: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
  github: ['github', 'github profile', 'github url'],
  portfolio: ['portfolio', 'portfolio url', 'website', 'personal website', 'web site', 'sitio web', 'web', 'url'],
  salary: ['salary', 'expected salary', 'compensation', 'desired compensation', 'hourly rate', 'rate', 'salario', 'remuneracion', 'pretension', 'pretension salarial'],
  hours: ['hours', 'hours per week', 'weekly hours', 'availability hours', 'h/sem', 'horas', 'horas semanales'],
  startDate: ['start date', 'availability', 'earliest start', 'earliest start date', 'begin', 'fecha de inicio', 'disponibilidad', 'inicio', 'when can you start']
};

const BASE_KEYS = ['firstName', 'lastName', 'email', 'phone', 'country', 'linkedin', 'github', 'portfolio'];
const VARIANT_KEYS = ['salary', 'hours', 'startDate'];

// Fields whose label mentions one of these must not be treated as a person name.
const NAME_GUARDS = ['company', 'empresa', 'organization', 'organisation', 'organizacion', 'employer'];

const SKIPPED_INPUT_TYPES = ['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'image', 'reset', 'password'];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;
  if (request.action === 'FILL_FORM') {
    sendResponse(fillForm(request.base, request.variant));
  } else if (request.action === 'INJECT_TEXT') {
    sendResponse(injectText(request.text));
  }
});

function fillForm(base, variant) {
  base = base || {};
  variant = variant || {};

  const values = {};
  BASE_KEYS.forEach((key) => {
    const value = base[key];
    if (value != null && String(value).trim()) values[key] = String(value).trim();
  });
  VARIANT_KEYS.forEach((key) => {
    const value = variant[key];
    if (value != null && String(value).trim()) values[key] = String(value).trim();
  });

  const nodes = Array.from(document.querySelectorAll('input, select'));
  const candidates = {};

  nodes.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (tag === 'input' && SKIPPED_INPUT_TYPES.indexOf(type) !== -1) return;

    const haystack = normalize(fieldHaystack(el));
    if (!haystack) return;
    const compact = haystack.replace(/ /g, '');

    let bestKey = null;
    let bestLen = 0;
    Object.keys(values).forEach((key) => {
      FIELD_KEYWORDS[key].forEach((keyword) => {
        if (!matchesKeyword(haystack, compact, keyword)) return;
        if (key === 'firstName' || key === 'lastName') {
          if (NAME_GUARDS.some((guard) => matchesKeyword(haystack, compact, guard))) return;
        }
        if (keyword.length > bestLen) {
          bestLen = keyword.length;
          bestKey = key;
        }
      });
    });

    if (bestKey) {
      if (!candidates[bestKey]) candidates[bestKey] = [];
      candidates[bestKey].push({ el: el, visible: isVisible(el) });
    }
  });

  const filled = [];
  const unmatched = [];

  Object.keys(values).forEach((key) => {
    const list = candidates[key];
    if (!list || !list.length) {
      unmatched.push(key);
      return;
    }
    const visible = list.filter((candidate) => candidate.visible);
    const chosen = visible.length ? visible[0] : list[0];
    const how = applyValue(chosen.el, key, values[key]);
    if (how) {
      filled.push({ key: key, label: labelFor(chosen.el), how: how });
    } else {
      unmatched.push(key);
    }
  });

  return { filled: filled, unmatched: unmatched };
}

function injectText(text) {
  const el = document.activeElement;
  if (!el || !(el.tagName === 'TEXTAREA' || el.isContentEditable)) {
    return { ok: false, reason: 'No active textarea' };
  }
  if (el.isContentEditable) {
    el.focus();
    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, text);
    } catch (err) {
      inserted = false;
    }
    if (!inserted) el.textContent = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    setNativeValue(el, text);
  }
  return { ok: true };
}

function applyValue(el, key, value) {
  const tag = el.tagName.toLowerCase();

  if (tag === 'select') {
    const option = findOption(el, value);
    if (!option) return null;
    setNativeValue(el, option.value);
    return 'select';
  }

  const type = (el.type || 'text').toLowerCase();
  let next = value;

  if (key === 'startDate' && type === 'date') {
    const iso = toISODate(value);
    if (!iso) return null;
    next = iso;
  } else if (type === 'number') {
    const numeric = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
    if (numeric) next = numeric[0];
  }

  setNativeValue(el, next);
  return type || 'text';
}

// React/Vue safe value setter: use the native prototype setter, then fire events.
function setNativeValue(el, value) {
  let setter = null;
  const own = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
  if (own && own.set) setter = own.set;

  if (!setter) {
    const inputDesc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const textareaDesc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    const selectDesc = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
    setter = (inputDesc && inputDesc.set) || (textareaDesc && textareaDesc.set) || (selectDesc && selectDesc.set);
  }

  try {
    if (setter) setter.call(el, value);
    else el.value = value;
  } catch (err) {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function findOption(select, value) {
  const target = normalize(value);
  if (!target) return null;
  const compactTarget = target.replace(/ /g, '');
  let partial = null;

  const options = Array.from(select.options);
  for (const option of options) {
    const text = normalize(option.textContent);
    const val = normalize(option.value);
    if (!text && !val) continue;
    if (text === target || val === target) return option;
    if (text.replace(/ /g, '') === compactTarget || val.replace(/ /g, '') === compactTarget) return option;
    if (!partial && (text.indexOf(target) !== -1 || val.indexOf(target) !== -1)) partial = option;
    if (!partial && text && target.indexOf(text) !== -1) partial = option;
  }
  return partial;
}

function toISODate(value) {
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return raw;
  match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    return match[3] + '-' + month + '-' + day;
  }
  return null;
}

function fieldHaystack(el) {
  const parts = [
    el.getAttribute('name'),
    el.getAttribute('id'),
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('autocomplete')
  ];

  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    labelledby.split(/\s+/).forEach((id) => {
      const node = document.getElementById(id);
      if (node) parts.push(node.textContent);
    });
  }

  const id = el.getAttribute('id');
  if (id) {
    const forLabel = document.querySelector('label[for="' + cssEscape(id) + '"]');
    if (forLabel) parts.push(forLabel.textContent);
  }

  const closest = el.closest('label');
  if (closest) parts.push(closest.textContent);

  return parts.filter(Boolean).join(' ');
}

function labelFor(el) {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const id = el.getAttribute('id');
  if (id) {
    const forLabel = document.querySelector('label[for="' + cssEscape(id) + '"]');
    if (forLabel && forLabel.textContent.trim()) return forLabel.textContent.trim();
  }
  const closest = el.closest('label');
  if (closest && closest.textContent.trim()) return closest.textContent.trim();
  return el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('id') || 'campo';
}

function isVisible(el) {
  if (el.disabled || el.readOnly) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.offsetParent !== null) return true;
  return !!(el.getClientRects && el.getClientRects().length);
}

function normalize(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesKeyword(haystack, compact, keyword) {
  const key = normalize(keyword);
  if (!key) return false;
  if ((' ' + haystack + ' ').indexOf(' ' + key + ' ') !== -1) return true;
  const compactKey = key.replace(/ /g, '');
  if (compactKey.length >= 5 && compact.indexOf(compactKey) !== -1) return true;
  return false;
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
