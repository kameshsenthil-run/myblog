document.addEventListener("DOMContentLoaded", () => {
  const postsGrid = document.getElementById("postsGrid");

  const posts = [
    {
      title: "Welcome to BlogSphere",
      content: "This is my first blog post hosted on GitHub Pages."
    },
    {
      title: "Learning Web Development",
      content: "HTML, CSS and JavaScript are the foundation of modern websites."
    },
    {
      title: "My Blog Project",
      content: "I built this website using GitHub Pages and deployed it online."
    }
  ];

  postsGrid.innerHTML = "";

  posts.forEach(post => {
    postsGrid.innerHTML += `
      <div class="post-card">
        <h3>${post.title}</h3>
        <p>${post.content}</p>
      </div>
    `;
  });
});
