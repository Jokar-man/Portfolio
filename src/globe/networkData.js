import projects from '../../data/projects.json';

export const topics = [
  { id: 'urban-computation', label: 'Urban Computation' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'geospatial-research', label: 'Geospatial Research' },
  { id: 'ai-for-built-environment', label: 'AI for Built Environment' },
  { id: 'connections', label: 'Connections' },
  { id: 'design-engineering', label: 'Design Engineering' },
  { id: 'software', label: 'Software' },
];

const CATEGORY_TO_TOPIC_ID = {
  'Urban Computation': 'urban-computation',
  Architecture: 'architecture',
  'Geospatial Research': 'geospatial-research',
  'AI for Built Environment': 'ai-for-built-environment',
  Connections: 'connections',
  'Design Engineering': 'design-engineering',
  Software: 'software',
  Urbanism: 'architecture', // fold the one non-standard tag (IUDI) into its closest official topic
};

// Placeholder — there's no per-project tool tagging yet, so links below are inferred
// from each project's categories as a reasonable starting point. Replace `inferToolIds`
// with real per-project tool lists once that data exists.
export const tools = [
  { id: 'python', label: 'Python' },
  { id: 'rhino-gh', label: 'Rhino / Grasshopper' },
  { id: 'gis', label: 'QGIS / ArcGIS' },
  { id: 'gee', label: 'Google Earth Engine' },
  { id: 'ai-agents', label: 'N8N / RAG Agents' },
  { id: 'three-d3', label: 'Three.js / D3.js' },
  { id: 'data-tools', label: 'Pandas / Scikit-learn' },
];

function inferToolIds(project) {
  const cats = new Set(project.categories || []);
  const ids = new Set();
  if (cats.has('Geospatial Research')) {
    ids.add('gis');
    ids.add('gee');
  }
  if (cats.has('AI for Built Environment') || cats.has('Connections')) ids.add('ai-agents');
  if (cats.has('Design Engineering') || cats.has('Architecture')) ids.add('rhino-gh');
  if (cats.has('Software') || cats.has('Urban Computation')) {
    ids.add('python');
    ids.add('data-tools');
  }
  if (cats.has('Software')) ids.add('three-d3');
  return [...ids];
}

export const links = [];
projects.forEach((project) => {
  (project.categories || []).forEach((category) => {
    const topicId = CATEGORY_TO_TOPIC_ID[category];
    if (topicId) links.push({ source: topicId, project: project.id, weight: 2 });
  });
  inferToolIds(project).forEach((toolId) => {
    links.push({ source: toolId, project: project.id, weight: 1 });
  });
});

export function anchorById(id) {
  return topics.find((t) => t.id === id) || tools.find((t) => t.id === id);
}
