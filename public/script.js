document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createPostForm');
    const modal = document.getElementById('modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const postsContainer = document.querySelector('.posts');

    // Obsługa zamykania modala
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Obsługa formularza (wysyłanie AJAX)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;

        try {
            const response = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });

            if (!response.ok) throw new Error('Failed to create post.');

            const newPost = await response.json();
            addPostToDOM(newPost);

            // Resetowanie formularza i zamknięcie modala
            form.reset();
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Dodawanie nowego posta do DOM
    function addPostToDOM(post) {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <div class="post__header">
                <p class="post__author">Author: ${post.username}</p>
                <p class="post__date">${post.date}</p>
                <h2>${post.title}</h2>
            </div>
            <div class="post__content">
                <p>${post.content}</p>
            </div>
        `;
        postsContainer.prepend(postElement); // Dodanie posta na górę listy
    }
});
