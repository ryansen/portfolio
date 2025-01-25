console.log('IT’S ALIVE!');


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
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