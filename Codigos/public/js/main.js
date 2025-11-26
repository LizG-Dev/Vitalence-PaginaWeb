navigator.serviceWorker.register('./serviceWorker.js').then(reg => {
  console.log("Service Worker registrado:", reg.scope);

  reg.onupdatefound = () => {
    const newWorker = reg.installing;
    newWorker.onstatechange = () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log("¡Nueva versión disponible!");
      }
    };
  };
});
