# Pelufiller

Extensión de Chrome (Manifest V3) para agilizar postulaciones laborales. Rellena formularios de ATS reales (Greenhouse, Ashby, Lever, Workable) y guarda perfiles por empresa y puesto con respuestas reutilizables.

## Características (v0.4)

- **Datos base:** rellena nombre, apellido, email, teléfono, país, LinkedIn, GitHub y portfolio.
- **Variantes por empresa / puesto:** cada variante guarda empresa, puesto, salario esperado, horas semanales y fecha de inicio.
- **Respuestas reutilizables:** por cada variante podés guardar bloques de texto en español e inglés y insertarlos con un clic en el área de texto activa.
- **Relleno seguro para React:** usa el setter nativo del prototipo y dispara eventos `input`/`change`, de modo que formularios React (como Greenhouse) no descarten los valores.
- **Bilingüe:** toggle ES/EN en el popup.
- **Sin build, sin dependencias:** JavaScript vanilla (ES6+), HTML y CSS.

## Cómo funciona

### Modelo de datos (`chrome.storage.sync`)

- `base`: `{ firstName, lastName, email, phone, country, linkedin, github, portfolio, language }` — datos de contacto fijos, se editan una vez en Opciones.
- `variants`: arreglo de `{ id, label, company, position, salary, hours, startDate, answers }`, donde `answers` es `[{ id, label, es, en }]`. Una variante vacía significa "rellenar solo los datos base".
- `language`: preferencia de idioma del popup (`es` / `en`).

### Flujo de uso

1. Abrí **Opciones** y cargá tus **Datos base**.
2. Creá una **variante** por empresa/puesto, con sus respuestas en ES/EN.
3. En la página del formulario, abrí el popup, elegí la variante y presioná **"Rellenar formulario"**. El popup muestra cuántos campos se rellenaron y cuántos quedaron sin coincidencia.
4. Para los campos largos, hacé clic en el textarea y usá los botones de respuesta del popup.

## Instalación

1. Descargá o cloná este repositorio.
2. Abrí Chrome y navegá a `chrome://extensions`.
3. Activá **"Modo de desarrollador"** (arriba a la derecha).
4. Presioná **"Cargar descomprimida"** (Load unpacked).
5. Seleccioná la carpeta del proyecto.
6. El ícono de **Pelufiller** aparecerá en la barra de herramientas.

## Privacidad

Todos los datos se guardan en `chrome.storage.sync` de tu navegador. La extensión no envía información a ningún servidor y no completa ni envía formularios automáticamente.

## Tech Stack

- Chrome Extension Manifest V3
- JavaScript (ES6+)
- HTML5 / CSS3
