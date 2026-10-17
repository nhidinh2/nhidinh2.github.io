(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (url) => /^(https?:|mailto:)/.test(url || "") ? url : "#";
  const external = (url) => `href="${safe(url)}" target="_blank" rel="noopener noreferrer"`;

  $("year").textContent = new Date().getFullYear();
  $("aboutText").textContent = CONTENT.about;

  $("projectList").innerHTML = CONTENT.projects.map((project, index) => `
    <article class="project-card" data-number="0${index + 1}">
      <div class="project-meta"><span>${project.tag}</span><span>0${index + 1} / 04</span></div>
      <h3>${project.title}</h3>
      <p>${project.desc}</p>
      <div class="project-result">${project.result}</div>
      <div class="project-stack">${project.stack.map((item) => `<span>${item}</span>`).join("")}</div>
      <div class="project-links">
        <a ${external(project.github)}>View code ↗</a>
        ${project.demo ? `<a ${external(project.demo)}>Live demo ↗</a>` : ""}
      </div>
    </article>`).join("");

  $("paperList").innerHTML = CONTENT.papers.map((paper) => `
    <article class="paper">
      <div class="paper-venue">${paper.venue}<br>${paper.year}</div>
      <div><h3>${paper.title}</h3><p>${paper.authors}</p><p>${paper.found}</p></div>
      <a ${external(paper.link)}>Read paper ↗</a>
    </article>`).join("");

  $("experienceList").innerHTML = CONTENT.experience.map((role) => `
    <article class="role-card">
      <time>${role.dates}</time>
      <h3>${role.role}</h3>
      <h4>${role.company} · ${role.place}</h4>
      <p>${role.summary}</p>
      <div class="role-skills">${role.skills.map((skill) => `<span>${skill}</span>`).join("")}</div>
    </article>`).join("");

  $("skillsList").innerHTML = CONTENT.skills.map((group) => `
    <div class="skill-group"><strong>${group.group}</strong><div>${group.items.map((item) => `<span>${item}</span>`).join("")}</div></div>`).join("");
})();
