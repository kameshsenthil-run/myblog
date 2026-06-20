// js/auth.js
// Handles authentication: register, login, logout, and navbar UI state.
// Token and user info are stored in localStorage.

// Base URL of the backend API
const API_BASE_URL = 'http://localhost:5000/api';

// ---------- Local Storage Helpers ----------

// Save JWT token and user info after successful login/register
function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Retrieve the stored JWT token
function getToken() {
  return localStorage.getItem('token');
}

// Retrieve the stored logged-in user object
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Clear auth data (used on logout)
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Check if a user is currently logged in
function isLoggedIn() {
  return !!getToken();
}

// ---------- Navbar UI State ----------
// Shows Login/Register links if logged out, or Dashboard/Logout if logged in.
function updateNavbar() {
  const navAuthLinks = document.getElementById('navAuthLinks');
  const navUserLinks = document.getElementById('navUserLinks');
  const navUserName = document.getElementById('navUserName');

  if (!navAuthLinks || !navUserLinks) return; // navbar elements not on this page

  if (isLoggedIn()) {
    const user = getUser();
    navAuthLinks.classList.add('hidden');
    navUserLinks.classList.remove('hidden');
    if (navUserName && user) {
      navUserName.textContent = `Hi, ${user.name}`;
    }
  } else {
    navAuthLinks.classList.remove('hidden');
    navUserLinks.classList.add('hidden');
  }
}

// Logs the user out and redirects to homepage
function logoutUser() {
  clearAuth();
  window.location.href = 'index.html';
}

// Toggles the mobile navbar menu
function setupNavToggle() {
  const toggleBtn = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }
}

// Utility: show an alert message box (error or success)
function showAlert(elementId, message, type = 'error') {
  const alertBox = document.getElementById(elementId);
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert show alert-${type}`;
}

// ---------- Page Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  setupNavToggle();

  // Attach logout handler if logout button exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  // ---------- Register Form Handler ----------
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // Save token & redirect to dashboard
        saveAuth(data.token, data.user);
        window.location.href = 'dashboard.html';
      } catch (error) {
        showAlert('authAlert', error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  // ---------- Login Form Handler ----------
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        saveAuth(data.token, data.user);
        window.location.href = 'dashboard.html';
      } catch (error) {
        showAlert('authAlert', error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });
  }

  // ---------- Protect Pages That Require Login ----------
  // Pages with data-protected="true" on <body> redirect to login if not authenticated
  if (document.body.dataset.protected === 'true' && !isLoggedIn()) {
    window.location.href = 'login.html';
  }
});
// js/posts.js
// Handles all blog post related operations:
// fetching all posts, single post, create, edit, delete, and rendering.

// Format an ISO date string into a readable "Month Day, Year, hh:mm AM/PM" format
function formatDate(dateString) {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Create a short excerpt from post content for card previews
function getExcerpt(content, maxLength = 140) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

// Escape HTML to prevent XSS when injecting user content into the DOM
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Fetch All Posts (Homepage) ----------
async function loadAllPosts() {
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  try {
    const response = await fetch(`${API_BASE_URL}/posts`);
    const posts = await response.json();

    if (!response.ok) {
      throw new Error(posts.message || 'Failed to load posts');
    }

    if (posts.length === 0) {
      grid.innerHTML = '<p class="empty-state">No blog posts yet. Be the first to write one!</p>';
      return;
    }

    grid.innerHTML = posts.map(renderPostCard).join('');
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">Error loading posts: ${escapeHTML(error.message)}</p>`;
  }
}

// Render a single post card (used on homepage)
function renderPostCard(post) {
  const authorName = post.author ? escapeHTML(post.author.name) : 'Unknown';
  return `
    <div class="post-card">
      <h3>${escapeHTML(post.title)}</h3>
      <p class="post-excerpt">${escapeHTML(getExcerpt(post.content))}</p>
      <div class="post-meta">
        <span class="author-name">${authorName}</span>
        <span>${formatDate(post.createdAt)}</span>
      </div>
      <a href="post.html?id=${post._id}" class="btn btn-outline btn-sm">Read More</a>
    </div>
  `;
}

// ---------- Fetch Single Post (Post Detail Page) ----------
async function loadSinglePost() {
  const container = document.getElementById('postDetail');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    container.innerHTML = '<p class="empty-state">No post specified.</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
    const post = await response.json();

    if (!response.ok) {
      throw new Error(post.message || 'Post not found');
    }

    const currentUser = getUser();
    const isOwner = currentUser && post.author && currentUser.id === post.author._id;

    container.innerHTML = `
      <h1>${escapeHTML(post.title)}</h1>
      <div class="post-meta">
        <span>By <span class="author-name">${escapeHTML(post.author ? post.author.name : 'Unknown')}</span></span>
        <span>${formatDate(post.createdAt)}</span>
      </div>
      <div class="post-body">${escapeHTML(post.content)}</div>
      ${
        isOwner
          ? `<div class="post-detail-actions">
               <a href="create-post.html?edit=${post._id}" class="btn btn-primary">Edit Post</a>
               <button id="deletePostBtn" class="btn btn-danger" data-id="${post._id}">Delete Post</button>
             </div>`
          : ''
      }
    `;

    // Attach delete handler if owner
    const deleteBtn = document.getElementById('deletePostBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deletePost(postId));
    }

    // Load comments for this post (function defined in comments.js)
    if (typeof loadComments === 'function') {
      loadComments(postId);
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${escapeHTML(error.message)}</p>`;
  }
}

// ---------- Delete Post ----------
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete post');
    }

    alert('Post deleted successfully');
    window.location.href = 'dashboard.html';
  } catch (error) {
    alert(error.message);
  }
}

// ---------- Load User's Own Posts (Dashboard) ----------
async function loadUserPosts() {
  const list = document.getElementById('dashboardList');
  if (!list) return;

  const currentUser = getUser();
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_BASE_URL}/posts`);
    const posts = await response.json();

    if (!response.ok) {
      throw new Error(posts.message || 'Failed to load posts');
    }

    // Filter posts to only those authored by the current logged-in user
    const myPosts = posts.filter((post) => post.author && post.author._id === currentUser.id);

    if (myPosts.length === 0) {
      list.innerHTML = '<p class="empty-state">You haven\'t written any posts yet. Click "New Post" to get started!</p>';
      return;
    }

    list.innerHTML = myPosts.map(renderDashboardItem).join('');

    // Attach delete handlers
    document.querySelectorAll('.dashboard-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deletePost(btn.dataset.id).then(() => loadUserPosts()));
    });
  } catch (error) {
    list.innerHTML = `<p class="empty-state">${escapeHTML(error.message)}</p>`;
  }
}

// Render a single dashboard list item for the user's own post
function renderDashboardItem(post) {
  return `
    <div class="dashboard-post-item">
      <div class="dashboard-post-info">
        <h3>${escapeHTML(post.title)}</h3>
        <span class="post-date">Last updated: ${formatDate(post.updatedAt)}</span>
      </div>
      <div class="dashboard-post-actions">
        <a href="post.html?id=${post._id}" class="btn btn-outline btn-sm">View</a>
        <a href="create-post.html?edit=${post._id}" class="btn btn-primary btn-sm">Edit</a>
        <button class="btn btn-danger btn-sm dashboard-delete-btn" data-id="${post._id}">Delete</button>
      </div>
    </div>
  `;
}

// ---------- Create / Edit Post Form Handler ----------
async function setupPostForm() {
  const form = document.getElementById('postForm');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const formHeading = document.getElementById('formHeading');
  const submitBtn = document.getElementById('postSubmitBtn');

  // If editing, pre-fill the form with existing post data
  if (editId) {
    if (formHeading) formHeading.textContent = 'Edit Post';
    if (submitBtn) submitBtn.textContent = 'Update Post';

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${editId}`);
      const post = await response.json();

      if (!response.ok) {
        throw new Error(post.message || 'Failed to load post');
      }

      titleInput.value = post.title;
      contentInput.value = post.content;
    } catch (error) {
      showAlert('postFormAlert', error.message, 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      showAlert('postFormAlert', 'Please fill in both title and content', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = editId ? 'Updating...' : 'Publishing...';

      const url = editId ? `${API_BASE_URL}/posts/${editId}` : `${API_BASE_URL}/posts`;
      const method = editId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save post');
      }

      // Redirect to the post detail page after success
      window.location.href = `post.html?id=${data._id}`;
    } catch (error) {
      showAlert('postFormAlert', error.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Update Post' : 'Publish Post';
    }
  });
}

// ---------- Initialize Based on Current Page ----------
document.addEventListener('DOMContentLoaded', () => {
  loadAllPosts();
  loadSinglePost();
  loadUserPosts();
  setupPostForm();
});
// js/comments.js
// Handles comment operations: load comments, add comment, delete own comment.

// ---------- Load Comments for a Post ----------
async function loadComments(postId) {
  const commentList = document.getElementById('commentList');
  if (!commentList) return;

  try {
    const response = await fetch(`${API_BASE_URL}/comments/${postId}`);
    const comments = await response.json();

    if (!response.ok) {
      throw new Error(comments.message || 'Failed to load comments');
    }

    renderComments(comments);
  } catch (error) {
    commentList.innerHTML = `<p class="no-comments">${escapeHTML(error.message)}</p>`;
  }
}

// Render the list of comments, with delete button for the comment owner
function renderComments(comments) {
  const commentList = document.getElementById('commentList');
  const currentUser = getUser();

  if (comments.length === 0) {
    commentList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    return;
  }

  commentList.innerHTML = comments
    .map((c) => {
      const isOwner = currentUser && c.user && currentUser.id === c.user._id;
      return `
        <div class="comment-item" data-id="${c._id}">
          <div class="comment-item-header">
            <span class="comment-author">${escapeHTML(c.user ? c.user.name : 'Unknown')}</span>
            <span class="comment-date">${formatDate(c.createdAt)}</span>
          </div>
          <p class="comment-text">${escapeHTML(c.comment)}</p>
          ${
            isOwner
              ? `<button class="comment-delete-btn" data-id="${c._id}">Delete</button>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  // Attach delete handlers to each delete button
  document.querySelectorAll('.comment-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteComment(btn.dataset.id));
  });
}

// ---------- Add a New Comment ----------
function setupCommentForm() {
  const form = document.getElementById('commentForm');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  // If user is not logged in, hide the comment form and show a login prompt
  if (!isLoggedIn()) {
    form.outerHTML = '<p class="no-comments"><a href="login.html">Login</a> to leave a comment.</p>';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const textarea = document.getElementById('commentText');
    const comment = textarea.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!comment) return;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';

      const response = await fetch(`${API_BASE_URL}/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ comment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to post comment');
      }

      textarea.value = '';
      loadComments(postId); // refresh comment list
    } catch (error) {
      alert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Comment';
    }
  });
}

// ---------- Delete a Comment ----------
async function deleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  try {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete comment');
    }

    loadComments(postId); // refresh comment list
  } catch (error) {
    alert(error.message);
  }
}

// ---------- Initialize on Post Detail Page ----------
document.addEventListener('DOMContentLoaded', () => {
  setupCommentForm();
});
