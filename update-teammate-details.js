const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quick-teams', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB!');
  updateTeammatesWithNewFields();
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

// Updated schema with simple skills array (no level field)
const teammateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  skills: { type: [String], default: [] },
  availability: { type: String, default: "Not specified" },
  bio: { type: String, default: "" },
  avatar: { type: String, default: "https://randomuser.me/api/portraits/lego/1.jpg" }
});

const Teammate = mongoose.model('Teammate', teammateSchema);

async function updateTeammatesWithNewFields() {
  const updatedTeammates = [
    {
      name: "Sarah Johnson",
      skills: ["JavaScript", "React", "Node.js", "MongoDB"],
      availability: "Full-time",
      bio: "Full-stack developer with 5 years of experience in web applications",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg"
    },
    {
      name: "Michael Chen",
      skills: ["Python", "Django", "Machine Learning", "AWS"],
      availability: "Part-time",
      bio: "AI/ML specialist with expertise in deep learning and cloud deployment",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg"
    },
    {
      name: "Emily Rodriguez",
      skills: ["UI/UX Design", "Figma", "Adobe XD", "HTML/CSS"],
      availability: "Full-time",
      bio: "Creative UI/UX designer passionate about user-centered design",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg"
    },
    {
      name: "Raj Sharma",
      skills: ["Unity3D", "Game Development", "C#", "3D Modeling"],
      availability: "Full-time",
      bio: "Game developer with passion for creating immersive experiences",
      avatar: "https://randomuser.me/api/portraits/men/11.jpg"
    },
    {
      name: "Nina Martinez",
      skills: ["Cybersecurity", "Network Security", "Penetration Testing", "Linux"],
      availability: "Contract",
      bio: "Security expert specializing in network protection and ethical hacking",
      avatar: "https://randomuser.me/api/portraits/women/12.jpg"
    },
    {
      name: "Viktor Novak",
      skills: ["Embedded Systems", "C++", "IoT", "Arduino"],
      availability: "Part-time",
      bio: "Embedded systems engineer specializing in IoT solutions",
      avatar: "https://randomuser.me/api/portraits/men/19.jpg"
    },
    {
      name: "Grace Liu",
      skills: ["AR/VR Development", "Unity", "WebXR", "3D Animation"],
      availability: "Full-time",
      bio: "AR/VR developer creating immersive mixed reality experiences",
      avatar: "https://randomuser.me/api/portraits/women/20.jpg"
    },
    {
      name: "Alex Turner",
      skills: ["Blockchain", "Solidity", "Web3.js", "Smart Contracts"],
      availability: "Contract",
      bio: "Blockchain developer specializing in DeFi applications",
      avatar: "https://randomuser.me/api/portraits/men/10.jpg"
    },
    {
      name: "Yuki Tanaka",
      skills: ["iOS Development", "Swift", "SwiftUI", "Objective-C"],
      availability: "Part-time",
      bio: "iOS developer creating elegant and efficient mobile applications",
      avatar: "https://randomuser.me/api/portraits/women/14.jpg"
    },
    {
      name: "Omar Hassan",
      skills: ["Cloud Architecture", "Azure", "Serverless", "Microservices"],
      availability: "Full-time",
      bio: "Cloud architect with focus on scalable and resilient systems",
      avatar: "https://randomuser.me/api/portraits/men/15.jpg"
    }
  ];

  try {
    // Drop the existing collection and recreate with new schema
    await mongoose.connection.dropCollection('teammates');
    console.log('Dropped existing collection to update schema');

    // Then add new teammates with complete information
    for (const teammate of updatedTeammates) {
      const exists = await Teammate.findOne({ name: teammate.name });
      if (exists) {
        // Update existing teammate with new fields
        await Teammate.updateOne({ name: teammate.name }, teammate);
        console.log(`✅ Updated teammate: ${teammate.name}`);
      } else {
        // Create new teammate
        await Teammate.create(teammate);
        console.log(`✅ Added new teammate: ${teammate.name}`);
      }
    }

    // List all teammates with their updated information
    const allTeammates = await Teammate.find({});
    console.log('\nCurrent teammates in database:', allTeammates.length);
    allTeammates.forEach(teammate => {
      console.log(`\n- ${teammate.name}`);
      console.log(`  City: ${teammate.city}`);
      console.log(`  Address: ${teammate.address}`);
      console.log('  Skills:');
      teammate.skills.forEach(skill => {
        console.log(`    - ${skill}`);
      });
    });
  } catch (error) {
    console.error('Error updating teammates:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}
