console.log('IT’S ALIVE!');


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


let pages = [
  { url: 'https://ryansen.github.io/portfolio/', title: 'Home' },
  { url: 'https://ryansen.github.io/portfolio/projects/', title: 'Projects' },
  { url: 'https://ryansen.github.io/portfolio/resume/', title: 'Resume' },
  { url: 'https://ryansen.github.io/portfolio/contact/', title: 'Contact' },
  { url: 'https://github.com/ryansen', title: 'Github' },
];


let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);
  const a = nav.lastElementChild; 


  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
}


document.body.insertAdjacentHTML(
  'afterbegin',
  `<label class="color-scheme">
      Theme:
      <select name="mode">
        <option value="light">Light Mode</option>
        <option value="dark">Dark Mode</option>
      </select>
  </label>`
);


const themeSelector = document.querySelector('select[name="mode"]');
const root = document.documentElement;


themeSelector.addEventListener('input', function (event) {
  const selectedTheme = event.target.value;
  console.log('color scheme changed to', selectedTheme);

  root.style.setProperty('color-scheme', selectedTheme);


  localStorage.setItem('theme', selectedTheme);
});

const savedTheme = localStorage.getItem('theme') || 'light';
themeSelector.value = savedTheme;
root.style.setProperty('color-scheme', savedTheme);

export async function fetchJSON(url) {
  try {
      console.log(`Fetching JSON from: ${url}`); // Debugging
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error(`Failed to fetch JSON: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched data:', data); // Debugging
      return data;
  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
      return []; // Return an empty array on error
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!(containerElement instanceof Element)) {
    console.error('Invalid container element:', containerElement);
    return;
  }

  if (!Array.isArray(projects)) {
    console.error('Invalid projects data:', projects);
    return;
  }

  containerElement.innerHTML = ''; // Clear previous content

  projects.forEach(project => {
    if (!project.title || !project.description) {
      console.warn('Skipping project due to missing title or description:', project);
      return;
    }

    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      ${project.image ? `<img src="${project.image}" alt="${project.title}">` : ''}
      <p>${project.description}</p>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  try {
    const url = `https://api.github.com/users/${username}`;
    console.log(`Fetching GitHub data from: ${url}`); // Debugging log
    const data = await fetchJSON(url);
    console.log('Fetched GitHub data:', data); // Debugging log
    return data;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return null; // Return null on error
  }
}