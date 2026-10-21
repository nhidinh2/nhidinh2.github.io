(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safe = (url) => /^(https?:|mailto:)/.test(url || "") ? url : "#";
  const P = CONTENT.profile;
  const dialog = $("portfolioDialog");

  $("displayName").textContent = CONTENT.displayName || CONTENT.username;
  $("handle").textContent = P.handle;
  $("status").textContent = P.status;
  $("title").textContent = P.title;
  const bio = P.bio;
  const groupLinks = bio.groups.map((g) => `<a href="${esc(safe(g.url))}" target="_blank" rel="noopener noreferrer">${esc(g.name)}</a>`).join(" and ");
  $("aboutText").innerHTML = `
    <p>${esc(bio.current)}</p>
    <p>${esc(bio.education)} I am grateful to be part of ${groupLinks} during my time there!</p>
    ${bio.research.map((p) => `<p>${esc(p)}</p>`).join("")}`;

  // contact row: LinkedIn, GitHub, Google Scholar, email (links without a URL are skipped)
  const contactIcons = {
    LinkedIn: '<path d="M4 9h3v11H4zM5.5 4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM10 9h3v1.6c.5-1 1.8-1.9 3.6-1.9 3 0 3.4 2 3.4 4.6V20h-3v-5.8c0-1.4 0-3-1.9-3s-2.1 1.4-2.1 2.9V20h-3z" fill="currentColor" stroke="none"/>',
    GitHub: '<path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.2-1.2-3.2-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.8 0-1.1.4-1.9 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.5 1 2.6 0 3.7-2.3 4.6-4.4 4.8.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z" fill="currentColor" stroke="none"/>',
    "Google Scholar": '<path d="M12 3 2 10h4.2a6 6 0 1 0 11.6 0H22z" fill="currentColor" stroke="none"/>',
    Email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>'
  };
  const C = CONTENT.contact, link = (label) => (C.links.find((l) => l.label === label) || {}).url;
  const contacts = [
    { label: "LinkedIn", url: link("LinkedIn") },
    { label: "GitHub", url: link("GitHub") },
    { label: "Google Scholar", url: link("Google Scholar") },
    { label: "Email", url: C.email && `mailto:${C.email}` }
  ].filter((c) => c.url);
  $("contactLinks").innerHTML = contacts.map((c) => {
    const ext = /^https?:/.test(c.url), href = ext || c.url.startsWith("mailto:") ? safe(c.url) : c.url;
    return `<li><a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${contactIcons[c.label]}</svg>${esc(c.label)}</a></li>`;
  }).join("");

  const creations = [
    { id: "research", name: "Publications", sub: "Papers & preprints", symbol: "◈" },
    { id: "projects", name: "Coding Projects", sub: "Things I've built", symbol: "</>" }
  ];
  $("creations").innerHTML = creations.map((c) => `<button class="creation-button" type="button" data-section="${c.id}">
    <span class="creation-icon" aria-hidden="true">${esc(c.symbol)}</span>
    <span class="creation-copy"><strong>${esc(c.name)}</strong><small>${esc(c.sub)}</small></span>
    <span class="creation-arrow" aria-hidden="true">→</span>
  </button>`).join("");

  const externalLink = (url, label) => `<a href="${esc(safe(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  function research() {
    return `<section class="detail-section"><h3>Research & Publications</h3>${CONTENT.papers.map((p) => `<article class="detail-entry"><h4>${esc(p.title)}</h4><p class="meta">${esc(p.venue)} · ${esc(p.year)}</p><p>${esc(p.authors)}</p><p>${esc(p.problem)}</p><p>${esc(p.found)}</p>${externalLink(p.link, "Read paper")}</article>`).join("")}</section>`;
  }
  function talks() {
    return `<section class="detail-section"><h3>Talks</h3>${CONTENT.talks.map((t) => `<article class="detail-entry"><h4>${esc(t.title)}</h4><p class="meta">${esc(t.venue)} · ${esc(t.date)}</p></article>`).join("")}</section>`;
  }
  function teaching() {
    return `<section class="detail-section"><h3>Teaching</h3>${CONTENT.teaching.map((t) => `<article class="detail-entry"><h4>${esc(t.school)}</h4><ul class="course-list">${t.courses.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></article>`).join("")}</section>`;
  }
  function projects() {
    return `<section class="detail-section"><h3>Selected projects</h3>${CONTENT.projects.map((p) => `<article class="detail-entry"><h4>${esc(p.name || p.title)}</h4><p class="meta">${esc(p.tag)}</p><p>${esc(p.desc)}</p><p class="meta">${p.stack.map(esc).join(" · ")}</p>${externalLink(p.github, "View on GitHub")}${p.demo ? " · " + externalLink(p.demo, "Live dashboard") : ""}</article>`).join("")}</section>`;
  }
  function education() {
    return `<section class="detail-section"><h3>Education</h3>${CONTENT.education.map((e) => `<article class="detail-entry"><h4>${esc(e.full)}</h4><p>${esc(e.degree)}</p><p class="meta">${esc(e.years)}</p>${e.story ? `<p>${esc(e.story)}</p>` : ""}</article>`).join("")}</section>`;
  }
  function experience() {
    return `<section class="detail-section"><h3>Work Experience</h3>${CONTENT.experience.map((e) => `<article class="detail-entry"><h4>${[e.role, e.company].filter(Boolean).map(esc).join(" · ")}</h4>${e.dates ? `<p class="meta">${esc(e.dates)}</p>` : ""}${e.summary ? `<p>${esc(e.summary)}</p>` : ""}</article>`).join("")}</section>`;
  }
  function skills() {
    return `<section class="detail-section"><h3>Skills</h3>${CONTENT.skills.map((s) => `<article class="detail-entry"><h4>${esc(s.group)}</h4><p>${s.items.map(esc).join(" · ")}</p></article>`).join("")}</section>`;
  }
  function showPortfolio(section) {
    $("dialogTitle").textContent = section === "research" ? "Publications" : section === "projects" ? "Coding Projects" : "Nhi's Portfolio";
    $("dialogContent").innerHTML = section === "research" ? research() : section === "projects" ? projects() : education() + research() + experience() + teaching() + talks() + projects() + skills();
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  document.querySelectorAll("[data-section]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); showPortfolio(link.dataset.section); }));
  $("viewAll").addEventListener("click", (event) => { event.preventDefault(); showPortfolio("all"); });
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

})();
