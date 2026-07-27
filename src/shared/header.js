import './style.css';

const ROLES = [
  'Architect',
  'Urban Computational Engineer',
  'Applied AI researcher',
  'Geospatial analyst',
  'Data driven urban planner',
];

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', href: 'profile.html' },
  { id: 'projects', label: 'Projects', href: 'index.html' },
];

/**
 * Injects the shared identity header (name + rotating role) and the
 * left-edge vertical tab nav. `activePage` is one of 'profile' | 'projects'.
 */
export function initHeader(activePage) {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="site-name">Lakshmi Narayanan</div>
    <div class="site-role"><span class="role-slide">${ROLES[0]}</span></div>
  `;
  document.body.appendChild(header);

  const nav = document.createElement('nav');
  nav.className = 'side-nav';
  nav.innerHTML = NAV_ITEMS.map(
    (item) =>
      `<a class="side-nav-item${item.id === activePage ? ' active' : ''}" href="${item.href}">${item.label}</a>`
  ).join('');
  document.body.appendChild(nav);

  const roleEl = header.querySelector('.role-slide');
  let roleIndex = 0;
  const intervalId = setInterval(() => {
    roleEl.classList.add('hidden');
    setTimeout(() => {
      roleIndex = (roleIndex + 1) % ROLES.length;
      roleEl.textContent = ROLES[roleIndex];
      roleEl.classList.remove('hidden');
    }, 400);
  }, 10000);

  window.addEventListener(
    'pagehide',
    () => clearInterval(intervalId),
    { once: true }
  );
}
