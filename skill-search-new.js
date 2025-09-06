// Custom skill search implementation with teammate search functionality

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const skillSearch = document.getElementById('skillSearch');
  const availabilityFilter = document.getElementById('availabilityFilter');
  const findBtn = document.getElementById('findBtn');
  const teammatesDiv = document.getElementById('teammates');
  
  if (!skillSearch) return;
  
  // Create a container for skill suggestions
  const skillSuggestions = document.createElement('div');
  skillSuggestions.id = 'skill-suggestions';
  skillSuggestions.style.position = 'absolute';
  skillSuggestions.style.width = '100%';
  skillSuggestions.style.background = 'rgba(60, 60, 80, 0.95)';
  skillSuggestions.style.borderRadius = '10px';
  skillSuggestions.style.zIndex = '10';
  skillSuggestions.style.maxHeight = '150px';
  skillSuggestions.style.overflowY = 'auto';
  skillSuggestions.style.display = 'none';
  skillSuggestions.style.marginTop = '5px';
  skillSuggestions.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
  skillSuggestions.style.backdropFilter = 'blur(10px)';
  
  // Append to the skill search form group
  skillSearch.parentNode.appendChild(skillSuggestions);
  
  // List of common skills for suggestions
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'PHP', 'Ruby', 'C++', 'C#', 'TypeScript', 'SQL', 'MongoDB', 'AWS',
    'Docker', 'Kubernetes', 'DevOps', 'Machine Learning', 'AI', 'Data Science',
    'UI/UX Design', 'Graphic Design', 'Project Management', 'Agile', 'Scrum'
  ];
  
  // Filter skills based on input
  function filterSkills(input) {
    if (!input) return [];
    input = input.toLowerCase();
    return commonSkills.filter(skill => 
      skill.toLowerCase().includes(input)
    );
  }
  
  // Show suggestions
  function showSuggestions(suggestions) {
    if (suggestions.length === 0) {
      skillSuggestions.style.display = 'none';
      return;
    }
    
    skillSuggestions.innerHTML = '';
    
    suggestions.forEach(skill => {
      const item = document.createElement('div');
      item.textContent = skill;
      item.style.padding = '8px 15px';
      item.style.cursor = 'pointer';
      item.style.color = '#fff';
      
      item.addEventListener('mouseover', () => {
        item.style.background = 'rgba(108, 99, 255, 0.5)';
      });
      
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        skillSearch.value = skill;
        skillSuggestions.style.display = 'none';
      });
      
      skillSuggestions.appendChild(item);
    });
    
    skillSuggestions.style.display = 'block';
  }
  
  // Handle input changes
  skillSearch.addEventListener('input', () => {
    const value = skillSearch.value.trim();
    const suggestions = filterSkills(value);
    showSuggestions(suggestions);
  });
  
  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== skillSearch && e.target !== skillSuggestions) {
      skillSuggestions.style.display = 'none';
    }
  });
  
  // Handle focus on skill search
  skillSearch.addEventListener('focus', () => {
    const value = skillSearch.value.trim();
    const suggestions = filterSkills(value);
    showSuggestions(suggestions);
  });
  
  // Prevent default browser dropdown behavior
  skillSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = skillSuggestions.children;
      if (suggestions.length > 0) {
        skillSearch.value = suggestions[0].textContent;
        skillSuggestions.style.display = 'none';
      }
    }
  });

  // Add search functionality
  async function performSearch() {
    try {
      console.log('Starting search...');
      // Show loading state
      teammatesDiv.innerHTML = '<p>Searching for teammates...</p>';

      // Get search parameters
      const skills = skillSearch.value.trim();
      const availability = availabilityFilter.value;

      console.log('Search parameters:', { skills, availability });

      // For testing purposes, temporarily bypass authentication
      const token = 'test-token'; // localStorage.getItem('authToken');

      console.log('Making API request...');
      // Make API request
      const url = `/api/search/teammates?skills=${encodeURIComponent(skills)}&availability=${encodeURIComponent(availability)}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html?redirect=/dashboard.html';
        return;
      }

      const data = await response.json();
      console.log('Search results:', data);

      if (!data.success) {
        throw new Error(data.message || 'Search failed');
      }

      // Display results
      if (!data.teammates || data.teammates.length === 0) {
        teammatesDiv.innerHTML = '<p>No teammates found matching your criteria.</p>';
        return;
      }

      console.log('Processing teammates:', data.teammates);
      
      // Create cards for each teammate
      const cardsHTML = data.teammates.map(teammate => {
        // Handle cases where skills might not be an array
        const skills = Array.isArray(teammate.skills) ? teammate.skills.join(', ') : 
                        (teammate.skills || 'No skills listed');
        
        return `
          <div class="teammate-card">
            <img src="${teammate.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" 
                alt="${teammate.name}" class="teammate-avatar">
            <h3>${teammate.name}</h3>
            <p><strong>Skills:</strong> ${skills}</p>
            <p><strong>Availability:</strong> ${teammate.availability || 'Not specified'}</p>
            <p><strong>Bio:</strong> ${teammate.bio || 'No bio available'}</p>
            <button onclick="showConnectionModal('${teammate.name}', '${teammate._id || teammate.id || 'ID-' + Math.random().toString(36).substr(2, 9)}', '123-456-7890')" class="connect-btn">
              Connect
            </button>
          </div>
        `;
      }).join('');

      teammatesDiv.innerHTML = cardsHTML;

    } catch (error) {
      console.error('Search error:', error);
      teammatesDiv.innerHTML = `
        <p class="error">Error performing search: ${error.message}</p>
        <button onclick="performSearch()" class="retry-btn">Retry Search</button>
      `;
    }
  }

  // Add click handler for search button
  if (findBtn) {
    findBtn.addEventListener('click', performSearch);
  }
});
