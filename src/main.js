import Experience from "./Experience";
const canvas = document.querySelector('#app');

// Dirección del server
window.SERVER_URL = 'http://localhost:3000';
// Inicializar la experiencia con el elemento seleccionado
window.experience = new Experience(canvas);
