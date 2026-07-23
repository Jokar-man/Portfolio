// Placeholder tool/skill data derived from the current site's existing D3 skills graph.
// Replace with real project/tool data later — shape must stay the same:
//   anchors: [{ id, label }]
//   bubbles: { name, children: [{ name, children: [{ name, value }] }] }
//   connections: [{ anchor, bubble }]  (bubble refers to a top-level bubbles.children[].name)

export const anchors = [
  { id: 'python', label: 'Python' },
  { id: 'rhino-gh', label: 'Rhino / Grasshopper' },
  { id: 'gis', label: 'QGIS / ArcGIS' },
  { id: 'gee', label: 'Google Earth Engine' },
  { id: 'ai-agents', label: 'N8N / RAG Agents' },
  { id: 'web', label: 'Three.js / D3.js' },
  { id: 'data-tools', label: 'Pandas / Scikit-learn' },
];

export const bubbles = {
  name: 'root',
  children: [
    {
      name: 'Programming',
      children: [
        { name: 'Python', value: 75 },
        { name: 'JavaScript', value: 25 },
        { name: 'Java', value: 25 },
        { name: 'R', value: 35 },
      ],
    },
    {
      name: 'AI/ML',
      children: [
        { name: 'AI/ML', value: 85 },
        { name: 'N8N', value: 85 },
        { name: 'RAG Agent', value: 80 },
        { name: 'Scikit-learn', value: 70 },
        { name: 'OpenCV', value: 75 },
        { name: 'Roboflow', value: 70 },
      ],
    },
    {
      name: 'Design',
      children: [
        { name: 'Rhino', value: 95 },
        { name: 'Grasshopper', value: 90 },
        { name: 'AutoCAD', value: 95 },
        { name: 'SketchUp', value: 95 },
      ],
    },
    {
      name: 'GIS',
      children: [
        { name: 'QGIS', value: 95 },
        { name: 'ArcGIS', value: 65 },
        { name: 'Google Earth Engine', value: 90 },
      ],
    },
    {
      name: 'Web',
      children: [
        { name: 'HTML/CSS', value: 85 },
        { name: 'Node.js', value: 35 },
        { name: 'D3.js', value: 35 },
        { name: 'Three.js', value: 55 },
      ],
    },
    {
      name: 'Data',
      children: [
        { name: 'Pandas', value: 90 },
        { name: 'Matplotlib', value: 80 },
        { name: 'Plotly', value: 75 },
      ],
    },
    {
      name: 'Cloud',
      children: [
        { name: 'AWS', value: 30 },
        { name: 'Git', value: 80 },
      ],
    },
  ],
};

export const connections = [
  { anchor: 'python', bubble: 'Programming' },
  { anchor: 'python', bubble: 'Data' },
  { anchor: 'rhino-gh', bubble: 'Design' },
  { anchor: 'rhino-gh', bubble: 'Programming' },
  { anchor: 'gis', bubble: 'GIS' },
  { anchor: 'gee', bubble: 'GIS' },
  { anchor: 'gee', bubble: 'Web' },
  { anchor: 'ai-agents', bubble: 'AI/ML' },
  { anchor: 'ai-agents', bubble: 'Programming' },
  { anchor: 'web', bubble: 'Web' },
  { anchor: 'data-tools', bubble: 'Data' },
  { anchor: 'data-tools', bubble: 'AI/ML' },
];
