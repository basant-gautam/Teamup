// Resume extraction dependencies
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

// Multer setup for file upload
const upload = multer({ dest: 'uploads/' });

// Skill keywords and extraction logic (from resume.js)
const SKILLS_KEYWORDS = {
  python: ["python", "django", "flask", "pandas", "numpy", "scikit-learn", "sklearn"],
  javascript: ["javascript", "react", "angular", "vue", "nodejs", "express", "next.js", "typescript"],
  web_dev: ["html", "css", "tailwind", "bootstrap", "responsive design"],
  data_science: ["data science", "machine learning", "ml", "deep learning", "pytorch", "tensorflow", "data analysis"],
  database: ["sql", "nosql", "mongodb", "postgresql", "mysql", "firebase"],
  cloud: ["aws", "azure", "gcp", "docker", "kubernetes"],
  mobile: ["flutter", "react native", "ios", "android", "swift"],
  design: ["figma", "sketch", "adobe xd", "ui/ux", "photoshop", "illustrator"]
};

function extractSkills(text) {
  const extracted = new Set();
  const cleanedText = text.toLowerCase();
  Object.values(SKILLS_KEYWORDS).forEach(keywords => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(cleanedText)) {
        extracted.add(keyword);
      }
    });
  });
  return Array.from(extracted);
}

// Extract GitHub links from resume text
function extractGitHubLinks(text) {
  const githubLinks = [];
  console.log('Extracting GitHub links from text length:', text.length);
  
  // More comprehensive regex patterns for GitHub URLs
  const patterns = [
    // Full URLs
    /https?:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/gi,
    /https?:\/\/www\.github\.com\/[\w\-\.]+\/[\w\-\.]+/gi,
    // Without protocol
    /(?:www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/gi,
    // Just domain and username
    /(?:www\.)?github\.com\/[\w\-\.]+/gi,
    // GitHub mentions in text
    /github:\s*[\w\-\.]+\/[\w\-\.]+/gi,
    /github:\s*[\w\-\.]+/gi,
    // URLs in different formats
    /(?:GitHub|Github|github):\s*https?:\/\/github\.com\/[\w\-\.]+(?:\/[\w\-\.]+)?/gi,
    // Links in parentheses or brackets
    /\(https?:\/\/github\.com\/[\w\-\.]+(?:\/[\w\-\.]+)?\)/gi,
    /\[https?:\/\/github\.com\/[\w\-\.]+(?:\/[\w\-\.]+)?\]/gi
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = text.match(pattern);
    console.log(`Pattern ${index + 1} matches:`, matches);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match
        let cleanMatch = match.replace(/^(GitHub|Github|github):\s*/i, '');
        cleanMatch = cleanMatch.replace(/[()[\]]/g, ''); // Remove brackets/parentheses
        
        // Normalize the URL
        let normalizedUrl = cleanMatch;
        if (!normalizedUrl.startsWith('http')) {
          normalizedUrl = 'https://' + normalizedUrl;
        }
        if (!githubLinks.includes(normalizedUrl)) {
          githubLinks.push(normalizedUrl);
          console.log('Added GitHub link:', normalizedUrl);
        }
      });
    }
  });
  
  console.log('Final GitHub links found:', githubLinks);
  return githubLinks;
}

// Extract projects from resume text
function extractProjects(text) {
  const projects = [];
  const lines = text.split('\n');
  let currentProject = null;
  let inProjectSection = false;
  
  console.log('Extracting projects from', lines.length, 'lines');
  
  // Keywords that indicate project sections
  const projectSectionKeywords = [
    'projects', 'project', 'portfolio', 'work experience', 'experience', 
    'accomplishments', 'achievements', 'applications', 'development',
    'technical projects', 'personal projects', 'academic projects'
  ];
  
  // Keywords that indicate project items
  const projectIndicators = [
    'built', 'developed', 'created', 'designed', 'implemented', 
    'led', 'managed', 'architected', 'deployed', 'launched',
    'programmed', 'coded', 'engineered', 'constructed', 'established'
  ];
  
  // Section headers that should stop project parsing
  const sectionHeaders = [
    'education', 'skills', 'skill summary', 'certifications', 'contact', 
    'summary', 'objective', 'achievements', 'volunteer', 'awards'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Skip empty lines and single characters
    if (!line || line.length <= 2) continue;
    
    // Check if we're entering a project section
    if (projectSectionKeywords.some(keyword => 
        lowerLine === keyword || lowerLine === keyword + 's' || lowerLine.startsWith(keyword + ':'))) {
      inProjectSection = true;
      console.log('Entering project section at line:', i, line);
      continue;
    }
    
    // Check if we're leaving project section
    if (sectionHeaders.some(header => 
        lowerLine === header || lowerLine.startsWith(header))) {
      if (inProjectSection) {
        console.log('Leaving project section at line:', i, line);
      }
      inProjectSection = false;
      continue;
    }
    
    if (inProjectSection) {
      // Check if this is a project title
      // Project titles usually:
      // 1. Have a reasonable length (5-80 characters)
      // 2. May contain a date
      // 3. Are not bullet points that start with "•" followed by lowercase
      // 4. Don't start with common bullet point text
      
      const isProjectTitle = (
        line.length >= 5 && line.length <= 80 &&
        !line.startsWith('•') &&
        !line.toLowerCase().startsWith('used ') &&
        !line.toLowerCase().startsWith('implemented ') &&
        !line.toLowerCase().startsWith('developed ') &&
        !line.toLowerCase().startsWith('created ') &&
        !line.toLowerCase().startsWith('built ') &&
        (
          // Contains a date pattern (month/year)
          line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/i) ||
          // Starts with capital letter and looks like a title
          (line[0] === line[0].toUpperCase() && 
           !line.includes(' a ') && 
           !line.includes(' the ') &&
           line.split(' ').length <= 8)
        )
      );
      
      if (isProjectTitle) {
        console.log('Found project title:', line);
        
        // Save previous project
        if (currentProject && currentProject.name && currentProject.name.length > 3) {
          projects.push(currentProject);
          console.log('Saved project:', currentProject.name);
        }
        
        // Start new project - remove date from name
        const projectName = line.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}\b/gi, '').trim();
        const datePart = line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}\b/gi);
        
        currentProject = {
          name: projectName,
          description: '',
          technologies: [],
          date: datePart ? datePart[0] : ''
        };
        console.log('Started new project:', projectName);
      } else if (currentProject && line.length > 10) {
        // Add to project description, but skip obvious technology lists
        if (!line.match(/^[A-Za-z\s,]+Github/i) && !line.toLowerCase().includes('github —')) {
          // Check if this line is mostly bullet points describing the project
          if (line.startsWith('•') || line.toLowerCase().includes('implemented') || 
              line.toLowerCase().includes('developed') || line.toLowerCase().includes('used')) {
            currentProject.description += (currentProject.description ? ' ' : '') + line.replace(/^•\s*/, '');
            console.log('Added to description:', line.substring(0, 50) + '...');
          }
        }
        
        // Extract technologies from this line
        const techsInLine = extractSkills(line);
        if (techsInLine.length > 0) {
          currentProject.technologies = [...new Set([...currentProject.technologies, ...techsInLine])];
          console.log('Added technologies:', techsInLine);
        }
      }
    }
  }
  
  // Don't forget the last project
  if (currentProject && currentProject.name && currentProject.name.length > 3) {
    projects.push(currentProject);
    console.log('Saved final project:', currentProject.name);
  }
  
  // Filter out invalid projects
  const validProjects = projects.filter(project => 
    project.name.length > 3 && 
    project.name.length < 100 &&
    !project.name.toLowerCase().includes('achieved') &&
    !project.name.toLowerCase().includes('awarded')
  );
  
  console.log('Final valid projects found:', validProjects.length);
  return validProjects;
}

// Extract achievements from resume text
function extractAchievements(text) {
  const achievements = [];
  const lines = text.split('\n');
  let inAchievementSection = false;
  
  console.log('Extracting achievements from', lines.length, 'lines');
  
  // Keywords that indicate achievement sections
  const achievementSectionKeywords = [
    'achievements', 'accomplishments', 'awards', 'honors', 'recognition',
    'certifications', 'certificates', 'notable achievements', 'accolades'
  ];
  
  // Keywords that indicate achievement items
  const achievementIndicators = [
    'awarded', 'recognized', 'achieved', 'accomplished', 'received', 'earned',
    'won', 'ranked', 'scored', 'selected', 'nominated', 'certified', 'placed'
  ];
  
  // Section headers that should stop achievement parsing
  const sectionHeaders = [
    'education', 'skills', 'skill summary', 'contact', 'summary', 'objective',
    'projects', 'experience', 'work experience', 'volunteer'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Skip empty lines and single characters
    if (!line || line.length <= 2) continue;
    
    // Check if we're entering an achievement section
    if (achievementSectionKeywords.some(keyword => 
        lowerLine === keyword || lowerLine === keyword + 's' || lowerLine.startsWith(keyword + ':'))) {
      inAchievementSection = true;
      console.log('Entering achievement section at line:', i, line);
      continue;
    }
    
    // Check if we're leaving achievement section
    if (sectionHeaders.some(header => 
        lowerLine === header || lowerLine.startsWith(header))) {
      if (inAchievementSection) {
        console.log('Leaving achievement section at line:', i, line);
      }
      inAchievementSection = false;
      continue;
    }
    
    if (inAchievementSection) {
      // Process achievement lines
      if (line.length >= 10 && line.length <= 200) {
        const achievement = {
          title: line.replace(/^[•\-\*]\s*/, '').trim(),
          type: classifyAchievementType(line)
        };
        
        if (achievement.title.length >= 10) {
          achievements.push(achievement);
          console.log('Found achievement:', achievement.title);
        }
      }
    } else {
      // Also look for achievements outside dedicated sections
      if (achievementIndicators.some(indicator => lowerLine.includes(indicator)) &&
          line.length >= 15 && line.length <= 200) {
        const achievement = {
          title: line.replace(/^[•\-\*]\s*/, '').trim(),
          type: classifyAchievementType(line)
        };
        
        achievements.push(achievement);
        console.log('Found achievement outside section:', achievement.title);
      }
    }
  }
  
  // Remove duplicates and filter valid achievements
  const validAchievements = achievements.filter((achievement, index, self) => 
    index === self.findIndex(a => a.title === achievement.title) &&
    achievement.title.length >= 10 &&
    !achievement.title.toLowerCase().includes('project') &&
    !achievement.title.toLowerCase().includes('developed') &&
    !achievement.title.toLowerCase().includes('built')
  );
  
  console.log('Final valid achievements found:', validAchievements.length);
  return validAchievements;
}

// Classify achievement type
function classifyAchievementType(achievementText) {
  const lowerText = achievementText.toLowerCase();
  
  if (lowerText.includes('award') || lowerText.includes('prize')) {
    return 'Award';
  } else if (lowerText.includes('certification') || lowerText.includes('certified')) {
    return 'Certification';
  } else if (lowerText.includes('recognition') || lowerText.includes('recognized')) {
    return 'Recognition';
  } else if (lowerText.includes('scholarship') || lowerText.includes('grant')) {
    return 'Scholarship';
  } else if (lowerText.includes('rank') || lowerText.includes('position') || lowerText.includes('place')) {
    return 'Ranking';
  } else {
    return 'Achievement';
  }
}

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
require('dotenv').config();

// Set up global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  // Don't exit the process, just log it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  // Don't exit the process, just log it
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/')));

// Integrate resume.js routes
const resumeRoutes = require('./routes/resume');
app.use('/api/resume', resumeRoutes);

// Define Mongoose Schemas and Models
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  skills: { type: [String], default: [] },
  bio: { type: String, default: "" },
  availability: { type: String, default: "Not specified" },
  githubLinks: { type: [String], default: [] },
  projects: [{
    name: { type: String, required: true },
    description: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    githubUrl: { type: String, default: "" }
  }],
  achievements: [{
    title: { type: String, required: true },
    type: { type: String, default: "Achievement" }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const teammateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  skills: { type: [String], default: [] },
  availability: { type: String, default: "Not specified" },
  bio: { type: String, default: "" },
  avatar: { type: String, default: "https://randomuser.me/api/portraits/lego/1.jpg" }
});

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const Teammate = mongoose.model('Teammate', teammateSchema);

// Export User model for use in other files
module.exports.User = User;

// Sessions storage for compatibility during transition
let sessions = {};

// In-memory data for fallback mode
let users = [];
let inMemoryTeammates = [
  { 
    id: 1, 
    name: "Alice Johnson", 
    skills: ["Python", "Machine Learning", "Data Science"], 
    availability: "Now",
    bio: "AI researcher with 5 years of experience",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg"
  },
  { 
    id: 2, 
    name: "Bob Smith", 
    skills: ["JavaScript", "React", "UI/UX Design"], 
    availability: "Later Today",
    bio: "Frontend developer passionate about creating beautiful interfaces",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg" 
  },
  { 
    id: 3, 
    name: "Charlie Davis", 
    skills: ["AI", "Design", "Project Management"], 
    availability: "This Weekend",
    bio: "Product designer with AI expertise",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg"
  },
  { 
    id: 4, 
    name: "Diana Miller", 
    skills: ["Node.js", "MongoDB", "AWS"], 
    availability: "Next Week",
    bio: "Backend developer specialized in cloud architecture",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg"
  },
  { 
    id: 5, 
    name: "Ethan Wilson", 
    skills: ["Mobile Dev", "Flutter", "Firebase"], 
    availability: "Now",
    bio: "Mobile app developer who loves creating cross-platform solutions",
    avatar: "https://randomuser.me/api/portraits/men/5.jpg"
  }
];

// Initialize database with sample data
const initDatabase = async () => {
  try {
    // Only seed if the collection is empty
    const teammatesCount = await Teammate.countDocuments();
    
    if (teammatesCount === 0) {
      console.log('🌱 Seeding database with sample data...');
      
      // Sample teammates data
      const sampleTeammates = [
        { 
          name: "Alice Johnson", 
          skills: ["Python", "Machine Learning", "Data Science"], 
          availability: "Now",
          bio: "AI researcher with 5 years of experience",
          avatar: "https://randomuser.me/api/portraits/women/1.jpg"
        },
        { 
          name: "Bob Smith", 
          skills: ["JavaScript", "React", "UI/UX Design"], 
          availability: "Later Today",
          bio: "Frontend developer passionate about creating beautiful interfaces",
          avatar: "https://randomuser.me/api/portraits/men/2.jpg" 
        },
        { 
          name: "Charlie Davis", 
          skills: ["AI", "Design", "Project Management"], 
          availability: "This Weekend",
          bio: "Product designer with AI expertise",
          avatar: "https://randomuser.me/api/portraits/men/3.jpg"
        },
        { 
          name: "Diana Miller", 
          skills: ["Node.js", "MongoDB", "AWS"], 
          availability: "Next Week",
          bio: "Backend developer specialized in cloud architecture",
          avatar: "https://randomuser.me/api/portraits/women/4.jpg"
        },
        { 
          name: "Ethan Wilson", 
          skills: ["Mobile Dev", "Flutter", "Firebase"], 
          availability: "Now",
          bio: "Mobile app developer who loves creating cross-platform solutions",
          avatar: "https://randomuser.me/api/portraits/men/5.jpg"
        }
      ];
      
      try {
        await Teammate.insertMany(sampleTeammates);
        console.log('✅ Sample data seeded successfully!');
      } catch (insertError) {
        console.error('Error inserting sample data:', insertError);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    // Don't throw error, just log it
  }
};

// Helper functions
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Basic password hashing (in a real app, use bcrypt)
const hashPassword = (password) => {
  // This is a simple hash for demo purposes only
  // In production, use bcrypt or another secure hashing library
  return password.split('').reverse().join('') + "hashed";
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Signup
app.post("/api/signup", upload.single('resume'), async (req, res) => {
  try {
    const { fullName, email, password, bio, availability } = req.body;
    let skills = req.body.skills || [];
    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide name, email and password" 
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide a valid email address" 
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }
    // If resume file is uploaded, extract skills, GitHub links, projects, and achievements
    let githubLinks = [];
    let projects = [];
    let achievements = [];
    if (req.file) {
      let text = '';
      const filePath = req.file.path;
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.mimetype === 'application/msword') {
        const docData = await mammoth.extractRawText({ path: filePath });
        text = docData.value;
      }
      // Clean up file after extraction
      fs.unlinkSync(filePath);
      if (text) {
        skills = extractSkills(text);
        githubLinks = extractGitHubLinks(text);
        projects = extractProjects(text);
        achievements = extractAchievements(text);
        
        // Match GitHub links to projects if possible
        projects.forEach(project => {
          githubLinks.forEach(link => {
            if (link.toLowerCase().includes(project.name.toLowerCase().replace(/\s+/g, '')) ||
                project.name.toLowerCase().includes(link.split('/').pop().toLowerCase())) {
              project.githubUrl = link;
            }
          });
        });
      }
    } else if (typeof skills === 'string') {
      // If skills is a comma-separated string from form, split it
      skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ 
          success: false,
          message: "User with this email already exists" 
        });
      }
      // Create new user in MongoDB
      const hashedPassword = hashPassword(password);
      const newUser = new User({ 
        fullName, 
        email: email.toLowerCase(), 
        password: hashedPassword, 
        skills: skills || [],
        bio: bio || "",
        availability: availability || "Not specified",
        githubLinks: githubLinks || [],
        projects: projects || [],
        achievements: achievements || []
      });
      await newUser.save();
      // Return user data without password
      const userObject = newUser.toObject();
      const { password: _, ...userWithoutPassword } = userObject;
      res.status(201).json({ 
        success: true,
        message: "Signup successful", 
        user: userWithoutPassword 
      });
    } else {
      // Fallback to in-memory storage
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ 
          success: false,
          message: "User with this email already exists" 
        });
      }
      const hashedPassword = hashPassword(password);
      const newUser = { 
        id: users.length + 1,
        fullName, 
        email: email.toLowerCase(), 
        password: hashedPassword, 
        skills: skills || [],
        bio: bio || "",
        availability: availability || "Not specified",
        githubLinks: githubLinks || [],
        projects: projects || [],
        achievements: achievements || [],
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ 
        success: true,
        message: "Signup successful", 
        user: userWithoutPassword 
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during signup process" 
    });
  }
});

// Debug endpoint to test resume text extraction
app.post("/api/debug/resume-text", upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No resume file uploaded" 
      });
    }

    let text = '';
    const filePath = req.file.path;
    
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               req.file.mimetype === 'application/msword') {
      const docData = await mammoth.extractRawText({ path: filePath });
      text = docData.value;
    }
    
    // Clean up file after extraction
    fs.unlinkSync(filePath);
    
    if (text) {
      const skills = extractSkills(text);
      const githubLinks = extractGitHubLinks(text);
      const projects = extractProjects(text);
      const achievements = extractAchievements(text);
      
      res.json({
        success: true,
        data: {
          originalText: text,
          textLength: text.length,
          extractedSkills: skills,
          extractedGithubLinks: githubLinks,
          extractedProjects: projects,
          extractedAchievements: achievements,
          firstFewLines: text.split('\n').slice(0, 10),
          searchableText: text.toLowerCase()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Could not extract text from resume file"
      });
    }
  } catch (error) {
    console.error("Debug resume parsing error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during resume text extraction",
      error: error.message
    });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide both email and password" 
      });
    }
    
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      // Find user and verify credentials in MongoDB
      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        password: hashPassword(password)
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Generate session
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create and save the session in MongoDB
      try {
        const newSession = new Session({
          userId: user._id,
          token: sessionId,
          expiresAt
        });
        
        await newSession.save();
      } catch (sessionError) {
        console.error("Session save error:", sessionError);
        // Continue even if session save fails
      }
      
      // Also maintain in-memory sessions for compatibility
      sessions[sessionId] = {
        userId: user._id,
        createdAt: new Date(),
        expiresAt
      };
      
      // Return user data without password
      const userObject = user.toObject();
      const { password: _, ...userWithoutPassword } = userObject;
      
      res.json({ 
        success: true,
        message: "Login successful", 
        user: userWithoutPassword,
        token: sessionId,
        expiresAt: expiresAt
      });
    } else {
      // Fallback to in-memory storage
      // Find user and verify credentials
      const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === hashPassword(password)
      );
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Generate session
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      sessions[sessionId] = {
        userId: user.id,
        createdAt: new Date(),
        expiresAt
      };
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        success: true,
        message: "Login successful", 
        user: userWithoutPassword,
        token: sessionId,
        expiresAt: expiresAt
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during login process" 
    });
  }
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }
    
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      try {
        // Check session in MongoDB
        const session = await Session.findOne({ token });
        
        if (session) {
          // Check if session is expired
          if (new Date(session.expiresAt) < new Date()) {
            // Clean up expired session
            await Session.deleteOne({ token });
            
            return res.status(401).json({ 
              success: false,
              message: "Session expired, please login again" 
            });
          }
          
          // Add user to request
          const user = await User.findById(session.userId);
          
          if (!user) {
            return res.status(401).json({ 
              success: false,
              message: "User not found" 
            });
          }
          
          req.user = user;
          req.token = token;
          req.session = session;
          
          return next();
        }
      } catch (mongoError) {
        console.error("MongoDB session check error:", mongoError);
        // Continue to in-memory check if MongoDB check fails
      }
    }
    
    // Fallback to in-memory session check
    if (!sessions[token]) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }
    
    // Check if in-memory session is expired
    if (new Date(sessions[token].expiresAt) < new Date()) {
      delete sessions[token];
      return res.status(401).json({ 
        success: false,
        message: "Session expired, please login again" 
      });
    }
    
    // Add user to request for in-memory mode
    const userId = sessions[token].userId;
    // Try to find user by _id (MongoDB ObjectId) first, then by id (in-memory)
    let user;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(userId);
      } catch (err) {
        // Ignore error and fall back to in-memory
      }
    }
    
    if (!user) {
      // Fallback to in-memory users
      user = users.find(u => u.id === userId);
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    req.user = user;
    req.token = token;
    req.session = sessions[token];
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication"
    });
  }
};

// Get user profile
app.get("/api/profile", authenticateUser, async (req, res) => {
  try {
    // User is already added to req by authenticateUser middleware
    let userWithoutPassword;
    
    // Check if user is a Mongoose document
    if (req.user.toObject) {
      const userObject = req.user.toObject();
      const { password, ...userData } = userObject;
      userWithoutPassword = userData;
    } else {
      // In-memory user
      const { password, ...userData } = req.user;
      userWithoutPassword = userData;
    }
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile"
    });
  }
});

// Get user profile with GitHub links and projects (public endpoint)
app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      res.json({
        success: true,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          skills: user.skills,
          bio: user.bio,
          availability: user.availability,
          githubLinks: user.githubLinks || [],
          projects: user.projects || [],
          createdAt: user.createdAt
        }
      });
    } else {
      // Fallback to in-memory storage
      const user = users.find(u => u.id.toString() === userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    }
  } catch (error) {
    console.error("User profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user profile"
    });
  }
});

// Teammates search endpoint
app.get("/api/search/teammates", async (req, res) => {
  try {
    console.log('Search request received:', req.query);
    // Get search parameters
    const { skills, availability } = req.query;
    
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      try {
        // Build search query
        let query = {};
        
        if (skills && skills.trim() !== '') {
          // Create a case-insensitive regex pattern for skill search
          const skillPattern = new RegExp(skills.trim(), 'i');
          // Search for skills as strings in array
          query.skills = { $elemMatch: { $regex: skillPattern } };
        }
        
        if (availability && availability !== 'Any Availability') {
          query.availability = availability;
        }
        
        console.log('MongoDB search query:', query);
        
        // Search in both User and Teammate collections
        const [teammates, users] = await Promise.all([
          Teammate.find(query),
          User.find(query).select('-password') // Exclude password field
        ]);
        
        // Combine results from both collections
        const allResults = [
          ...teammates,
          ...users.map(user => ({
            _id: user._id,
            name: user.fullName,
            skills: user.skills,
            availability: user.availability,
            bio: user.bio,
            githubLinks: user.githubLinks || [],
            projects: user.projects || [],
            avatar: user.avatar || "https://randomuser.me/api/portraits/lego/1.jpg"
          }))
        ];
        
        console.log('MongoDB search results:', allResults.length, 'teammates/users found');
        console.log('Sample result with GitHub/Projects:', JSON.stringify(allResults[0], null, 2));
        
        return res.json({
          success: true,
          teammates: allResults
        });
      } catch (mongoError) {
        console.error("MongoDB search error:", mongoError);
        // Continue to in-memory if MongoDB fails
      }
    }
    
    // Fallback to in-memory search
    console.log('Using in-memory search fallback');
    let results = [...inMemoryTeammates];
    
    if (skills && skills.trim() !== '') {
      const searchSkill = skills.trim().toLowerCase();
      results = results.filter(t => 
        t.skills.some(skill => 
          skill.toLowerCase().includes(searchSkill)
        )
      );
      console.log('Filtered by skills:', results.length, 'results');
    }
    
    if (availability && availability !== 'Any Availability') {
      results = results.filter(t => t.availability === availability);
    }
    
    return res.json({
      success: true,
      teammates: results
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Error performing search"
    });
  }
});

// Original teammates endpoint with filtering and pagination
app.get("/api/teammates", async (req, res) => {
  try {
    // Get query parameters
    const { skill, availability, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      try {
        // Build query filter
        let filter = {};
        
        if (skill) {
          // Escape special regex characters to avoid issues with terms like "c++"
          const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          filter.skills = { $regex: new RegExp(escapedSkill, 'i') };
        }
        
        if (availability) {
          filter.availability = { $regex: new RegExp(availability, 'i') };
        }
        
        // Pagination
        const skip = (pageNum - 1) * limitNum;
        
        // Find teammates with filters and pagination
        const teammates = await Teammate.find(filter)
          .skip(skip)
          .limit(limitNum);
        
        // Count total matching documents for pagination metadata
        const total = await Teammate.countDocuments(filter);
        
        // Response with pagination metadata
        return res.json({
          success: true,
          teammates,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
          }
        });
      } catch (mongoError) {
        console.error("MongoDB teammates error:", mongoError);
        // Continue to in-memory if MongoDB fails
      }
    }
    
    // Fallback to in-memory teammates
    let filteredTeammates = [...inMemoryTeammates];
    
    if (skill) {
      filteredTeammates = filteredTeammates.filter(t => 
        t.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
      );
    }
    
    if (availability) {
      filteredTeammates = filteredTeammates.filter(t => 
        t.availability.toLowerCase() === availability.toLowerCase()
      );
    }
    
    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginatedTeammates = filteredTeammates.slice(startIndex, endIndex);
    
    // Response with pagination metadata
    res.json({
      success: true,
      teammates: paginatedTeammates,
      pagination: {
        total: filteredTeammates.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(filteredTeammates.length / limitNum)
      }
    });
  } catch (error) {
    console.error("Teammates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching teammates"
    });
  }
});

// Logout endpoint
app.post("/api/logout", authenticateUser, async (req, res) => {
  try {
    const token = req.token;
    
    // Check if MongoDB is available
    if (mongoose.connection.readyState === 1) {
      try {
        // Remove session from MongoDB
        await Session.deleteOne({ token });
      } catch (mongoError) {
        console.error("MongoDB session delete error:", mongoError);
        // Continue even if MongoDB session deletion fails
      }
    }
    
    // Also clean from in-memory sessions
    if (sessions[token]) {
      delete sessions[token];
    }
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout process"
    });
  }
});

// Update profile
app.put("/api/profile", authenticateUser, async (req, res) => {
  try {
    const { fullName, bio, skills, availability } = req.body;
    const user = req.user;
    
    // Update user data
    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (availability) user.availability = availability;
    
    let userWithoutPassword;
    
    // Check if MongoDB is available and user is a Mongoose document
    if (mongoose.connection.readyState === 1 && user.save) {
      try {
        user.updatedAt = new Date();
        await user.save();
        
        // Return updated user without password
        const userObject = user.toObject();
        const { password, ...userData } = userObject;
        userWithoutPassword = userData;
      } catch (mongoError) {
        console.error("MongoDB save error:", mongoError);
        // Continue with in-memory if MongoDB fails
      }
    } else {
      // In-memory user
      user.updatedAt = new Date().toISOString();
      
      // Return updated user without password
      const { password, ...userData } = user;
      userWithoutPassword = userData;
    }
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile"
    });
  }
});

// Serve the main index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve the dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve the database status page
app.get('/db-status', (req, res) => {
  res.sendFile(path.join(__dirname, 'db-status.html'));
});

// API endpoint to view MongoDB data (requires authentication)
app.get('/api/db-status', authenticateUser, async (req, res) => {
  console.log('DB status endpoint called'); // Log when this endpoint is hit
  try {
    // Check MongoDB connection
    const dbStatus = {
      mongoConnected: mongoose.connection.readyState === 1,
      collections: {}
    };
    
    // Only proceed if connected to MongoDB and we have a user
    if (dbStatus.mongoConnected && req.user) {
      // Get user's own data only
      const userData = await User.findById(req.user._id).lean();
      
      // Remove sensitive information
      if (userData) {
        delete userData.password; // Remove password hash
      }
      
      dbStatus.collections.currentUser = {
        data: userData
      };
      
      // Get user's active sessions
      const userSessions = await Session.find({ userId: req.user._id }).lean();
      dbStatus.collections.userSessions = {
        count: userSessions.length,
        active: userSessions.map(session => ({
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        }))
      };
      
      // Get teammates info (this is common data that all users can see)
      const teammateCount = await Teammate.countDocuments();
      const teammateSample = await Teammate.find().limit(5).lean();
      dbStatus.collections.teammates = {
        count: teammateCount,
        sample: teammateSample
      };
    }
    
    res.json(dbStatus);
  } catch (error) {
    console.error('Error getting DB status:', error);
    res.status(500).json({ error: 'Failed to get database status', message: error.message });
  }
});

// Debug route to see all users and teammates
app.get("/api/debug/all-data", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({}).select('-password');
      const teammates = await Teammate.find({});
      
      res.json({
        success: true,
        users: users,
        teammates: teammates,
        userCount: users.length,
        teammateCount: teammates.length
      });
    } else {
      res.json({
        success: false,
        message: "MongoDB not connected",
        inMemoryTeammates: inMemoryTeammates
      });
    }
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

const PORT = process.env.PORT || 5000;

// Attempt to connect to MongoDB, but continue with in-memory data if not available
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quick-teams', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 5-second timeout for server selection
})
.then(async () => {
  console.log('🔌 MongoDB Connected');
  
  // Seed database with initial data
  await initDatabase();
  
  startServer();
})
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  console.log('⚠️ Continuing with in-memory data storage only');
  
  // Populate the in-memory users array with sample data
  if (users.length === 0) {
    users.push({
      id: 1,
      fullName: 'Test User', 
      email: 'test@example.com', 
      password: hashPassword('password123'), 
      skills: ['JavaScript', 'React'],
      bio: "Test user for development",
      availability: "Now",
      createdAt: new Date()
    });
  }
  
  startServer();
});

// API endpoint to view MongoDB data (for debugging)
app.get('/api/db-status', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = {
      mongoConnected: mongoose.connection.readyState === 1,
      collections: {}
    };
    
    // Only proceed if connected to MongoDB
    if (dbStatus.mongoConnected) {
      // Get users count and sample
      const userCount = await User.countDocuments();
      const userSample = await User.find().limit(5).lean();
      dbStatus.collections.users = {
        count: userCount,
        sample: userSample
      };
      
      // Get teammates count and sample
      const teammateCount = await Teammate.countDocuments();
      const teammateSample = await Teammate.find().limit(5).lean();
      dbStatus.collections.teammates = {
        count: teammateCount,
        sample: teammateSample
      };
      
      // Get sessions count
      const sessionCount = await Session.countDocuments();
      dbStatus.collections.sessions = {
        count: sessionCount
      };
    }
    
    res.json(dbStatus);
  } catch (error) {
    console.error('Error getting DB status:', error);
    res.status(500).json({ error: 'Failed to get database status', message: error.message });
  }
});

// Function to start the server
function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 API endpoints available at http://localhost:${PORT}/api/`);
  });
}
// Duplicate server/bootstrap block removed — the main server is started via startServer() above.
// If you need to add extra routes or middleware, require them and register with the existing app
// before calling startServer(), or adjust startServer() to perform additional setup.

