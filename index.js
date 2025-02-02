import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';
(async function () {
  try {
    // Select the container for projects
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Projects container not found!');
      return;
    }

    // Fetch projects data
    const projects = await fetchJSON('./lib/projects.json');
    console.log('Fetched projects:', projects); // Debugging log

    // Check if projects were successfully fetched
    if (!projects || projects.length === 0) {
      console.error('No projects found in the fetched data.');
      projectsContainer.innerHTML = '<p>No projects to display.</p>';
      return;
    }

    // Get the first 3 projects
    const latestProjects = projects.slice(0, 3);
    console.log('Latest projects:', latestProjects); // Debugging log

    // Render the projects
    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error fetching or rendering projects:', error);
  }
})();

const githubData = await fetchGitHubData('ryansen');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}


(async function () {
    const githubData = await fetchGitHubData();
    console.log('GitHub Data:', githubData); // Check if this logs the fetched GitHub data
  })();

  