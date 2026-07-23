function imageUrl(path) {
  return `${import.meta.env.BASE_URL}image/${encodeURI(path)}`;
}

export function createHoverPopup() {
  const el = document.createElement('div');
  el.className = 'project-popup';
  el.innerHTML = `
    <div class="project-popup-title"></div>
    <div class="project-popup-meta"></div>
  `;
  document.body.appendChild(el);

  function show(project, x, y) {
    el.querySelector('.project-popup-title').textContent = project.title;
    el.querySelector('.project-popup-meta').textContent = `${project.year} • ${project.location}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.add('visible');
  }

  function hide() {
    el.classList.remove('visible');
  }

  return { el, show, hide };
}

export function createDetailPanel({ onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'project-detail';
  el.innerHTML = `
    <button class="project-detail-close" aria-label="Close">✕</button>
    <img class="project-detail-image" />
    <div class="project-detail-body">
      <div class="project-detail-title"></div>
      <div class="project-detail-meta"></div>
      <p class="project-detail-description"></p>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('.project-detail-close').addEventListener('click', () => {
    if (onClose) onClose();
  });

  function show(project) {
    el.querySelector('.project-detail-title').textContent = project.title;
    el.querySelector('.project-detail-meta').textContent = `${project.year} • ${project.location}`;
    el.querySelector('.project-detail-description').textContent = project.description;
    const img = el.querySelector('.project-detail-image');
    img.src = imageUrl(project.image);
    img.alt = project.title;
    el.classList.add('visible');
  }

  function hide() {
    el.classList.remove('visible');
  }

  return { el, show, hide };
}
