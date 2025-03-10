// Import D3
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
let selectedCommits = [];
let commitProgress = 100;
let filteredCommits = []; // Stores filtered commits based on commitMaxTime
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
let NUM_ITEMS = 100; // Ideally, let this value be the length of your commit history
let ITEM_HEIGHT = 30; // Feel free to change
let VISIBLE_COUNT = 10; // Feel free to change as well
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});


const width = 1000;
const height = 600;
const margin = { top: 50, right: 30, bottom: 50, left: 70 }; // Increased bottom and top margins
let xScale, yScale, brushSelection = null;
// Load CSV Data
async function loadData() {
  try {
    data = await d3.csv('../meta/loc.csv', (row) => ({
      ...row,
      line: +row.line || 0,
      depth: +row.depth || 0,
      length: +row.length || 0,
      date: row.date ? new Date(row.date + 'T00:00' + row.timezone) : null,
      datetime: row.datetime ? new Date(row.datetime) : null,
      file: row.file || "Unknown"
    }));

    if (!data.length) throw new Error("CSV file is empty or could not be read");

    console.log("Loaded Data:", data);

    processCommits();
    displayStats(filteredCommits);
    // visualizeTimeAndDay(filteredCommits);
    try {
      data = await d3.csv('../meta/loc.csv', (row) => ({
          ...row,
          datetime: row.datetime ? new Date(row.datetime) : null
      }));

      if (!data.length) throw new Error("CSV file is empty or could not be read");

      processCommits();

      if (commits.length > 0) {
          timeScale = d3.scaleTime()
              .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
              .range([0, 100]);

          commitMaxTime = timeScale.invert(commitProgress);
      } else {
          console.error("No valid commits found.");
      }

      updateSelectedTime();
  } catch (error) {
      console.error("Error loading CSV:", error);
  }
  } catch (error) {
    console.error("Error loading CSV:", error);
  }
}
function processCommits() {
  commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
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
          lines: lines.map(line => ({
              file: line.file || "Unknown", // ✅ Ensure every line has a file
              length: line.length || 0 // ✅ Ensure `length` exists
          }))
      };

      return ret;
  }).filter(Boolean);

  console.log("Processed Commits with Lines:", commits); // Debugging
}


let timeScale = d3.scaleTime([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)], [0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);


function filterCommitsByTime() {
    filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);
}

function updateFileVisualization(filteredCommits) {
  console.log("🔹 Running updateFileVisualization...");
  console.log("🔹 Filtered Commits:", filteredCommits);

  let lines = filteredCommits.flatMap(d => d.lines || []);
  console.log("🔹 Extracted Lines:", lines);

  let files = d3.groups(lines, d => d.file || "Unknown").map(([name, lines]) => ({
      name,
      lines
  }));
  files = d3.sort(files, (d) => -d.lines.length);
  console.log("🔹 Grouped Files:", files);

  let filesContainer = d3.select('.files');

  filesContainer.html(""); // Clear existing content

  if (files.length === 0) {
      console.warn("❌ No files found for the selected commits.");
      filesContainer.html('<p>No files affected in the selected commits.</p>');
      return;
  }

  let fileDivs = filesContainer
      .selectAll("div")
      .data(files)
      .enter()
      .append("div");

  fileDivs.append("dt")
      .html(d => `<code>${d.name}</code> <small>${d.lines.length} lines</small>`); // ✅ File name + line count

  let dd = fileDivs.append("dd");

  // ✅ Append individual dots for each line and apply color based on file type
  dd.selectAll("div")
      .data(d => d.lines)
      .enter()
      .append("div")
      .attr("class", "line")
      .style("background", d => fileTypeColors(d.file)); // ✅ Apply color based on file name/type
}


// Display stats using D3
function displayStats(filteredCommits) {
  const statsContainer = d3.select('#stats');
  statsContainer.html(""); // Clear existing content

  const dl = statsContainer.append('dl').attr('class', 'stats');

  // Total LOC (Lines of Code)
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(filteredCommits.length);

  // Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(filteredCommits.length);

  // Number of files
  const numFiles = d3.groups(filteredCommits, (d) => d.file).length;
  dl.append('dt').text('Total Files');
  dl.append('dd').text(numFiles);

  // Maximum file length
  const maxFileLength = d3.max(filteredCommits, (d) => d.line);
  dl.append('dt').text('Longest File (lines)');
  dl.append('dd').text(maxFileLength || 0);

  // Most Active Time Period
  const workByPeriod = d3.rollups(
    filteredCommits,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString("en", { dayPeriod: "short" })
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
  dl.append('dt').text('Most Active Period');
  dl.append('dd').text(maxPeriod || "Unknown");
}

// // Step 2: Visualizing time and day of commits
// function visualizeTimeAndDay(filteredCommits) {
//   d3.select("#stats").selectAll("svg").remove(); // Clear old charts

//   const timeOfDayData = d3.rollups(
//       filteredCommits,
//       (v) => v.length,
//       (d) => d.datetime?.getHours() || 0
//   );

//   const dayOfWeekData = d3.rollups(
//       filteredCommits,
//       (v) => v.length,
//       (d) => d.datetime?.getDay() || 0
//   );

//   const timeData = timeOfDayData.map(([hour, count]) => ({ hour, count }));
//   const dayData = dayOfWeekData.map(([day, count]) => ({ day, count }));

//   const width = 400, height = 250;
//   const margin = { top: 50, right: 30, bottom: 30, left: 40 };

//   const svgTime = d3.select("#stats")
//       .append("svg")
//       .attr("width", width)
//       .attr("height", height);

//   const svgDay = d3.select("#stats")
//       .append("svg")
//       .attr("width", width)
//       .attr("height", height);

//   const xScaleTime = d3.scaleBand()
//       .domain(timeData.map(d => d.hour))
//       .range([margin.left, width - margin.right])
//       .padding(0.1);

//   const yScaleTime = d3.scaleLinear()
//       .domain([0, d3.max(timeData, d => d.count) || 1])
//       .nice()
//       .range([height - margin.bottom, margin.top]);

//   const xScaleDay = d3.scaleBand()
//       .domain(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
//       .range([margin.left, width - margin.right])
//       .padding(0.1);

//   const yScaleDay = d3.scaleLinear()
//       .domain([0, d3.max(dayData, d => d.count) || 1])
//       .nice()
//       .range([height - margin.bottom, margin.top]);

//   svgTime.selectAll("rect")
//       .data(timeData)
//       .enter()
//       .append("rect")
//       .attr("x", d => xScaleTime(d.hour))
//       .attr("y", d => yScaleTime(d.count))
//       .attr("height", d => yScaleTime(0) - yScaleTime(d.count))
//       .attr("width", xScaleTime.bandwidth())
//       .attr("fill", "steelblue");

//   svgDay.selectAll("rect")
//       .data(dayData)
//       .enter()
//       .append("rect")
//       .attr("x", d => xScaleDay(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.day]))
//       .attr("y", d => yScaleDay(d.count))
//       .attr("height", d => yScaleDay(0) - yScaleDay(d.count))
//       .attr("width", xScaleDay.bandwidth())
//       .attr("fill", "orange");

//   svgTime.append("g")
//       .attr("transform", `translate(0,${height - margin.bottom})`)
//       .call(d3.axisBottom(xScaleTime).tickFormat(d => `${d}:00`));

//   svgDay.append("g")
//       .attr("transform", `translate(0,${height - margin.bottom})`)
//       .call(d3.axisBottom(xScaleDay));

//   svgTime.append("g")
//       .attr("transform", `translate(${margin.left},0)`)
//       .call(d3.axisLeft(yScaleTime));

//   svgDay.append("g")
//       .attr("transform", `translate(${margin.left},0)`)
//       .call(d3.axisLeft(yScaleDay));

//   svgTime.append("text")
//       .attr("x", width / 2)
//       .attr("y", margin.top - 30)
//       .attr("text-anchor", "middle")
//       .style("font-size", "16px")
//       .text("Commits by Hour");

//   svgDay.append("text")
//       .attr("x", width / 2)
//       .attr("y", margin.top - 30)
//       .attr("text-anchor", "middle")
//       .style("font-size", "16px")
//       .text("Commits by Day of the Week");
// }

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
    selectedCommits = filteredCommits.filter(isCommitSelected);
    updateSelectionCount();
    updateLanguageBreakdown();
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

  function renderItems(startIndex) {
    console.log("🔹 Rendering items starting from index:", startIndex);

    // Clear things off
    itemsContainer.selectAll('div').remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    
    console.log("🔹 New Commit Slice:", newCommitSlice);

    // ✅ Update the scatterplot dynamically based on the visible commits
    updateScatterplot(newCommitSlice);

    // ✅ Re-bind the commit data to the container and represent each using a div
    itemsContainer.selectAll('div')
                  .data(newCommitSlice)
                  .enter()
                  .append('div')
                  .attr("class", "commit-item")
                  .html(d => `
                      <strong>${d.author}</strong>: 
                      <a href="${d.url}" target="_blank">${d.id.substring(0, 7)}</a> 
                      <br>
                      <small>${d.datetime.toLocaleString()}</small>
                  `)
                  .style('position', 'absolute')
                  .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
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
  
  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
});
  function updateScatterplot(filteredCommits) {
    d3.select("#chart svg").remove(); // Clear existing SVG

    const width = 1000, height = 600;
    const margin = { top: 50, right: 30, bottom: 50, left: 70 };

    const svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height);

    if (!filteredCommits.length) {
        console.warn("No filtered commits available for scatterplot.");
        return;
    }

    // Update xScale with filtered commits
    xScale = d3.scaleTime()
        .domain(d3.extent(filteredCommits, d => d.datetime))
        .range([margin.left, width - margin.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis);

    // Update rScale with filtered data
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const dots = svg.append("g").attr("class", "dots");

    dots.selectAll("circle").remove();

    dots.selectAll("circle")
        .data(filteredCommits)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", 0) // Fallback: Start at 0 instead of using @starting-style
        .attr("fill", "steelblue")
        .style("fill-opacity", 0.7)
        .transition()
        .duration(200) // Matches CSS animation
        .attr("r", d => rScale(d.totalLines)) // Expand to actual size
        .on('end', function () { 
            d3.select(this).style("fill-opacity", 1); // Ensure visibility
        });

    // Apply brushing
    applyBrushing(svg, dots);
}
function updateSelectedTime() {
  if (!timeScale) {
      console.error("Time scale is not initialized yet.");
      return;
  }

  commitMaxTime = timeScale.invert(commitProgress);

  const selectedTime = d3.select('#selected-time');

  if (commitMaxTime && !isNaN(commitMaxTime.getTime())) {
      selectedTime.text(commitMaxTime.toLocaleString());

      // Update filtered commits
      filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);

      console.log("Filtered Commits Count:", filteredCommits.length); // Debugging

      if (filteredCommits.length === 0) {
          console.warn("No commits match the filter.");
      }

      // Refresh the scatterplot with filtered data
      updateFileVisualization(filteredCommits);
      updateScatterplot(filteredCommits); // ✅ Update scatter plot
      displayStats(filteredCommits); // ✅ Update stats dynamically
  } else {
      selectedTime.text("No valid date");
      console.error("Invalid Date computed:", commitMaxTime);
  }
}


d3.select("#time-slider").on("input", function () {
    commitProgress = +this.value;
    updateSelectedTime(); // Ensure the displayed time updates dynamically
});

function updateTimeDisplay() {
  commitProgress = Number(document.getElementById("time-slider").value);
  commitMaxTime = timeScale.invert(commitProgress);

  console.log("Updating Display: Commit Max Time:", commitMaxTime);

  if (commitMaxTime && !isNaN(commitMaxTime.getTime())) {
      d3.select('#selected-time').text(commitMaxTime.toLocaleString());

      filterCommitsByTime(); // ✅ Ensure filtering happens
      console.log("Filtered Commits Count:", filteredCommits.length);
      updateFileVisualization(filteredCommits);
      updateScatterplot(filteredCommits); // ✅ Update scatter plot
      displayStats(filteredCommits); // ✅ Update stats dynamically
  } else {
      console.error("Invalid Date computed:", commitMaxTime);
  }
}


// Attach event listener for slider
d3.select("#time-slider").on("input", updateTimeDisplay);

let sliderTimeout; // Store timeout reference

d3.select("#time-slider").on("input", function () {
    clearTimeout(sliderTimeout); // Clear previous updates
    commitProgress = +this.value;

    sliderTimeout = setTimeout(() => {
        updateSelectedTime(); // Update only after a short delay
    }, 100); // Adjust this delay if needed
});
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  filteredCommits = [...commits]; // Initially, all commits are used
  updateScatterplot(filteredCommits);
  displayStats(filteredCommits);
  updateFileVisualization(filteredCommits);
});