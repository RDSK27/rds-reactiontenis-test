// Service Worker - Reaction Tenis (RDS)
// Documento HTML / navegacion: network-first (siempre la ultima version con conexion).
// Resto de assets same-origin + SDK de Firebase (gstatic): cache-first.
// Las llamadas de datos a Firestore NO se cachean (persistencia offline de Firestore).
var CACHE = "rtenis-v113";
var ASSETS = ["./", "./index.html", "./manifest.json", "./assets/ball.webp", "./assets/banner.webp", "./assets/icon.png"];

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
      return Promise.all(keys.map(function(k){
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  var url = e.request.url;

  // Documento / navegacion: network-first para servir siempre la ultima version
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function(resp){
        var clone = resp.clone();
        caches.open(CACHE).then(function(c){ try { c.put("./index.html", clone); } catch(err){} });
        return resp;
      }).catch(function(){
        return caches.match("./index.html").then(function(c){ return c || caches.match("./"); });
      })
    );
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
