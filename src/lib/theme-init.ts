/** Skrip tema awal: disalin dari <head> reference/zmusic-fixed.html. Jalan sebelum cat pertama agar tema tidak berkedip. */
export const THEME_INIT = "try{var s=localStorage.getItem('zt');document.documentElement.dataset.theme=(s=='light'||s=='dark')?s:(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='dark'}";
