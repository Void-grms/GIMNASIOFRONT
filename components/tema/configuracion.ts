export const CLAVE_TEMA = 'forcesgym.apariencia';

// Código constante, sin interpolar datos del usuario. Se ejecuta antes del
// primer dibujo para respetar la preferencia guardada sin un destello de color.
export const SCRIPT_TEMA = `(function(){var t='sistema';try{var s=localStorage.getItem('${CLAVE_TEMA}');if(s==='claro'||s==='oscuro'||s==='sistema')t=s}catch(e){}var d=t==='oscuro'||(t==='sistema'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var h=document.documentElement;h.dataset.tema=d?'oscuro':'claro';h.dataset.preferenciaTema=t;h.style.colorScheme=d?'dark':'light'})()`;
