import { morph } from './morph.js';

window.Pulse = {
  emit: (event, data) => {
    window.dispatchEvent(new CustomEvent(`pulse:${event}`, { detail: data }));
  },
  on: (event, cb) => {
    window.addEventListener(`pulse:${event}`, cb);
  }
};

document.addEventListener('click', async (e) => {
  const a = e.target.closest('a');
  if (!a || !a.href || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;

  e.preventDefault();
  const url = a.href;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.inert.pulse+json'
      }
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    if (res.ok) {
      const manifest = await res.json();
      
      if (manifest.title) document.title = manifest.title;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(manifest.viewHtml, 'text/html');
      
      // Morph the view container (assume <main id="inert-view"> or fallback to first element)
      const newMain = doc.getElementById('inert-view') || doc.body.firstElementChild;
      const viewContainer = document.getElementById('inert-view');
      
      if (viewContainer && newMain) {
        morph(viewContainer, newMain);
      } else {
        window.location.href = url;
        return;
      }

      window.history.pushState(null, '', url);
      window.Pulse.emit('navigated', manifest.data);
    } else {
      window.location.href = url;
    }
  } catch (err) {
    window.location.href = url;
  }
});

window.addEventListener('popstate', () => {
  window.location.reload();
});
