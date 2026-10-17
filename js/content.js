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
  avatar: { skin: "#f1c27d", hair: "#2b1d16", shirt: "#9b7bd8", pants: "#2b3a67" },

  profile: {
    handle: "@nhidinh2",
    status: "Online · Chicago",
    title: "PhD Student · Mathematical Computer Science",
    bio: {
      intro: "Hi, I’m Nhi Dinh (nee-din).",
      education: "I’m a first-year Mathematical Computer Science PhD student at the University of Illinois Chicago. Previously, I studied Statistics + Computer Science with a Mathematics minor at the University of Illinois Urbana-Champaign.",
      focus: "probability, combinatorics, algorithms, and machine learning",
      focusTail: ". My research studies hypergraphs and algorithmic questions. My applied projects explore information retrieval, AI agent security, and statistical modeling, with an emphasis on reproducible experiments.",
      outside: "I’ve worked in quantitative research, data development, and financial document question answering. Outside research, I enjoy building small projects and spending time with my cat.",
      email: "nhidinh2@illinois.edu",
      researchInterests: ["Probability and combinatorics", "Algorithms and theoretical computer science", "Machine learning and information retrieval", "Statistical modeling and time series"]
    },
    badges: [
      { name: "UIUC Grad", icon: "grad" },
      { name: "Published", icon: "book" },
      { name: "Developer", icon: "code" },
      { name: "Cat Person", icon: "cat" }
    ]
  },

  education: [
    { school: "UIC", full: "University of Illinois Chicago", wall: "#1f3a6e", roof: "#d50032",
      degree: "Ph.D. in Mathematics (Mathematical Computer Science)", years: "Aug 2026 - Present", status: "In progress",
      story: "Also completed an M.S. in Mathematical Computer Science in August 2026. Current interests include algorithms, machine learning, and hypergraphs.",
      classes: ["Algorithms", "Machine Learning", "Deep Learning"] },
    { school: "UIUC", full: "University of Illinois Urbana-Champaign", wall: "#e84a27", roof: "#13294b",
      degree: "B.S. in Statistics & Computer Science; minor in Mathematics", years: "May 2026", status: "Graduated",
      story: "Graduated with a 3.9/4.0 GPA, Highest Distinction, a Fiddler Innovation Fellowship, and four Dean's List honors.",
      classes: ["Probability Theory", "Applied Bayesian Analysis", "Machine Learning"] }
  ],

  papers: [
    { title: "Algorithmic Phase Transition for Large Independent Sets in Dense Hypergraphs", venue: "RANDOM 2026", year: "2026",
      authors: "Abhishek Dhawan, Nhi U. Dinh, Eren C. Kızıldağ, Neeladri Maitra, Bayram A. Şahin",
      problem: "Studies the algorithmic tractability of finding large independent sets in dense random hypergraphs.",
      why: "Dense models require online algorithmic ideas that differ from the local and low-degree approaches common in sparse settings.",
      found: "Pinpoints optimal sizes, gives online approximation algorithms, and establishes matching lower bounds for the resulting computational gaps.",
      link: "https://arxiv.org/abs/2605.05618v1" },
    { title: "Choosability of Multipartite Hypergraphs", venue: "Discrete Mathematics", year: "2025",
      authors: "Peter Bradshaw, Abhishek Dhawan, Nhi Dinh, Shlok Mulye, Rohan Rathi",
      problem: "Studies list coloring bounds for k-partite, k-uniform hypergraphs with maximum degree Δ.",
      why: "The result clarifies when structured multipartite hypergraphs can be colored efficiently from constrained color lists.",
      found: "Proves an asymptotic choosability bound and provides an efficient randomized coloring algorithm.",
      link: "https://arxiv.org/abs/2512.21222" }
  ],

  library: [
    { id: "probability", title: "Probability", color: "#ff9f1c", notes: [] },
    { id: "combinatorics", title: "Combinatorics", color: "#e84a5f", notes: [] },
    { id: "algorithms", title: "Algorithms", color: "#3a86ff", notes: [] },
    { id: "linear-algebra", title: "Linear Algebra", color: "#2ec4b6", notes: [] },
    { id: "complex-analysis", title: "Complex Analysis", color: "#8338ec", notes: [] },
    { id: "machine-learning", title: "Machine Learning", color: "#5cae47", notes: [] },
    { id: "other", title: "Other", color: "#6c757d", notes: [] }
  ],

  projects: [
    { title: "NewsTrace", tag: "Information Retrieval · NLP", color: "#ff4d6d",
      desc: "Built a news retrieval system that groups coverage of the same event, detects syndicated duplicates, and links summaries to their sources. Compared embedding compression and approximate search on live news and a 300-query human-judged benchmark.",
      stack: ["Python", "Sentence Transformers", "FastAPI", "Streamlit", "SQLite"], github: "https://github.com/nhidinh2/newTrace", demo: "" },
    { title: "SpecShield", tag: "AI Agent Security · Research Prototype", color: "#ffb703",
      desc: "Built a policy monitor for tool-using AI agents that checks action fields, data flow, and the origin of user approvals. Evaluated prompt-injection attacks, false blocks, and failures under corrupted provenance; the repository includes an offline demo and research paper.",
      stack: ["Python", "AgentDojo", "Policy Engine", "Evaluation"], github: "https://github.com/nhidinh2/specshield", demo: "" },
    { title: "Prediction Market Calibration", tag: "Statistical Modeling · Data Analysis", color: "#3a86ff",
      desc: "Analyzed how Kalshi forecast accuracy varies by category and time to resolution. Built a data pipeline, regression models with point-in-time controls, and out-of-sample calibration experiments, with an interactive dashboard to explore the findings.",
      stack: ["Python", "pandas", "statsmodels", "React", "TypeScript"], github: "https://github.com/nhidinh2/prediction-market-calibration", demo: "https://dist-zeta-jade-85.vercel.app/" },
    { title: "wave-length", tag: "Market Microstructure · Quantitative Research", color: "#2ec4b6",
      desc: "Developed an order-book research pipeline over 72.3 million events to study short-horizon price formation. Implemented order-flow baselines, causal response kernels, and queue-aware trading simulations with walk-forward validation. Documented both predictive gains and negative results after trading costs.",
      stack: ["Python", "Time Series", "Order-Book Data", "Walk-Forward Validation"], github: "https://github.com/nhidinh2/wave-length", demo: "" }
  ],

  experience: [
    { company: "Square Kettle", role: "Quantitative Research Intern", place: "Illinois, USA", dates: "Jan 2026 - Jul 2026",
      summary: "Built and evaluated quantitative research pipelines, optimized intraday strategies with walk-forward validation, and developed graph-Laplacian and discrete-wave models of market shocks.",
      skills: ["Python", "Backtesting", "Optimization", "Docker"] },
    { company: "Congero Technology", role: "Data Developer Intern", place: "Virginia, USA", dates: "Jun 2025 - Aug 2025",
      summary: "Implemented LLM API onboarding and Oracle BRM C opcodes, plus event schemas, data-quality checks, batch loading, and a Docker/GitLab CI/CD workflow.",
      skills: ["C", "Oracle BRM", "Docker", "GitLab CI/CD"] },
    { company: "MB Securities JSC", role: "Data Scientist Intern", place: "Hanoi, Vietnam", dates: "Jun 2024 - Aug 2024",
      summary: "Built Vietnamese and English financial document QA with GraphRAG retrieval, grounded citations, a 200-query benchmark, and systematic error analysis.",
      skills: ["GraphRAG", "NLP", "Evaluation", "Python"] }
  ],

  skills: [
    { group: "Languages", items: ["Python", "SQL", "C++", "C", "R"] },
    { group: "ML / NLP", items: ["PyTorch", "scikit-learn", "Sentence Transformers", "GraphRAG", "Embeddings"] },
    { group: "Data & Apps", items: ["NumPy", "pandas", "SciPy", "FastAPI", "Streamlit"] },
    { group: "Tools", items: ["Git", "Linux", "Docker", "pytest", "GitLab CI/CD"] }
  ],

  careerQuests: [
    { name: "Graduate from UIUC", status: "done", xp: 300, note: "May 2026" },
    { name: "Start my PhD", status: "done", xp: 400, note: "UIC · Aug 2026" },
    { name: "Publish hypergraph research", status: "done", xp: 500, note: "RANDOM · Discrete Mathematics" },
    { name: "Complete data & research internships", status: "done", xp: 350, note: "MB Securities · Congero · Square Kettle" },
    { name: "Build cool algorithms", status: "progress", xp: 1000, note: "Always ongoing" }
  ],

  personal: {
    catName: "[Cat's name]",
    catBlurb: "[One line about your cat: breed, personality, favorite nap spot.]",
    hobbies: ["Bug hunting", "[Hobby]", "[Hobby]", "[Hobby]"],
    favorites: [ { k: "Food", v: "[Favorite food]" }, { k: "Game", v: "[Favorite game]" }, { k: "Theorem", v: "[Favorite theorem]" } ],
    funFacts: ["[Fun fact]", "[Fun fact]", "[Fun fact]"]
  },

  npc: {
    greeting: "Hi, I'm Mini Nhi! Ask me anything.",
    topics: [
      { q: "What do you research?", a: "Math and theoretical computer science: algorithms, machine learning, and hypergraphs, with a focus on rigorous algorithmic questions and reproducible evaluation." },
      { q: "What have you built?", a: "Applied AI, NLP retrieval, GraphRAG, agent-safety evaluation, and quantitative research systems. Visit the Project Garage to explore." },
      { q: "What's life like outside the PhD?", a: "Hanging out with my cat in Chicago. Visit Nhi's House to say hello!" },
      { q: "Where's your code?", a: "Head southwest to the Project Garage. Every station has a GitHub link." }
    ]
  },

  contact: {
    email: "nhidinh2@illinois.edu",
    links: [
      { label: "GitHub", url: "https://github.com/nhidinh2" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/nhi-dinh-533162276/" },
      { label: "Google Scholar", url: "https://scholar.google.com/citations?hl=en&user=BjeNuUcAAAAJ" },
      { label: "Research Paper", url: "https://arxiv.org/abs/2605.05618v1" }
    ]
  },
  resume: "assets/Nhi-Dinh-Resume.pdf",
  secretFacts: ["[Secret fun fact]", "[Secret fun fact]", "[Secret fun fact]"]
};
