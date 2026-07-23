import { initHeader } from './shared/header.js';
import { ProfileBackground } from './profile/background.js';
import './profile/profile.css';

initHeader('profile');

const bgContainer = document.createElement('div');
document.body.appendChild(bgContainer);
new ProfileBackground(bgContainer);

const portraitUrl = `${import.meta.env.BASE_URL}image/${encodeURI('Lakshmi Narayanan.jpg')}`;

const app = document.getElementById('app');
app.innerHTML = `
  <div class="cv-page">
    <section class="cv-hero">
      <img class="cv-portrait" src="${portraitUrl}" alt="Lakshmi Narayanan" />
      <div class="cv-hero-text">
        <h1>Lakshmi Narayanan V</h1>
        <p>
          Architect - Computational designer - AI artist and urban researcher with three years of
          experience. My work sits at the intersection of architectural design, urban data and AI.
          I am currently in Barcelona, Spain, completing my Master's in City and Technology from
          IAAC as I gain more experience with advanced architecture and urbanism.
        </p>
      </div>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">About</h2>
      <p class="cv-entry-desc">
        My experience gives me strong skills in data-driven design, algorithmic computation,
        different intersectionality and knowledge about project management, construction
        techniques and material sciences. Feel free to connect — I am always interested in
        collaborating on projects, profitable and non-profitable.
      </p>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Experience</h2>
      <div class="cv-entry">
        <div class="cv-entry-period">2024 — Present</div>
        <div>
          <div class="cv-entry-title">Urban Computation &amp; AI Research</div>
          <div class="cv-entry-place">Barcelona, Spain</div>
          <p class="cv-entry-desc">
            Academic and independent research at IAAC combining GIS, machine learning and
            generative AI for participatory design and climate-vulnerability analysis
            (Open City Poblenou, Heat Archipelagos, Rundu Mobility Justice, Wildfire Vulnerability).
          </p>
        </div>
      </div>
      <div class="cv-entry">
        <div class="cv-entry-period">2021 — 2024</div>
        <div>
          <div class="cv-entry-title">Architect / Computational Designer</div>
          <div class="cv-entry-place">Hyderabad, India</div>
          <p class="cv-entry-desc">
            Delivered large-scale campus and corporate architecture (GV1 Chemical Campus, Capella
            School District, DNL) using parametric and algorithmic design workflows.
          </p>
        </div>
      </div>
      <p class="cv-placeholder-note">Placeholder timeline — replace with full work history.</p>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Education</h2>
      <div class="cv-entry">
        <div class="cv-entry-period">2024 — Present</div>
        <div>
          <div class="cv-entry-title">M.Sc. City &amp; Technology</div>
          <div class="cv-entry-place">IAAC — Institute for Advanced Architecture of Catalonia, Barcelona</div>
        </div>
      </div>
      <div class="cv-entry">
        <div class="cv-entry-period">— placeholder —</div>
        <div>
          <div class="cv-entry-title">Bachelor of Architecture</div>
          <div class="cv-entry-place">(add institution)</div>
        </div>
      </div>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Skills</h2>
      <div class="cv-tags">
        ${[
          'Python', 'Rhino', 'Grasshopper', 'AutoCAD', 'SketchUp', 'QGIS', 'ArcGIS',
          'Google Earth Engine', 'AI / ML', 'N8N', 'RAG Agents', 'ComfyUI', 'OpenCV',
          'Pandas', 'Scikit-learn', 'Three.js', 'D3.js', 'Git',
        ]
          .map((tag) => `<span class="cv-tag">${tag}</span>`)
          .join('')}
      </div>
    </section>

    <section class="cv-section">
      <h2 class="cv-section-title">Contact</h2>
      <div class="cv-contact-links">
        <a class="cv-contact-link" href="mailto:narayanan004avictor@gmail.com">Email</a>
        <a class="cv-contact-link" href="https://www.linkedin.com/in/lakshmi-narayanan-2b9b75177/" target="_blank" rel="noopener">LinkedIn</a>
        <a class="cv-contact-link" href="https://github.com/Jokar-man" target="_blank" rel="noopener">GitHub</a>
      </div>
    </section>
  </div>
`;
