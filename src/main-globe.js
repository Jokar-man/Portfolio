import { initHeader } from './shared/header.js';
import { Globe } from './globe/Globe.js';
import projects from '../data/projects.json';

initHeader('projects');

const container = document.getElementById('app');
new Globe(container, projects);
