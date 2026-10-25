/* Shared portfolio data used by both the profile and the 3D universe. */
const CONTENT = {
  username: "NhiDinh",
  displayName: "Nhi Dinh",
  shortName: "Nhi",
  role: "PhD Researcher · Applied AI",
  tagline: "Math nerd by day. Bug hunter by night.",
  about: "I'm a PhD researcher in mathematical computer science at UIC, working across algorithms, machine learning, and hypergraphs. I build applied AI, NLP, and quantitative research systems with an emphasis on reproducible evaluation and grounded results.",
  stats: [
    { label: "School", value: "UIC PhD", color: "#d50032" },
    { label: "Based in", value: "Chicago", color: "#3a86ff" },
    { label: "Codes in", value: "Python / C++ / SQL", color: "#2fbf5b" },
    { label: "Studies", value: "Algorithms + ML", color: "#8338ec" }
  ],
  avatar: { skin: "#d9a07a", hair: "#171213", hoodie: "#ff8fbf", hoodieTrim: "#f06ea6", pants: "#dcc8a2" },
  /* The visitor's character: a classic Roblox look */
  playerAvatar: { skin: "#f5cd30", shirt: "#0d69ac", pants: "#a4bd47" },

  /* Homepage (player profile) */
  profile: {
    handle: "@nhidinh2",
    status: "Online · Chicago",
    title: "PhD Student · Mathematical Computer Science",
    bio: {
      current: "I am a Ph.D. student in Mathematical Computer Science at the University of Illinois Chicago (UIC).",
      /* The program name inside `current` is linked to this page. */
      program: { name: "Mathematical Computer Science", url: "https://homepages.math.uic.edu/~mcs/" },
      education: "I received my B.S. in Statistics and Computer Science, with a minor in Mathematics, from the University of Illinois Urbana-Champaign (UIUC) in May 2026.",
      groups: [
        { name: "ICLUE", url: "https://ayong.web.illinois.edu/ICLUE.html" },
        { name: "Illinois Math Lab", url: "https://iml.math.illinois.edu/" }
      ],
      research: [
        "My research interests lie in theoretical computer science, particularly probabilistic combinatorics, randomized algorithms, and random discrete structures. My recent work studies algorithmic phase transitions for finding large independent sets in dense random hypergraphs.",
        "Beyond theoretical research, I am also interested in machine learning, optimization, and their applications."
      ],
      email: "nhidinh2@illinois.edu",
      /* Not shown on the homepage; the portfolio chat uses this list. */
      researchInterests: [
        "Probabilistic Combinatorics and Random Graphs",
        "Randomized and Online Algorithms",
        "Theoretical Computer Science",
        "High-Dimensional Probability and Optimization"
      ]
    },
    stats: [
      { value: "2026", label: "Joined PhD", color: "#3a86ff", shade: "#2563c9" },
      { value: "2", label: "Universities", color: "#ff5d8f", shade: "#d43c6c" },
      { value: "∞", label: "Curiosity", color: "#ffb703", shade: "#d08f00" }
    ]
  },

  education: [
    { school: "UIC", full: "University of Illinois Chicago", wall: "#1f3a6e", roof: "#d50032",
      degree: "Ph.D. in Mathematics (Mathematical Computer Science)", years: "Aug 2026 - Present", status: "In progress",
      story: "Also completed an M.S. in Mathematical Computer Science in August 2026.",
      classes: ["Algorithms", "Machine Learning", "Deep Learning"] },
    { school: "UIUC", full: "University of Illinois Urbana-Champaign", wall: "#e84a27", roof: "#13294b",
      degree: "B.S. in Statistics & Computer Science; minor in Mathematics", years: "May 2026", status: "Graduated",
      story: "",
      classes: ["Probability Theory", "Applied Bayesian Analysis", "Machine Learning"] }
  ],

  papers: [
    { title: "Algorithmic Phase Transition for Large Independent Sets in Dense Hypergraphs", venue: "RANDOM 2026", year: "2026",
      authors: "Abhishek Dhawan, Nhi U. Dinh, Eren C. Kızıldağ, Neeladri Maitra, Bayram A. Şahin",
      problem: "Studies the algorithmic tractability of finding large independent sets in dense random hypergraphs.",
      why: "Dense models require online algorithmic ideas that differ from the local and low-degree approaches common in sparse settings.",
      found: "Pinpoints optimal sizes, gives online approximation algorithms, and establishes matching lower bounds for the resulting computational gaps.",
      link: "https://drops.dagstuhl.de/storage/00lipics/lipics-vol392-approx-random2026/LIPIcs.APPROX-RANDOM.2026.68/LIPIcs.APPROX-RANDOM.2026.68.pdf" },
    { title: "Choosability of Multipartite Hypergraphs", venue: "Discrete Mathematics", year: "2025",
      authors: "Peter Bradshaw, Abhishek Dhawan, Nhi Dinh, Shlok Mulye, Rohan Rathi",
      problem: "Studies list coloring bounds for k-partite, k-uniform hypergraphs with maximum degree Δ.",
      why: "The result clarifies when structured multipartite hypergraphs can be colored efficiently from constrained color lists.",
      found: "Proves an asymptotic choosability bound and provides an efficient randomized coloring algorithm.",
      link: "https://arxiv.org/abs/2512.21222" }
  ],

  /* Library shelves. Notes are local copies of Nhi's Finding Nemo study collection. */
  library: [
    { id: "probability", title: "Probability", color: "#ff9f1c", notes: [
      { title: "Probability", url: "/universe/library/probability.html", desc: "Random variables, distributions, independence, and expectation." }
    ] },
    { id: "combinatorics", title: "Combinatorics", color: "#e84a5f", notes: [] },
    { id: "algorithms", title: "Algorithms", color: "#3a86ff", notes: [] },
    { id: "linear-algebra", title: "Linear Algebra", color: "#2ec4b6", notes: [] },
    { id: "complex-analysis", title: "Complex Analysis", color: "#8338ec", notes: [] },
    { id: "machine-learning", title: "Machine Learning", color: "#5cae47", notes: [] },
    { id: "statistics", title: "Statistics", color: "#6c757d", notes: [
      { title: "Statistical inference", url: "/universe/library/statistical-inference.html", desc: "Estimation, confidence, testing, and disciplined uncertainty." },
      { title: "Statistical models & methods", url: "/universe/library/statistical-models-and-methods.html", desc: "Structured assumptions and algorithms for learning from data." },
      { title: "Time series", url: "/universe/library/time-series.html", desc: "Dependence over time, forecasting, and temporal structure." },
      { title: "Categorical data & GLMs", url: "/universe/library/categorical-data.html", desc: "Models for counts, categories, and non-Gaussian outcomes." }
    ] }
  ],

  projects: [
    /* `title` is the repo name the chat matches on; `name` is the homepage label. */
    { title: "NewsTrace", name: "News Retrieval System", tag: "Information Retrieval · NLP", color: "#ff4d6d",
      desc: "Built a system that groups news coverage by event, detects duplicate reporting, and links summaries to their sources. Evaluated search quality, memory use, and query speed on live news and a benchmark with 300 human relevance judgments.",
      stack: ["Python", "Sentence Transformers", "FastAPI", "Streamlit", "SQLite"], github: "https://github.com/nhidinh2/newTrace", demo: "" },
    { title: "SpecShield", name: "AI Agent Security Monitor", tag: "AI Security · Research Prototype", color: "#ffb703",
      desc: "Built a monitor that checks proposed AI agent actions against permissions, data flow, and user approvals. Tested prompt injection, legitimate actions blocked by mistake, and unreliable approval signals. Includes an offline demo, evaluation code, and research paper.",
      stack: ["Python", "AgentDojo", "Policy Engine", "Evaluation"], github: "https://github.com/nhidinh2/specshield", demo: "" },
    { title: "wave-length", name: "Order Book Price Modeling", tag: "Market Microstructure · Quantitative Research", color: "#2ec4b6",
      desc: "Built a research pipeline over 72.3 million order book events to study short-term price changes. Compared order flow and wave response models using rolling train and test periods. Simulated execution costs and queue position to distinguish predictive improvements from trading profitability.",
      stack: ["Python", "Time Series", "Order-Book Data", "Walk-Forward Validation"], github: "https://github.com/nhidinh2/wave-length", demo: "" },
    { title: "Prediction Market Calibration", tag: "Statistical Modeling · Data Analysis", color: "#3a86ff",
      desc: "Studied whether Kalshi market prices reflect accurate probabilities across categories and forecast horizons. Built the data pipeline, statistical models, and validation on held-out markets, with an interactive dashboard showing the results and limitations.",
      stack: ["Python", "pandas", "statsmodels", "React", "TypeScript"], github: "https://github.com/nhidinh2/prediction-market-calibration", demo: "https://dist-zeta-jade-85.vercel.app/" }
  ],

  experience: [
    { company: "Square Kettle", role: "Quantitative Research Intern", place: "Illinois, USA", dates: "Jan 2026 - Jul 2026",
      summary: "Built and evaluated quantitative research pipelines, optimized intraday strategies with walk-forward validation, and developed graph-Laplacian and discrete-wave models of market shocks.",
      skills: ["Python", "Backtesting", "Optimization", "Docker"] },
    { company: "Illinois Natural History Survey", role: "Data Technician", place: "Illinois, USA", dates: "Aug 2025 - Dec 2025",
      summary: "Cleaned and validated 5,000+ survey responses using R and SPSS to support research analysis and reporting.",
      skills: ["R", "SPSS", "Data Validation"] },
    { company: "Congero Technology", role: "Data Developer Intern", place: "Virginia, USA", dates: "Jun 2025 - Aug 2025",
      summary: "Implemented LLM API onboarding and Oracle BRM C opcodes, plus event schemas, data-quality checks, batch loading, and a Docker/GitLab CI/CD workflow.",
      skills: ["C", "Oracle BRM", "Docker", "GitLab CI/CD"] },
    { company: "National Center for Supercomputing Applications (NCSA)", role: "Research Programmer", place: "Illinois, USA", dates: "Jan 2025 - May 2025",
      summary: "Migrated a 10,000+ line C++/GTK application to Qt and developed Markov-chain models for algorithmic music generation.",
      skills: ["C++", "Qt", "GTK", "Markov Chains"] },
    { company: "MB Securities JSC", role: "Data Scientist Intern", place: "Hanoi, Vietnam", dates: "Jun 2024 - Aug 2024",
      summary: "Built Vietnamese and English financial document QA with GraphRAG retrieval, grounded citations, a 200-query benchmark, and systematic error analysis.",
      skills: ["GraphRAG", "NLP", "Evaluation", "Python"] },
  ],

  teaching: [
    { school: "University of Illinois Chicago", courses: ["MATH 180 - Calculus I"] },
    { school: "University of Illinois Urbana-Champaign", courses: [
      "MATH 257 - Linear Algebra with Computational Applications",
      "MATH 227 - Linear Algebra for Data Science",
      "STAT 400 - Statistics and Probability I",
      "STAT 425 - Statistical Modeling I",
      "WYSE - Roboscape Cybersecurity Camp"
    ] }
  ],

  talks: [
    { title: "Choosability of Multipartite Hypergraphs", venue: "UIUC Graph Theory and Combinatorics Seminar", date: "Fall 2025" }
  ],

  skills: [
    { group: "Languages", items: ["Python", "SQL", "C++", "C", "R"] },
    { group: "ML / NLP", items: ["PyTorch", "scikit-learn", "Sentence Transformers", "GraphRAG", "Embeddings"] },
    { group: "Data & Apps", items: ["NumPy", "pandas", "SciPy", "FastAPI", "Streamlit"] },
    { group: "Tools", items: ["Git", "Linux", "Docker", "pytest", "GitLab CI/CD"] }
  ],

  /* Shown on the computer in Nhi's House. Keep it to real, current things. */
  current: [
    { title: "Starting my PhD at UIC", note: "Mathematical computer science, since Aug 2026." },
    { title: "Hypergraph independent sets", note: "Algorithmic phase transitions in dense hypergraphs (RANDOM 2026).", link: "https://drops.dagstuhl.de/storage/00lipics/lipics-vol392-approx-random2026/LIPIcs.APPROX-RANDOM.2026.68/LIPIcs.APPROX-RANDOM.2026.68.pdf" },
    { title: "Building things that actually work", note: "Applied AI, NLP and agent-safety projects. See the Project Garage." }
  ],

  careerQuests: [
    { name: "Graduate from UIUC", status: "done", xp: 300, note: "May 2026" },
    { name: "Start my PhD", status: "done", xp: 400, note: "UIC · Aug 2026" },
    { name: "Publish hypergraph research", status: "done", xp: 500, note: "RANDOM · Discrete Mathematics" },
    { name: "Complete data & research internships", status: "done", xp: 350, note: "MB Securities · Congero · Square Kettle" },
    { name: "Build cool algorithms", status: "progress", xp: 1000, note: "Always ongoing" }
  ],

  /* Nhi's House: things she loves. Anything in [brackets] is a placeholder and shows as "coming soon" in the game. */
  home: {
    basketball: { blurb: "I play basketball! There's a hoop in the backyard. Go shoot a few.", favoritePlayer: "[Favorite player]", jerseyNumber: "[#]" },
    lego: { blurb: "Sets I've built.", sets: ["[LEGO set]", "[LEGO set]", "[LEGO set]"] },
    anime: { series: ["One Piece", "Detective Conan"], note: "yes, i finished one piece" },
    music: { djs: ["[Favorite house DJ]", "[Favorite house DJ]", "[Favorite house DJ]"], playlist: "" },
    gaming: { games: ["[Favorite Roblox game]", "[Favorite Roblox game]", "[Favorite Roblox game]"] },
    favoritePeople: "Me and my brothers. My favorite people."
  },
  personal: {
    family: "My family: my two brothers, my parents, my grandparents, and lots and lots of relatives.",
    catName: "[Cat's name]",
    catBlurb: "[One line about your cat: breed, personality, favorite nap spot.]",
    hobbies: ["Bug hunting", "[Hobby]", "[Hobby]", "[Hobby]"],
    favorites: [ { k: "Food", v: "[Favorite food]" }, { k: "Game", v: "[Favorite game]" }, { k: "Theorem", v: "[Favorite theorem]" } ],
    funFacts: ["[Fun fact]", "[Fun fact]", "[Fun fact]"]
  },

  npc: {
    greeting: "hiiiii! I'm Nhi, welcome to my town. Ask me anything.",
    hello: "hiii",
    topics: [
      { q: "What do you research?", a: "Math and theoretical computer science: algorithms, machine learning, and hypergraphs, with a focus on rigorous algorithmic questions and reproducible evaluation." },
      { q: "What have you built?", a: "Applied AI, NLP retrieval, GraphRAG, agent-safety evaluation, and quantitative research systems. Visit the Project Garage to explore." },
      { q: "What's life like outside the PhD?", a: "Hanging out with my cat in Chicago. Visit Nhi's House to say hello!" },
      { q: "Where's your code?", a: "Head southwest to the Project Garage. Every station has a GitHub link." }
    ],
    /* Guided tours: Nhi walks you to a building. Lines play at the start, halfway, and on arrival. */
    tours: {
      house: { label: "Nhi's House", lines: ["Follow me! My house is up this path to the northwest.", "Inside: my LEGO, my manga shelf, a music corner, my cat, and a basketball hoop out back!", "Here we are! Press E to go in. I'll wait right here."] },
      library: { label: "Library", lines: ["Let's go! The Library is to the northeast.", "Every shelf is one subject, from probability to machine learning. I'm still adding my notes.", "This is it! Press E to go in. I'll wait out here."] },
      garage: { label: "Project Garage", lines: ["The Project Garage is southwest. This way!", "Each station inside is one of my projects, with its GitHub link.", "Here's the garage! Press E and the door rolls up. I'll wait here."] },
      lab: { label: "Research Lab", lines: ["The Research Lab is southeast. Follow me!", "Inside are my research papers, plus a hypergraph you can play with.", "We made it! Press E to go in. I'll be right here."] }
    },
    waitLine: "Over here! Follow me.",
    byeLine: "Hope you liked it! I'll head back to the plaza. Come find me anytime."
  },

  contact: {
    email: "nhidinh2@illinois.edu",
    links: [
      { label: "GitHub", url: "https://github.com/nhidinh2" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/nhi-dinh-533162276/" },
      { label: "Google Scholar", url: "https://scholar.google.com/citations?hl=en&user=BjeNuUcAAAAJ" },
      { label: "Research Paper", url: "https://drops.dagstuhl.de/storage/00lipics/lipics-vol392-approx-random2026/LIPIcs.APPROX-RANDOM.2026.68/LIPIcs.APPROX-RANDOM.2026.68.pdf" }
    ]
  },
  resume: "",   // kept private: the CV is not linked anywhere on the site
  secretFacts: ["[Secret fun fact]", "[Secret fun fact]", "[Secret fun fact]"]
};

// The server reads the same approved portfolio content as the browser.
if (typeof module !== "undefined" && module.exports) module.exports = CONTENT;
