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

  // ---- Pedido de casamento: fotos em sequência ------------------------------
  const proposalShow = document.querySelector('[data-proposal-show]');
  if (proposalShow) {
    const slides = [...proposalShow.querySelectorAll('.proposal-slide')];
    const progress = [...proposalShow.querySelectorAll('.proposal-progress span')];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (slides.length > 1 && !reduceMotion) {
      let activeIndex = 0;
      let intervalId;

      const showNextSlide = () => {
        slides[activeIndex].classList.remove('is-active');
        slides[activeIndex].setAttribute('aria-hidden', 'true');
        progress[activeIndex].classList.remove('is-active');

        activeIndex = (activeIndex + 1) % slides.length;

        slides[activeIndex].classList.add('is-active');
        slides[activeIndex].removeAttribute('aria-hidden');
        progress[activeIndex].classList.add('is-active');
      };

      const startShow = () => {
        if (!intervalId) intervalId = window.setInterval(showNextSlide, 5200);
      };

      const stopShow = () => {
        window.clearInterval(intervalId);
        intervalId = undefined;
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopShow();
        else startShow();
      });

      startShow();
    }
  }

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
  const cidadeInput = document.getElementById('cidade');
  const coordenadasField = document.getElementById('geoCoordenadas');
  const locationButton = document.getElementById('useCurrentLocation');
  const locationStatus = document.getElementById('locationStatus');

  if (cidadeInput) {
    let cidadeEditadaPeloUsuario = false;
    let localizacaoDoDispositivoAplicada = false;
    cidadeInput.addEventListener('input', () => { cidadeEditadaPeloUsuario = true; });

    const fetchJson = async (url, timeoutMs = 5000) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const applyLocation = ({ city, region, latitude, longitude }, message, fromDevice = false) => {
      if (localizacaoDoDispositivoAplicada && !fromDevice) return;
      if (fromDevice) localizacaoDoDispositivoAplicada = true;

      if (!cidadeEditadaPeloUsuario && city && (fromDevice || !cidadeInput.value.trim())) {
        cidadeInput.value = [city, region].filter(Boolean).join(', ');
      }

      if (coordenadasField && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        coordenadasField.value = `${latitude}, ${longitude}`;
      }

      if (locationStatus) locationStatus.textContent = message;
    };

    const ipLocationProviders = [
      async () => {
        const data = await fetchJson('https://ipapi.co/json/');
        if (!data || data.error || !data.city) throw new Error('ipapi indisponível');
        return {
          city: data.city,
          region: data.region_code || data.region,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
      },
      async () => {
        const data = await fetchJson('https://ipwho.is/');
        if (!data || !data.success || !data.city) throw new Error('ipwho indisponível');
        return {
          city: data.city,
          region: data.region,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
      },
    ];

    const suggestLocationByIp = async () => {
      for (const getLocation of ipLocationProviders) {
        try {
          const location = await getLocation();
          applyLocation(location, 'Cidade sugerida pela rede. Você pode corrigir antes de enviar.');
          return;
        } catch {
          // Tenta outro provedor se o primeiro estiver bloqueado ou indisponível.
        }
      }

      if (locationStatus) {
        locationStatus.textContent = 'Não foi possível sugerir sua cidade. Preencha o campo ou use o GPS.';
      }
    };

    if (locationButton) {
      locationButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
          if (locationStatus) locationStatus.textContent = 'Este navegador não oferece localização por GPS.';
          return;
        }

        locationButton.disabled = true;
        if (locationStatus) locationStatus.textContent = 'Aguardando autorização de localização…';

        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
          const latitude = coords.latitude;
          const longitude = coords.longitude;
          let city = '';
          let region = '';

          try {
            const params = new URLSearchParams({
              latitude: String(latitude),
              longitude: String(longitude),
              localityLanguage: 'pt',
            });
            const address = await fetchJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
            city = address.city || address.locality || '';
            region = address.principalSubdivision || '';
          } catch {
            // Guarda as coordenadas mesmo se o serviço de cidade falhar.
          }

          applyLocation(
            { city, region, latitude, longitude },
            city ? 'Localização do celular aplicada.' : 'GPS localizado; não identificamos a cidade. Preencha o campo manualmente.',
            true
          );
          locationButton.disabled = false;
        }, (error) => {
          const message = error.code === error.PERMISSION_DENIED
            ? 'Permissão negada. Autorize a localização nas configurações do navegador ou preencha manualmente.'
            : 'Não foi possível obter o GPS. Confira a permissão e tente novamente.';
          if (locationStatus) locationStatus.textContent = message;
          locationButton.disabled = false;
        }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
      });
    }

    suggestLocationByIp();
  }

  // ---- Mapa interativo (Chácara da Vó Elo, Bom Despacho - MG) ----------------
  const mapEl = document.getElementById('mapa');
  const mapHint = document.getElementById('mapHint');

  function showMapFallback(motivo) {
    if (!mapEl) return;
    if (mapHint) mapHint.classList.add('hide');
    mapEl.innerHTML =
      '<div class="map-fallback">' +
      '<p>Não foi possível carregar o mapa interativo agora' + (motivo ? ' (' + motivo + ')' : '') + '.</p>' +
      '<a href="https://www.google.com/maps/search/?api=1&query=Ch%C3%A1cara%20da%20V%C3%B3%20Elo%2C%20Ch%C3%A1cara%2048%2C%20Alameda%20dos%20Jequitib%C3%A1s%2C%20Condom%C3%ADnio%20Pica-Pau%20II%2C%20Bom%20Despacho%2C%20MG" target="_blank" rel="noopener noreferrer">Abrir Chácara da Vó Elo no Google Maps ↗</a>' +
      '</div>';
  }

  if (mapEl) {
    if (!window.L) {
      // a lib do Leaflet não carregou (CDN bloqueado, sem internet, etc.)
      showMapFallback('sem conexão com o serviço de mapas');
    } else {
      try {
        const DESTINO = [-19.76146489888384, -45.2313819548535]; // Pin fornecido para a Chácara da Vó Elo
        const ZOOM_CHEGADA = 17;

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
        marker.bindPopup('<strong>Chácara da Vó Elo</strong><br />Chácara 48 · Alameda dos Jequitibás<br />Condomínio Pica-Pau II 💛');

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
