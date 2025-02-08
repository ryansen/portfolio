import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let selectedIndex = -1; // Track selected wedge index
let projects = [];
let projectsContainer = document.querySelector('.projects');
let projectCountElement = document.getElementById('project-count');

(async function () {
    if (!projectsContainer || !projectCountElement) {
        console.error('Projects container or count element not found!');
        return;
    }

    projects = await fetchJSON('../lib/projects.json');
    console.log('Fetched projects:', projects);

    projectCountElement.textContent = projects.length;
    renderProjects(projects, projectsContainer, 'h2');
    renderPieChart(projects);
})();

// Render Pie Chart
function renderPieChart(projectsGiven) {
    if (!projectsGiven || projectsGiven.length === 0) {
        console.warn("No projects available for visualization.");
        return;
    }

    // Aggregate projects by year
    let newData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    ).map(([year, count]) => ({
        value: count,
        label: String(year)
    }));

    let radius = 50;
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    let pieGenerator = d3.pie().value((d) => d.value);
    let arcData = pieGenerator(newData);

    let svg = d3.select('#projects-pie-plot');
    svg.selectAll("*").remove();

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Append paths (wedges)
    let slices = svg.selectAll('path')
        .data(arcData)
        .enter()
        .append('path')
        .attr('d', arcGenerator)
        .attr('fill', (d, i) => colors(i))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('class', 'wedge')
        .on('click', function (event, d) {
            let clickedIndex = newData.findIndex(item => item.label === d.data.label);
            selectedIndex = selectedIndex === clickedIndex ? -1 : clickedIndex;
            updateSelection(slices, legendItems, colors, newData);
            updateProjectDisplay(newData);
        });

    // Generate legend
    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    let legendItems = legend.selectAll('li')
        .data(newData)
        .enter()
        .append('li')
        .attr('style', (d, idx) => `--color:${colors(idx)}`)
        .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
        .on('click', function (event, d) {
            let clickedIndex = newData.findIndex(item => item.label === d.label);
            selectedIndex = selectedIndex === clickedIndex ? -1 : clickedIndex;
            updateSelection(slices, legendItems, colors, newData);
            updateProjectDisplay(newData);
        });

    // Initial selection state
    updateSelection(slices, legendItems, colors, newData);
}

// Update selection state (highlights the selected wedge & legend)
function updateSelection(slices, legendItems, colors, data) {
    slices.each(function (d, i) {
        let wedge = d3.select(this);
        let isSelected = i === selectedIndex;
        wedge.classed('selected', isSelected);
        wedge.attr('fill', isSelected ? "#ff9800" : colors(i)); // Highlight color
    });

    legendItems.each(function (d, i) {
        d3.select(this).classed('selected', i === selectedIndex);
    });
}

// Filter projects based on selected pie wedge
function updateProjectDisplay(data) {
    if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
    } else {
        let selectedYear = data[selectedIndex].label;
        let filteredProjects = projects.filter(p => String(p.year) === selectedYear);
        renderProjects(filteredProjects, projectsContainer, 'h2');
    }
}