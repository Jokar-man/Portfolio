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

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Tool anchors are derived directly from each project's real `tools` list — no
// heuristic inference. The id is a slug of the label so every project referencing
// the same tool string links to the same anchor.
const toolLabelToId = new Map();
projects.forEach((project) => {
  (project.tools || []).forEach((label) => {
    if (!toolLabelToId.has(label)) toolLabelToId.set(label, slugify(label));
  });
});

export const tools = [...toolLabelToId.entries()].map(([label, id]) => ({ id, label }));

export const links = [];
projects.forEach((project) => {
  (project.categories || []).forEach((category) => {
    const topicId = CATEGORY_TO_TOPIC_ID[category];
    if (topicId) links.push({ source: topicId, project: project.id, weight: 2 });
  });
  (project.tools || []).forEach((label) => {
    const toolId = toolLabelToId.get(label);
    links.push({ source: toolId, project: project.id, weight: 1 });
  });
});

export function anchorById(id) {
  return topics.find((t) => t.id === id) || tools.find((t) => t.id === id);
}
