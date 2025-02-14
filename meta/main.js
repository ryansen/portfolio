// Import D3
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
const width = 1000;
const height = 600;
const margin = { top: 50, right: 30, bottom: 50, left: 70 }; // Increased bottom and top margins
let xScale, yScale, brushSelection = null;
// Load CSV Data
async function loadData() {
  try {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: +row.line || 0,
      depth: +row.depth || 0,
      length: +row.length || 0,
      date: row.date ? new Date(row.date + 'T00:00' + row.timezone) : null,
      datetime: row.datetime ? new Date(row.datetime) : null,
      file: row.file || "Unknown"
    }));
    
    data = await d3.csv('https://raw.githubusercontent.com/ryansen/portfolio/main/meta/loc.csv');
    if (!data.length) throw new Error("CSV file is empty or could not be read");

    console.log("Loaded Data:", data);

    processCommits();
    displayStats();
    visualizeTimeAndDay();
  } catch (error) {
    console.error("Error loading CSV:", error);
  }
}

// Process commits data
function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      if (!first) return null;

      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: `https://github.com/YOUR_REPO/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime?.getHours() + datetime?.getMinutes() / 60 || 0,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        enumerable: false,
      });

      return ret;
    }).filter(Boolean);

  console.log("Processed Commits:", commits);
}

// Display stats using D3
function displayStats() {
  const statsContainer = d3.select('#stats');
  statsContainer.html(""); // Clear existing content

  const dl = statsContainer.append('dl').attr('class', 'stats');

  // Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Number of files
  const numFiles = d3.groups(data, (d) => d.file).length;
  dl.append('dt').text('Total Files');
  dl.append('dd').text(numFiles);

  // Maximum file length
  const maxFileLength = d3.max(data, (d) => d.line);
  dl.append('dt').text('Longest File (lines)');
  dl.append('dd').text(maxFileLength || 0);

  // Most Active Time Period
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString("en", { dayPeriod: "short" })
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
  dl.append('dt').text('Most Active Period');
  dl.append('dd').text(maxPeriod || "Unknown");
}

// Step 2: Visualizing time and day of commits
function visualizeTimeAndDay() {
  const timeOfDayData = d3.rollups(
    commits,
    (v) => v.length,
    (d) => d.datetime?.getHours() || 0
  );

  const dayOfWeekData = d3.rollups(
    commits,
    (v) => v.length,
    (d) => d.datetime?.getDay() || 0
  );

  const timeData = timeOfDayData.map(([hour, count]) => ({ hour, count }));
  const dayData = dayOfWeekData.map(([day, count]) => ({ day, count }));

  const width = 400;
  const height = 250;
  const margin = { top: 50, right: 30, bottom: 30, left: 40 };

  const svgTime = d3
    .select("#stats")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const svgDay = d3
    .select("#stats")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const xScaleTime = d3.scaleBand()
    .domain(timeData.map(d => d.hour))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const yScaleTime = d3.scaleLinear()
    .domain([0, d3.max(timeData, d => d.count) || 1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const xScaleDay = d3.scaleBand()
    .domain(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const yScaleDay = d3.scaleLinear()
    .domain([0, d3.max(dayData, d => d.count) || 1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svgTime.selectAll("rect")
    .data(timeData)
    .enter()
    .append("rect")
    .attr("x", d => xScaleTime(d.hour))
    .attr("y", d => yScaleTime(d.count))
    .attr("height", d => yScaleTime(0) - yScaleTime(d.count))
    .attr("width", xScaleTime.bandwidth())
    .attr("fill", "steelblue");

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  svgDay.selectAll("rect")
    .data(dayData)
    .enter()
    .append("rect")
    .attr("x", d => xScaleDay(days[d.day]))
    .attr("y", d => yScaleDay(d.count))
    .attr("height", d => yScaleDay(0) - yScaleDay(d.count))
    .attr("width", xScaleDay.bandwidth())
    .attr("fill", "orange");

  svgTime.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScaleTime).tickFormat(d => `${d}:00`));

  svgDay.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScaleDay));

  svgTime.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScaleTime));

  svgDay.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScaleDay));

  svgTime.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Commits by Hour");

  svgDay.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Commits by Day of the Week");
}

// Function to update the tooltip content
// Function to update the tooltip content
function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');
  
    // If commit is empty, hide the tooltip and exit
    if (Object.keys(commit).length === 0) {
      document.getElementById('commit-tooltip').style.display = 'none';
      return;
    }
  
    // Populate the tooltip with commit details
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author || "Unknown";
    lines.textContent = commit.totalLines || 0;
  
    // Show the tooltip
    document.getElementById('commit-tooltip').style.display = 'block';
  }
// Function to update tooltip visibility
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }
// Function to update tooltip position based on mouse location
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    
    // Position the tooltip near the mouse cursor with a small offset
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
  }


function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush());
  }


  function applyBrushing(svg, dots) {
    const brush = d3.brush()
      .on("start brush end", brushed);
  
    svg.append("g")
       .attr("class", "brush")
       .call(brush);
  
    // Ensure dots are on top
    svg.selectAll(".dots, .overlay ~ *").raise();
  }

  function brushed(event) {
    brushSelection = event.selection;
    updateSelection();  // This now updates selection count and language breakdown too
  }
  

  function isCommitSelected(commit) {
    if (!brushSelection) return false;
  
    const [[x0, y0], [x1, y1]] = brushSelection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
  
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }

  function updateSelection() {
    d3.selectAll("circle").classed("selected", (d) => isCommitSelected(d));
  
    // Call functions to update selection count and language breakdown
    updateSelectionCount();
    updateLanguageBreakdown();
  }
  

  function updateSelectionCount() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
  
    document.getElementById('selection-count').textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

  function updateLanguageBreakdown() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
  
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update HTML
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
          <dt>${language}</dt>
          <dd>${count} lines (${formatted})</dd>
      `;
    }
  }
  function createScatterplot() {
    const width = 1000, height = 600;
    const margin = { top: 50, right: 30, bottom: 50, left: 70 };
  
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    };
  
    const svg = d3.select("#chart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .style("overflow", "visible");
  
    if (!commits.length) {
      console.error("No commits data available for scatterplot.");
      return;
    }
  
    // Assign global scales
    xScale = d3.scaleTime()
               .domain(d3.extent(commits, d => d.datetime))
               .range([usableArea.left, usableArea.right])
               .nice();
  
    yScale = d3.scaleLinear()
               .domain([0, 24])
               .range([usableArea.bottom, usableArea.top]);
  
    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(6);
  
    svg.append("g")
       .attr("transform", `translate(0, ${usableArea.bottom})`)
       .call(xAxis);
  
    svg.append("g")
       .attr("transform", `translate(${usableArea.left}, 0)`)
       .call(yAxis);
  
    // Use square root scale for radius
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  
    const dots = svg.append("g")
                    .attr("class", "dots")
                    .selectAll("circle")
                    .data(sortedCommits)
                    .enter()
                    .append("circle")
                    .attr("cx", d => xScale(d.datetime))
                    .attr("cy", d => yScale(d.hourFrac))
                    .attr("r", d => rScale(d.totalLines))
                    .attr("fill", "steelblue")
                    .style("fill-opacity", 0.7)
                    .on('mouseenter', function (event, commit) {
                      d3.select(event.currentTarget).style('fill-opacity', 1);
                      updateTooltipContent(commit);
                      updateTooltipVisibility(true);
                      updateTooltipPosition(event);
                    })
                    .on('mouseleave', function () {
                      d3.select(event.currentTarget).style('fill-opacity', 0.7);
                      updateTooltipContent({});
                      updateTooltipVisibility(false);
                    });
  
    // Apply brushing
    applyBrushing(svg, dots);
  
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", height - 10)
       .attr("text-anchor", "middle")
       .style("font-size", "16px")
       .text("Date");
  
    svg.append("text")
       .attr("x", -height / 2)
       .attr("y", 15)
       .attr("transform", "rotate(-90)")
       .attr("text-anchor", "middle")
       .style("font-size", "16px")
       .text("Time of Day (Hour)");
  }
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  createScatterplot();
});