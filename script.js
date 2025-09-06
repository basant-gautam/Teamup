document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const findBtn = document.getElementById('findBtn');
  const profileDiv = document.getElementById('profile');
  const teammatesDiv = document.getElementById('teammates');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form values
      const fullName = document.getElementById('fullName').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const skills = Array.from(document.getElementById('skills').selectedOptions).map(opt => opt.value);
      const bio = document.getElementById('bio').value;
      const availability = document.getElementById('availability').value;
      const resumeFile = document.getElementById('resume') ? document.getElementById('resume').files[0] : null;

      // Validate password match
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      try {
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing Up...';

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('skills', skills.join(','));
        formData.append('bio', bio);
        formData.append('availability', availability);
        if (resumeFile) {
          formData.append('resume', resumeFile);
        }

        // Send API request
        const response = await fetch('/api/signup', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to sign up');
        }

        alert('Signup successful! Please log in.');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Signup error:', error);
        alert(`Signup failed: ${error.message || 'Please try again'}`);

        // Reset button
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form values
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        // Send API request
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Login failed');
        }
        
        // Store the authentication token
        localStorage.setItem('authToken', data.token);
        
        // Get redirect URL from query parameters or default to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || '/dashboard';
        
        // Redirect user
        window.location.href = redirect;
      } catch (error) {
        console.error('Login error:', error);
        alert(`Login failed: ${error.message || 'Invalid credentials'}`);
        
        // Reset button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  if (profileDiv) {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      // Not logged in, redirect to login
      window.location.href = '/login?redirect=/dashboard';
      return;
    }
    
    // Fetch user profile from API
    fetchUserProfile();
    
    async function fetchUserProfile() {
      try {
        // Show loading state
        profileDiv.innerHTML = '<p>Loading profile...</p>';
        
        // Make API request
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          window.location.href = '/login?redirect=/dashboard';
          return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to load profile');
        }
        
        const user = data.user;
        
        // Display user profile
        profileDiv.innerHTML = `
          <h3>${user.fullName}</h3>
          <p><strong>Skills:</strong> ${user.skills.join(', ')}</p>
          <p><strong>Bio:</strong> ${user.bio || 'No bio provided'}</p>
          <p><strong>Availability:</strong> ${user.availability}</p>
          <button id="logoutBtn" class="logout-btn">Logout</button>
        `;
        
        // Add logout functionality
        document.getElementById('logoutBtn').addEventListener('click', async () => {
          try {
            // Call logout API
            await fetch('/api/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            // Clear token and redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          } catch (error) {
            console.error('Logout error:', error);
            // Still redirect to login even if API call fails
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          }
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        profileDiv.innerHTML = `
          <p class="error">Error loading profile: ${error.message}</p>
          <button id="retryProfile" class="btn">Retry</button>
        `;
        
        document.getElementById('retryProfile').addEventListener('click', fetchUserProfile);
      }
    }
  }

  if (findBtn) {
    // Initialize with all teammates
    fetchTeammates();
    
    // Add event listeners
    findBtn.addEventListener('click', () => {
      fetchTeammates();
    });
    
    // Add input event for real-time search as user types (optional)
    const skillSearchInput = document.getElementById('skillSearch');
    if (skillSearchInput) {
      skillSearchInput.addEventListener('input', debounce(() => {
        fetchTeammates();
      }, 500)); // 500ms debounce to prevent too many requests
    }
    
    // Add change event for availability filter
    const availabilityFilter = document.getElementById('availabilityFilter');
    if (availabilityFilter) {
      availabilityFilter.addEventListener('change', () => {
        fetchTeammates();
      });
    }
  }
  
  // Debounce function to limit how often a function is called
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  // Function to fetch teammates based on search criteria
  async function fetchTeammates(page = 1) {
    const skillSearch = document.getElementById('skillSearch')?.value || '';
    const availabilityFilter = document.getElementById('availabilityFilter')?.value || '';
    const teammatesDiv = document.getElementById('teammates');
    const paginationDiv = document.getElementById('pagination');
    
    if (!teammatesDiv) return;
    
    try {
      // Show loading state
      teammatesDiv.innerHTML = '<div class="loading">Loading teammates...</div>';
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (skillSearch) queryParams.append('skill', skillSearch);
      if (availabilityFilter) queryParams.append('availability', availabilityFilter);
      queryParams.append('page', page);
      queryParams.append('limit', 6); // Show 6 teammates per page
      
      // Get token for authentication
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login?redirect=/dashboard';
        return;
      }
      
      // Fetch teammates from the API
      const response = await fetch(`/api/teammates?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        window.location.href = '/login?redirect=/dashboard';
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch teammates');
      }
      
      // Display teammates
      if (data.teammates.length === 0) {
        teammatesDiv.innerHTML = `
          <div class="no-results">
            <h4>No teammates found</h4>
            <p>Try changing your search criteria</p>
          </div>
        `;
        paginationDiv.innerHTML = '';
        return;
      }
      
      // Display teammate cards
      teammatesDiv.innerHTML = data.teammates.map(tm => `
        <div class="card">
          <div class="avatar">
            <img src="${tm.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" alt="${tm.name}" class="team-member-img">
          </div>
          <h3>${tm.name}</h3>
          <p><strong>Skills:</strong> ${tm.skills.join(', ')}</p>
          <p><strong>Availability:</strong> ${tm.availability}</p>
          <p class="bio">${tm.bio || 'No bio available'}</p>
          <button class="btn connect-btn" data-id="${tm._id}">Connect</button>
        </div>
      `).join('');
      
      // Function to generate a random valid phone number with country code
      function generateRandomPhoneNumber() {
        // Generate a random country code (common ones)
        const countryCodes = ['+1', '+44', '+91', '+61', '+49', '+33', '+81', '+86'];
        const countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)];
        
        // Generate the remaining digits based on the country code format
        let phoneNumber = '';
        
        switch(countryCode) {
          case '+1': // US/Canada: +1 XXX XXX XXXX
            phoneNumber = countryCode + ' ' + 
                          Math.floor(Math.random() * 900 + 100) + ' ' +
                          Math.floor(Math.random() * 900 + 100) + ' ' +
                          Math.floor(Math.random() * 9000 + 1000);
            break;
          case '+44': // UK: +44 XX XXXX XXXX
            phoneNumber = countryCode + ' ' + 
                          Math.floor(Math.random() * 90 + 10) + ' ' +
                          Math.floor(Math.random() * 9000 + 1000) + ' ' +
                          Math.floor(Math.random() * 9000 + 1000);
            break;
          case '+91': // India: +91 XXXXX XXXXX
            phoneNumber = countryCode + ' ' + 
                          Math.floor(Math.random() * 90000 + 10000) + ' ' +
                          Math.floor(Math.random() * 90000 + 10000);
            break;
          default: // Generic format: +XX XXX XXX XXXX
            phoneNumber = countryCode + ' ' + 
                          Math.floor(Math.random() * 900 + 100) + ' ' +
                          Math.floor(Math.random() * 900 + 100) + ' ' +
                          Math.floor(Math.random() * 9000 + 1000);
        }
        
        return phoneNumber;
      }
      
      // Add event listeners to connect buttons
      document.querySelectorAll('.connect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const teammateId = e.target.getAttribute('data-id');
          const phoneNumber = generateRandomPhoneNumber();
          
          // Get the teammate name from the card
          const card = e.target.closest('.card');
          const teammateName = card.querySelector('h3').textContent;
          
          // Show modal with teammate ID and phone number
          if (typeof showConnectionModal === 'function') {
            showConnectionModal(teammateName, teammateId, phoneNumber);
          } else {
            // Fallback to alert if modal function isn't available
            alert(`Connection request sent to teammate ID: ${teammateId}\n\nContact information:\nPhone: ${phoneNumber}`);
          }
          
          // Here you could implement an actual connection request API call
        });
      });
      
      // Display pagination if there are multiple pages
      if (data.pagination && data.pagination.pages > 1) {
        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous page button
        if (data.pagination.page > 1) {
          paginationHTML += `<button class="pagination-btn" data-page="${data.pagination.page - 1}">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= data.pagination.pages; i++) {
          paginationHTML += `<button class="pagination-btn ${i === data.pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        // Next page button
        if (data.pagination.page < data.pagination.pages) {
          paginationHTML += `<button class="pagination-btn" data-page="${data.pagination.page + 1}">Next</button>`;
        }
        
        paginationHTML += '</div>';
        paginationDiv.innerHTML = paginationHTML;
        
        // Add click events to pagination buttons
        document.querySelectorAll('.pagination-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const pageNum = parseInt(e.target.getAttribute('data-page'));
            fetchTeammates(pageNum);
            // Scroll back to top of results
            document.getElementById('searchResults').scrollIntoView({behavior: 'smooth'});
          });
        });
      } else {
        paginationDiv.innerHTML = '';
      }
      
    } catch (error) {
      console.error('Error fetching teammates:', error);
      teammatesDiv.innerHTML = `
        <div class="error">
          <h4>Error</h4>
          <p>${error.message || 'Failed to load teammates. Please try again.'}</p>
        </div>
      `;
    }
  }
});
