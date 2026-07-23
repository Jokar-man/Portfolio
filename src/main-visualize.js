import { initHeader } from './shared/header.js';
import { NeuralWeave } from './visualize/NeuralWeave.js';

initHeader('visualize');

const container = document.getElementById('app');
new NeuralWeave(container);
