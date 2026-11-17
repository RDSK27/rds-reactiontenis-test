// Service Worker - Reaction Tenis (RDS)
// Documento HTML / navegacion: network-first (siempre la ultima version con conexion).
// Resto de assets same-origin + SDK de Firebase (gstatic): cache-first.
// Las llamadas de datos a Firestore NO se cachean (persistencia offline de Firestore).
var CACHE = "rtenis-v245";
var ASSETS = ["./", "./index.html", "./manifest.json", "./assets/logo.png", "./assets/logo-padel.png", "./assets/ball.webp", "./assets/banner.webp", "./assets/icon-192.png", "./assets/icon-512.png",
  "./assets/tn-espera.png", "./assets/tn-saque.png", "./assets/tn-d_plano.png", "./assets/tn-d_carrera.png", "./assets/tn-d_salto.png", "./assets/tn-d_volea.png",
  "./assets/tn-r_plano.png", "./assets/tn-r_carrera.png", "./assets/tn-r_carrera1m.png", "./assets/tn-r_volea.png",
  "./assets/pd-espera-m.png", "./assets/pd-espera-r.png", "./assets/pd-saque-m.png", "./assets/pd-saque-r.png",
  "./assets/pd-d_plano-m.png", "./assets/pd-d_plano-r.png", "./assets/pd-d_carrera-m.png", "./assets/pd-d_carrera-r.png",
  "./assets/pd-r_plano-m.png", "./assets/pd-r_plano-r.png", "./assets/pd-d_volea-m.png", "./assets/pd-d_volea-r.png"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(u){ return c.add(u).catch(function(){}); }));
    })
  );
});

self.addEventListener("message", function(e){
  if (e.data && e.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      // borra cache vieja de ESTA app (deja intactas las de otras apps RDS,
      // que comparten origen -- caches.keys() ve TODAS las del origen).
      return Promise.all(keys.map(function(k){
        if (k.indexOf("rtenis-") === 0 && k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){ if(e.request.url.indexOf('/rds-rankings-data/')!==-1){ return; }   /* JSON de rankings: siempre de la red (cache-first lo dejaria viejo) */
  if (e.request.method !== "GET") return;
  var url = e.request.url;

  // Documento / navegacion: network-first para servir siempre la ultima version
  /* 2026-11-17: con cobertura mala la peticion a la red podia tardar 30-60 s en dar error y, mientras, la pantalla
     se quedaba en blanco. Ahora se espera a la red como mucho NAV_WAIT ms; si no ha llegado, se muestra la copia
     guardada y la descarga sigue en segundo plano para dejar guardada la version nueva para la proxima vez. */
  if (e.request.mode === "navigate") {
    var req = e.request;
    var NAV_WAIT = 3000;
    var net = fetch(req, {cache:'no-store'}).then(function(resp){
      if(resp && resp.ok){ var copy = resp.clone(); caches.open(CACHE).then(function(cache){ try{ cache.put('./index.html', copy); }catch(err){} }); }
      return resp;
    });
    function saved(){ return caches.match(req).then(function(c){ return c || caches.match('./index.html'); }); }
    e.respondWith(new Promise(function(resolve){
      var done = false;
      function give(r){ if(!done && r){ done = true; resolve(r); } }
      var t = setTimeout(function(){ saved().then(give); }, NAV_WAIT);
      net.then(function(r){ clearTimeout(t); give(r); }, function(){
        clearTimeout(t);
        saved().then(function(c){ if(c) give(c); else if(!done){ done = true; resolve(Response.error()); } });
      });
    }));
    e.waitUntil(net.catch(function(){}));
    return;
  }

  // Resto: cache-first (assets same-origin y SDK de Firebase en gstatic)
  var cacheable = (url.indexOf(self.location.origin) === 0) ||
                  (url.indexOf("https://www.gstatic.com/") === 0);
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if (cached) return cached;
      return fetch(e.request).then(function(resp){
        if (cacheable){
          var clone = resp.clone();
          caches.open(CACHE).then(function(c){ try { c.put(e.request, clone); } catch(err){} });
        }
        return resp;
      });
    })
  );
});
