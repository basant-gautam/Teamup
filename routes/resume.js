// routes/resume.js - Enhanced Version
const express = require("express");
const router = express.Router();
const { User } = require("../server"); // Import User model from server.js

// Enhanced skill keywords with more comprehensive coverage
const SKILLS_KEYWORDS = {
  python: ["python", "django", "flask", "pandas", "numpy", "scikit-learn", "sklearn", "fastapi", "pydantic", "celery", "streamlit"],
  javascript: ["javascript", "react", "angular", "vue", "nodejs", "node.js", "express", "next.js", "nextjs", "typescript", "svelte", "nuxt", "gatsby"],
  web_dev: ["html", "css", "tailwind", "bootstrap", "responsive design", "sass", "scss", "less", "jquery", "webpack", "vite", "parcel"],
  data_science: ["data science", "machine learning", "ml", "deep learning", "pytorch", "tensorflow", "keras", "data analysis", "matplotlib", "seaborn", "plotly", "tableau", "power bi"],
  database: ["sql", "nosql", "mongodb", "postgresql", "postgres", "mysql", "firebase", "sqlite", "redis", "oracle", "cassandra", "dynamodb", "elasticsearch"],
  cloud: ["aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "heroku", "digitalocean", "netlify", "vercel", "cloudflare"],
  mobile: ["flutter", "react native", "ios", "android", "swift", "kotlin", "objective-c", "xamarin", "cordova", "phonegap"],
  design: ["figma", "sketch", "adobe xd", "ui/ux", "ux/ui", "photoshop", "illustrator", "canva", "wireframing", "prototyping"],
  devops: ["jenkins", "terraform", "ansible", "ci/cd", "continuous integration", "continuous deployment", "prometheus", "grafana", "nagios"],
  security: ["cybersecurity", "penetration testing", "ethical hacking", "nmap", "burpsuite", "wireshark", "owasp", "security audit"],
  blockchain: ["blockchain", "solidity", "ethereum", "smart contracts", "web3", "truffle", "ganache", "hyperledger", "bitcoin", "cryptocurrency"],
  ai: ["artificial intelligence", "nlp", "natural language processing", "computer vision", "chatgpt", "openai", "llm", "transformers", "huggingface", "bert", "gpt"],
  embedded: ["arduino", "raspberry pi", "iot", "internet of things", "embedded systems", "verilog", "vhdl", "fpga", "microcontroller"],
  game_dev: ["unity", "unreal engine", "godot", "cocos2d", "game development", "3d modeling", "blender", "maya"],
  programming: ["c", "c++", "java", "c#", "golang", "go", "rust", "php", "perl", "ruby", "scala", "r", "matlab", "lua"],
  testing: ["jest", "mocha", "chai", "junit", "selenium", "cypress", "pytest", "testing", "unit testing", "integration testing", "tdd"],
  big_data: ["hadoop", "spark", "kafka", "hive", "mapreduce", "airflow", "databricks", "snowflake"],
  misc: ["git", "github", "gitlab", "bitbucket", "jira", "trello", "notion", "slack", "agile", "scrum", "kanban"]
};

// Enhanced skills extraction with better pattern matching
function extractSkills(text) {
  const extracted = new Set();
  const cleanedText = text.toLowerCase();

  Object.values(SKILLS_KEYWORDS).forEach(keywords => {
    keywords.forEach(keyword => {
      // More flexible regex patterns
      const patterns = [
        new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i"),
        new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i")
      ];
      
      patterns.forEach(regex => {
        if (regex.test(cleanedText)) {
          extracted.add(keyword);
        }
      });
    });
  });

  return Array.from(extracted);
}

// Enhanced GitHub link extraction
function extractGitHubLinks(text) {
  const githubLinks = [];
  const patterns = [
    /https?:\/\/(?:www\.)?github\.com\/[\w\-\.]+(?:\/[\w\-\.]+)*\/?/gi,
    /(?:www\.)?github\.com\/[\w\-\.]+(?:\/[\w\-\.]+)*\/?/gi,
    /git@github\.com:[\w\-\.]+\/[\w\-\.]+\.git/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        let normalizedUrl = match.trim();
        
        // Handle SSH URLs
        if (normalizedUrl.startsWith('git@github.com:')) {
          const repoPath = normalizedUrl.replace('git@github.com:', '').replace('.git', '');
          normalizedUrl = `https://github.com/${repoPath}`;
        }
        
        // Ensure https protocol
        if (!normalizedUrl.startsWith('http')) {
          normalizedUrl = 'https://' + normalizedUrl;
        }
        
        // Remove trailing slash and ensure unique
        normalizedUrl = normalizedUrl.replace(/\/$/, '');
        if (!githubLinks.includes(normalizedUrl)) {
          githubLinks.push(normalizedUrl);
        }
      });
    }
  });
  
  return githubLinks;
}

// Enhanced project extraction with better parsing
function extractProjects(text) {
  const projects = [];
  const lines = text.split('\n');
  let currentProject = null;
  let inProjectSection = false;
  
  const projectSectionKeywords = [
    'projects', 'project', 'portfolio', 'work experience', 'experience', 
    'accomplishments', 'achievements', 'applications', 'development',
    'key projects', 'selected projects', 'notable projects'
  ];
  
  const projectIndicators = [
    'built', 'developed', 'created', 'designed', 'implemented', 
    'led', 'managed', 'architected', 'deployed', 'launched',
    'delivered', 'engineered', 'constructed', 'programmed'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Check for project section headers
    if (projectSectionKeywords.some(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      return keywordRegex.test(line) && (line.includes(':') || line.length < 50);
    })) {
      inProjectSection = true;
      continue;
    }
    
    if (!line) continue;
    
    // Enhanced project detection
    const isProjectTitle = (
      line.match(/^[\•\-\*\d\.\)\(]+/) || // Bullet points, numbers
      (line.match(/^[A-Z]/) && line.length > 10 && line.length < 100) || // Title case
      projectIndicators.some(indicator => lowerLine.includes(indicator)) ||
      (inProjectSection && line.match(/^[^\s]/)) // First non-whitespace in project section
    );
    
    if (isProjectTitle) {
      // Save previous project
      if (currentProject && currentProject.name) {
        projects.push(currentProject);
      }
      
      // Clean project name
      let projectName = line.replace(/^[\•\-\*\d\.\)\(\s]+/, '').trim();
      projectName = projectName.replace(/:\s*$/, ''); // Remove trailing colon
      
      currentProject = {
        name: projectName,
        description: '',
        technologies: [],
        duration: extractDuration(line),
        githubUrl: ''
      };
      
      // Extract technologies from title line
      const techsInTitle = extractSkills(line);
      currentProject.technologies = [...new Set(techsInTitle)];
      
    } else if (currentProject && line.length > 15) {
      // Add to description
      if (currentProject.description) {
        currentProject.description += ' ';
      }
      currentProject.description += line;
      
      // Extract technologies from description
      const techsInLine = extractSkills(line);
      currentProject.technologies = [...new Set([...currentProject.technologies, ...techsInLine])];
    }
    
    // Check if we've left the project section
    if (line.match(/^[A-Z\s]{5,}:?\s*$/) && 
        !projectSectionKeywords.some(k => lowerLine.includes(k))) {
      inProjectSection = false;
    }
  }
  
  // Add the last project
  if (currentProject && currentProject.name) {
    projects.push(currentProject);
  }
  
  return projects.filter(project => 
    project.name.length > 3 && 
    project.name.length < 200
  );
}

// Extract duration/timeframe from text
function extractDuration(text) {
  const durationPatterns = [
    /\b(\d{4})\s*-\s*(\d{4}|\w+)\b/g, // 2020-2021 or 2020-Present
    /\b(\w+\s+\d{4})\s*-\s*(\w+\s+\d{4}|\w+)\b/g, // Jan 2020 - Dec 2020
    /\b(\d+)\s+(months?|years?|weeks?)\b/g // 3 months, 1 year
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return '';
}

// Enhanced project-GitHub matching
function matchProjectsWithGitHub(projects, githubLinks) {
  const enhancedProjects = projects.map(project => {
    const matchingLink = githubLinks.find(link => {
      const repoName = link.split('/').pop().toLowerCase();
      const projectName = project.name.toLowerCase().replace(/\s+/g, '');
      
      // Multiple matching strategies
      return (
        repoName.includes(projectName) ||
        projectName.includes(repoName) ||
        project.description.toLowerCase().includes(repoName) ||
        link.toLowerCase().includes(projectName)
      );
    });
    
    return {
      ...project,
      githubUrl: matchingLink || ''
    };
  });
  
  return enhancedProjects;
}

// Parse Resume & Match
router.post("/parse-resume", async (req, res) => {
  try {
    const { userId, text, name } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No resume text provided" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Extract information
    const skills = extractSkills(text);
    const githubLinks = extractGitHubLinks(text);
    const rawProjects = extractProjects(text);
    const projects = matchProjectsWithGitHub(rawProjects, githubLinks);

    // Save/update user in database
    let user = await User.findById(userId);
    if (!user) {
      user = new User({ 
        _id: userId, 
        fullName: name || 'Unknown User', 
        skills,
        githubLinks,
        projects
      });
    } else {
      user.fullName = name || user.fullName;
      user.skills = [...new Set([...user.skills, ...skills])]; // Merge skills
      user.githubLinks = [...new Set([...user.githubLinks, ...githubLinks])]; // Merge GitHub links
      user.projects = projects; // Replace projects
    }
    
    await user.save();

    // Enhanced matching algorithm
    const allUsers = await User.find({ _id: { $ne: userId } });
    const matches = allUsers
      .map(u => {
        const sharedSkills = u.skills.filter(skill => skills.includes(skill));
        const sharedProjects = u.projects.filter(p1 => 
          projects.some(p2 => {
            // Match by shared technologies
            const sharedTech = p1.technologies.filter(tech => 
              p2.technologies.includes(tech)
            );
            return sharedTech.length > 0;
          })
        );
        
        // Calculate match score
        const skillScore = sharedSkills.length * 2;
        const projectScore = sharedProjects.length * 3;
        const totalScore = skillScore + projectScore;
        
        if (totalScore > 0) {
          return { 
            userId: u._id, 
            name: u.fullName, 
            sharedSkills, 
            sharedProjects: sharedProjects.map(p => ({
              name: p.name,
              technologies: p.technologies
            })),
            skillsCount: sharedSkills.length,
            projectsCount: sharedProjects.length,
            matchScore: totalScore
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Response
    res.json({ 
      success: true,
      userSkills: skills, 
      githubLinks: githubLinks,
      projects: projects.map(p => ({
        name: p.name,
        description: p.description.substring(0, 500), // Limit description length
        technologies: p.technologies,
        duration: p.duration,
        githubUrl: p.githubUrl
      })),
      matches,
      stats: {
        skillsFound: skills.length,
        projectsFound: projects.length,
        githubLinksFound: githubLinks.length,
        matchesFound: matches.length
      }
    });

  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(500).json({ 
      error: "Failed to parse resume",
      details: error.message 
    });
  }
});

// Additional endpoint to get user's parsed data
router.get("/user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      name: user.fullName,
      skills: user.skills,
      githubLinks: user.githubLinks,
      projects: user.projects
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

module.exports = router;