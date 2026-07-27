function imageUrl(path) {
  return `${import.meta.env.BASE_URL}image/${encodeURI(path)}`;
}

function keywordLine(project) {
  return [project.affiliation, project.scope].filter(Boolean).join(' · ');
}

/** An <img> when the project has a real image yet, otherwise a lettered placeholder tile. */
function buildImageEl(project, className) {
  if (project.image) {
    const img = document.createElement('img');
    img.className = className;
    img.src = imageUrl(project.image);
    img.alt = project.title;
    return img;
  }
  const placeholder = document.createElement('div');
  placeholder.className = `${className} image-placeholder`;
  placeholder.textContent = project.title.charAt(0).toUpperCase();
  return placeholder;
}

/**
 * A small, always-on chamfered chip (thumbnail + title + affiliation/scope) that sits
 * above a project's marker on the flat map. Positioned every frame via screen-space
 * projection in Globe.js. It's a real DOM button, not a raycast target, so clicking it
 * is never affected by OrbitControls' pointer handling on the canvas underneath.
 */
export function createMarkerChip(project, onSelect) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'marker-chip';
  el.appendChild(buildImageEl(project, 'marker-chip-image'));

  const body = document.createElement('div');
  body.className = 'marker-chip-body';
  body.innerHTML = `
    <span class="marker-chip-title"></span>
    <span class="marker-chip-meta"></span>
  `;
  body.querySelector('.marker-chip-title').textContent = project.title;
  body.querySelector('.marker-chip-meta').textContent = keywordLine(project);
  el.appendChild(body);

  document.body.appendChild(el);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect(project);
  });

  function setPosition(x, y) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function setVisible(visible) {
    el.classList.toggle('visible', visible);
  }

  function destroy() {
    el.remove();
  }

  return { el, setPosition, setVisible, destroy };
}

export function createDetailPanel({ onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'project-detail';
  el.innerHTML = `
    <button class="project-detail-close" aria-label="Close">✕</button>
    <div class="project-detail-image-slot"></div>
    <div class="project-detail-body">
      <div class="project-detail-title"></div>
      <div class="project-detail-meta"></div>
      <div class="project-detail-tags"></div>
      <p class="project-detail-description"></p>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('.project-detail-close').addEventListener('click', () => {
    if (onClose) onClose();
  });

  function show(project) {
    el.querySelector('.project-detail-title').textContent = project.title;
    el.querySelector('.project-detail-meta').textContent = [project.location, keywordLine(project)]
      .filter(Boolean)
      .join(' • ');

    const tagsEl = el.querySelector('.project-detail-tags');
    tagsEl.innerHTML = '';
    (project.categories || []).forEach((category) => {
      const tag = document.createElement('span');
      tag.className = 'project-detail-tag';
      tag.textContent = category;
      tagsEl.appendChild(tag);
    });

    el.querySelector('.project-detail-description').textContent = project.description;

    const slot = el.querySelector('.project-detail-image-slot');
    slot.innerHTML = '';
    slot.appendChild(buildImageEl(project, 'project-detail-image'));

    el.classList.add('visible');
  }

  function hide() {
    el.classList.remove('visible');
  }

  return { el, show, hide };
}
