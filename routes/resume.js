// routes/resume.js
const express = require("express");
const router = express.Router();
const { User } = require("../server"); // Import User model from server.js

// Skill keywords
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

// Extract skills
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

// Parse Resume & Match
router.post("/parse-resume", async (req, res) => {
  const { userId, text, name } = req.body;

  if (!text) return res.status(400).json({ error: "No text provided" });

  const skills = extractSkills(text);

  // Save/update user in DB
  let user = await User.findById(userId);
  if (!user) {
    user = new User({ _id: userId, name, skills });
  } else {
    user.name = name || user.name;
    user.skills = skills;
  }
  await user.save();

  // Find matches
  const allUsers = await User.find({ _id: { $ne: userId } });
  const matches = allUsers
    .map(u => {
      const shared = u.skills.filter(skill => skills.includes(skill));
      return shared.length > 0
        ? { userId: u._id, name: u.name, sharedSkills: shared, sharedSkillsCount: shared.length }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.sharedSkillsCount - a.sharedSkillsCount);

  res.json({ userSkills: skills, matches });
});

module.exports = router;