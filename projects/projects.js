import { fetchJSON, renderProjects } from '../global.js';

(async function () {
    const projectsContainer = document.querySelector('.projects');
    const projectCountElement = document.getElementById('project-count'); // Select the project count element

    if (!projectsContainer || !projectCountElement) {
        console.error('Projects container or count element not found!');
        return;
    }

    const projects = await fetchJSON('../lib/projects.json');
    console.log('Fetched projects:', projects); // Debugging

    // Update the project count
    projectCountElement.textContent = projects.length;

    // Render the projects
    renderProjects(projects, projectsContainer, 'h2');
})();