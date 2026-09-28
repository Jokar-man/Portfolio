import { initHeader } from './shared/header.js';
import { ProfileBackground } from './profile/background.js';
import './profile/profile.css';

initHeader('profile');

const bgContainer = document.createElement('div');
document.body.appendChild(bgContainer);
new ProfileBackground(bgContainer);

const portraitUrl = `${import.meta.env.BASE_URL}image/${encodeURI('Lakshmi Narayanan.jpg')}`;

const SKILL_GROUPS = [
  {
    title: 'Spatial Data Engineering & Cloud',
    items: ['DuckDB', 'GeoParquet', 'Cloudflare R2', 'PostGIS', 'GDAL', 'GeoPandas', 'PyGIS', 'Docker', 'REST APIs', 'Google Cloud Platform (GCP)'],
  },
  {
    title: 'AI & Machine Learning',
    items: ['Agentic Workflows (n8n, Pydantic AI)', 'PyTorch', 'Computer Vision (YOLOv8, Segment Anything / SAM)', 'SHAP Explainability', 'NLP (Climate-BERT, DistilBERT)'],
  },
  {
    title: 'Simulation & Microclimate',
    items: ['Agent-Based Modeling (Mesa, PedSim)', 'CMIP6 Climate Projections', 'SOLWEIG', 'UTCI Thermal Comfort', 'CityGML', '3D Tiles', 'CityJSON'],
  },
  {
    title: 'Full-Stack & Graphics',
    items: ['Python', 'React', 'JavaScript', 'Three.js', 'Node.js', 'Rhino/Grasshopper', 'QGIS', 'ArcGIS Pro', 'Google Earth Engine'],
  },
];

const EXPERIENCE = [
  {
    role: 'Urban Computational Engineer — Geospatial Tools',
    dates: 'Sep 2025 — Present',
    company: 'Digital Blue Foam (Remote)',
    bullets: [
      'Engineered an end-to-end spatial-index data architecture using DuckDB, GeoParquet, and Cloudflare R2 to ingest, process, and query 1.6M+ Japanese cadastral records into the Hikari urban analytics engine.',
      'Architected and deployed an interactive multi-isochrone accessibility analysis application (React, HERE API, Overture Maps, OSM) delivered to Dubai Municipality, mapping network gaps across 200+ municipal facilities.',
      'Developed automated climate-risk pipelines translating downscaled CMIP6 projections into block-level flood indicators across Singapore, Japan, and Dubai masterplans.',
    ],
  },
  {
    role: 'Urban AI Researcher — 4D Climate Digital Twin',
    dates: 'Oct 2025 — Jun 2026',
    company: 'Barcelona Supercomputing Center (BSC) & IAAC (Barcelona, Spain)',
    bullets: [
      'Built a 4D Climate Digital Twin of Barcelona fusing LiDAR point clouds, satellite observations (LST, NDVI), and socioeconomic data across 73 census units.',
      'Applied regression pipelines and SHAP explainability to isolate microclimate risk drivers; coupled Mesa pedestrian agent simulations with SOLWEIG models to assess thermal comfort (UTCI) under alternative street designs.',
      'Presented thesis research at the CARTO Geospatial Foundational Models Workshop and the BSC Doctoral Symposium (2026).',
    ],
  },
  {
    role: 'Spatial Data Analyst — Mobility & Infrastructure Justice',
    dates: 'Apr 2025 — Aug 2025',
    company: 'GIZ / UNITAC (Rundu, Namibia)',
    bullets: [
      'Spearheaded GIS and agent-based mobility modeling (PedSim, ArcGIS) analyzing water-access networks and pedestrian displacement patterns in informal settlements under GIZ ethical field protocols.',
    ],
  },
  {
    role: 'Computational Designer & Project Architect',
    dates: 'Nov 2022 — Jul 2024',
    company: 'ABRD Architects (New Delhi, India)',
    bullets: [
      'Programmed Grasshopper and Python scripts to automate multi-objective generative massing and daylighting analyses across campus-scale masterplans.',
    ],
  },
];

const EDUCATION = [
  {
    title: 'Master of Science in City & Technology (Urban Computation)',
    dates: '2024 — 2026',
    place: 'Institute for Advanced Architecture of Catalonia (IAAC), Barcelona, Spain',
    note: 'Thesis conducted in formal collaboration with the Barcelona Supercomputing Center (BSC)',
  },
  {
    title: 'Bachelor of Architecture (B.Arch, Hons.)',
    dates: '2017 — 2022',
    place: 'School of Architecture and Planning, Anna University, Chennai, India',
  },
];

const TALKS = [
  { role: 'Presenter & Published Abstract', place: 'BSC Doctoral Symposium (Barcelona Supercomputing Center, 2026)' },
  { role: 'Selected Speaker', place: 'CARTO Geospatial Foundational Models Workshop (Barcelona, 2026)' },
];

const app = document.getElementById('app');
app.innerHTML = `
  <div class="cv-page">
    <section class="cv-hero">
      <img class="cv-portrait" src="${portraitUrl}" alt="Lakshmi Narayanan" />
      <div class="cv-hero-text">
        <h1>Lakshmi Narayanan</h1>
        <div class="cv-headline">Spatial AI &amp; Geospatial Data Engineer · Cloud Analytics &amp; Digital Twins</div>
        <div class="cv-meta-line">
          <span>Chennai, India (Open to Remote &amp; Global Relocation)</span>
          <span class="cv-meta-dot">·</span>
          <a href="mailto:narayanan004avictor@gmail.com">Email</a>
          <span class="cv-meta-dot">·</span>
          <a href="https://www.linkedin.com/in/lakshmi-narayanan-2b9b75177/" target="_blank" rel="noopener">LinkedIn</a>
          <span class="cv-meta-dot">·</span>
          <a href="https://github.com/Jokar-man" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Professional Overview</h2>
      <p class="cv-entry-desc">
        Geospatial Data and Spatial AI Engineer with 4+ years of experience engineering high-performance
        spatial data pipelines, interactive decision-support platforms, and climate digital twins.
        Specialized in modern cloud-native spatial architectures (DuckDB, GeoParquet, PostGIS), agentic
        AI workflows, and large-scale climate risk modeling (CMIP6). Proven record delivering production
        tools for municipal clients (including Dubai Municipality) and supercomputing research centers.
      </p>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Technical Stack</h2>
      ${SKILL_GROUPS.map(
        (group) => `
        <div class="cv-skill-group">
          <div class="cv-skill-group-title">${group.title}</div>
          <div class="cv-tags">
            ${group.items.map((item) => `<span class="cv-tag">${item}</span>`).join('')}
          </div>
        </div>
      `
      ).join('')}
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Work Experience</h2>
      ${EXPERIENCE.map(
        (job) => `
        <div class="cv-entry">
          <div class="cv-entry-period">${job.dates}</div>
          <div>
            <div class="cv-entry-title">${job.role}</div>
            <div class="cv-entry-place">${job.company}</div>
            <ul class="cv-bullets">
              ${job.bullets.map((b) => `<li>${b}</li>`).join('')}
            </ul>
          </div>
        </div>
      `
      ).join('')}
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Education</h2>
      ${EDUCATION.map(
        (edu) => `
        <div class="cv-entry">
          <div class="cv-entry-period">${edu.dates}</div>
          <div>
            <div class="cv-entry-title">${edu.title}</div>
            <div class="cv-entry-place">${edu.place}</div>
            ${edu.note ? `<p class="cv-entry-desc cv-entry-note">${edu.note}</p>` : ''}
          </div>
        </div>
      `
      ).join('')}
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Talks &amp; Industry Publications</h2>
      <ul class="cv-bullets">
        ${TALKS.map((talk) => `<li><strong>${talk.role}</strong>, ${talk.place}</li>`).join('')}
      </ul>
    </section>
  </div>
`;
