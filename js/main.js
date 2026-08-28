/* =========================================================
   Larissa & Neto — Convite de Casamento
   ========================================================= */

// ---- Fallback de fotos ausentes -------------------------
// Checado via JS (em vez de onerror inline) porque um <img> sem
// loading="lazy" pode falhar ANTES do script (defer) rodar —
// sobretudo abrindo o arquivo direto (file://), sem servidor.
function handleImgError(img) {
  const frame = img.closest('.photo-frame');
  if (frame) frame.classList.add('is-empty');
}
window.handleImgError = handleImgError;

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.photo-frame img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      handleImgError(img);
    } else {
      img.addEventListener('error', () => handleImgError(img));
    }
  });

  // ---- Flores decorativas (assets/decor/) -----------------------------------
  // Se algum arquivo faltar, esconde o quadro em vez de mostrar o ícone quebrado.
  document.querySelectorAll('.floral').forEach((el) => {
    const img = el.querySelector('img');
    if (!img) return;
    const hideIfMissing = () => el.style.display = 'none';
    if (img.complete && img.naturalWidth === 0) {
      hideIfMissing();
    } else {
      img.addEventListener('error', hideIfMissing);
    }
  });

  // ---- Menu mobile ---------------------------------------
  const menuToggle = document.getElementById('menuToggle');
  const menuOverlay = document.getElementById('menuOverlay');

  if (menuToggle && menuOverlay) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuOverlay.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    menuOverlay.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menuOverlay.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Reveal on scroll -----------------------------------
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach((el) => revealObserver.observe(el));

  // ---- Dot nav scroll spy -----------------------------------
  const sections = document.querySelectorAll('section[id], header[id]');
  const dots = document.querySelectorAll('.dot-nav .dot');

  if (sections.length && dots.length) {
    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          dots.forEach((dot) => {
            dot.classList.toggle('active', dot.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.5 });

    sections.forEach((section) => spyObserver.observe(section));
  }

  // ---- Contagem regressiva -----------------------------------
  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    const target = new Date(countdownEl.dataset.target).getTime();
    const numbers = {
      dias: countdownEl.querySelector('[data-unit="dias"]'),
      horas: countdownEl.querySelector('[data-unit="horas"]'),
      minutos: countdownEl.querySelector('[data-unit="minutos"]'),
      segundos: countdownEl.querySelector('[data-unit="segundos"]'),
    };

    const pad = (n) => String(n).padStart(2, '0');

    function tick() {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutos = Math.floor((diff / (1000 * 60)) % 60);
      const segundos = Math.floor((diff / 1000) % 60);

      numbers.dias.textContent = pad(dias);
      numbers.horas.textContent = pad(horas);
      numbers.minutos.textContent = pad(minutos);
      numbers.segundos.textContent = pad(segundos);

      if (diff <= 0) clearInterval(interval);
    }

    tick();
    const interval = setInterval(tick, 1000);
  }

  // ---- Localização automática do convidado -----------------------------------
  // Usa geolocalização por IP (sem pedir permissão do navegador) para sugerir a
  // cidade e guardar coordenadas aproximadas, úteis para um relatório de onde
  // vêm os convidados. O campo de cidade continua editável a qualquer momento.
  const cidadeInput = document.getElementById('cidade');
  const coordenadasField = document.getElementById('geoCoordenadas');

  if (cidadeInput) {
    let cidadeEditadaPeloUsuario = false;
    cidadeInput.addEventListener('input', () => { cidadeEditadaPeloUsuario = true; }, { once: true });

    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) return;

        if (!cidadeEditadaPeloUsuario && !cidadeInput.value) {
          const partes = [data.city, data.region_code || data.region].filter(Boolean);
          cidadeInput.value = partes.join(', ');
        }

        if (coordenadasField && data.latitude && data.longitude) {
          coordenadasField.value = `${data.latitude}, ${data.longitude}`;
        }
      })
      .catch(() => {
        // sem internet, serviço fora do ar, bloqueado por extensão etc.
        // não é crítico — o convidado preenche a cidade manualmente.
      });
  }

  // ---- Mapa interativo (Bom Despacho - MG) -----------------------------------
  const mapEl = document.getElementById('mapa');
  const mapHint = document.getElementById('mapHint');

  function showMapFallback(motivo) {
    if (!mapEl) return;
    if (mapHint) mapHint.classList.add('hide');
    mapEl.innerHTML =
      '<div class="map-fallback">' +
      '<p>Não foi possível carregar o mapa interativo agora' + (motivo ? ' (' + motivo + ')' : '') + '.</p>' +
      '<a href="https://www.openstreetmap.org/search?query=Bom%20Despacho%2C%20MG" target="_blank" rel="noopener">Ver Bom Despacho, MG no OpenStreetMap ↗</a>' +
      '</div>';
  }

  if (mapEl) {
    if (!window.L) {
      // a lib do Leaflet não carregou (CDN bloqueado, sem internet, etc.)
      showMapFallback('sem conexão com o serviço de mapas');
    } else {
      try {
        const DESTINO = [-19.7358, -45.2519]; // Bom Despacho - MG
        const ZOOM_CHEGADA = 14;

        const map = L.map(mapEl, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView([-14.5, -48.5], 4); // visão ampla do Brasil

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const pinIcon = L.divIcon({
          className: 'map-pin',
          html: '<svg width="34" height="44" viewBox="0 0 40 52"><use href="#s-pin" fill="#E8607D"/></svg>',
          iconSize: [34, 44],
          iconAnchor: [17, 44],
          popupAnchor: [0, -40],
        });

        const marker = L.marker(DESTINO, { icon: pinIcon }).addTo(map);
        marker.bindPopup('<strong>Larissa &amp; Neto</strong><br />Bom Despacho — MG 💛');

        setTimeout(() => map.invalidateSize(), 300);

        // aproxima suavemente quando o usuário chega nesta seção
        const mapObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              map.invalidateSize();
              map.flyTo(DESTINO, ZOOM_CHEGADA, { duration: 3 });
              setTimeout(() => marker.openPopup(), 3200);
              mapObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });

        mapObserver.observe(mapEl);

        // libera o zoom por scroll só depois de um clique/toque (não sequestra a rolagem da página)
        const enableScrollZoom = () => {
          map.scrollWheelZoom.enable();
          if (mapHint) mapHint.classList.add('hide');
        };
        mapEl.addEventListener('click', enableScrollZoom, { once: true });
        mapEl.addEventListener('touchstart', enableScrollZoom, { once: true, passive: true });
      } catch (err) {
        console.error('Falha ao iniciar o mapa:', err);
        showMapFallback('erro inesperado');
      }
    }
  }

  // ---- Envio do formulário RSVP -----------------------------------
  // Por enquanto o envio é apenas simulado localmente.
  // Quando a integração com o Google Forms for feita, trocar este
  // handler por um fetch(action, { method: 'POST', mode: 'no-cors', body: formData }).
  const rsvpForm = document.getElementById('rsvpForm');
  const formFeedback = document.getElementById('formFeedback');

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!rsvpForm.checkValidity()) {
        rsvpForm.reportValidity();
        return;
      }

      const submitBtn = rsvpForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      setTimeout(() => {
        submitBtn.textContent = 'Enviado ✓';
        formFeedback.textContent = 'Obrigado por confirmar! Mal podemos esperar para celebrar com você. 💛';
        rsvpForm.reset();

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar confirmação';
        }, 2500);
      }, 700);
    });
  }
});
