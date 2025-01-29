document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createPostForm');
    const modal = document.getElementById('modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const postsContainer = document.querySelector('.posts');

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

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

            
            form.reset();
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error:', error);
        }
    });

 
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
        postsContainer.prepend(postElement); 
    }
});
document.querySelectorAll('.like-button').forEach(button => {
    button.addEventListener('click', function (event) {
        event.preventDefault(); 

        const postId = this.dataset.postId; 

        fetch(`/like/${postId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            document.querySelector(`#like-count-${postId}`).innerText = data.likes;
            this.classList.toggle("liked", data.userLiked); 
        })
        .catch(error => console.error("Error:", error));
    });
});


const socket = io();
socket.on("postLiked", data => {
    const likeCountElement = document.querySelector(`#like-count-${data.postId}`);
    if (likeCountElement) {
        likeCountElement.innerText = data.likes;
    }
});

    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const postId = this.dataset.postId;
            const commentText = this.querySelector('.comment-input').value.trim();

            if (!commentText) return;

            fetch(`/comment/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: commentText })
            })
            .then(response => response.json())
            .then(data => {
                addCommentToDOM(postId, data.username, data.text);
            });

            this.querySelector('.comment-input').value = ""; 
        });
    });

    function addCommentToDOM(postId, username, text) {
        const commentSection = document.querySelector(`#comments-${postId}`);
        const commentElement = document.createElement("p");
        commentElement.innerHTML = `<b>${username}:</b> ${text}`;
        commentSection.appendChild(commentElement);
    }

   
    socket.on("newComment", data => {
        addCommentToDOM(data.postId, data.comment.username, data.comment.text);
    });


    const ws = new WebSocket("ws://localhost:3000"); 

    ws.onopen = () => {
        console.log("WebSocket connected!");
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WS Message:", data);

        if (data.event === "postLiked") {
            updateLikeCount(data.postId, data.likes);
        }

        if (data.event === "newComment") {
            addCommentToDOM(data.postId, data.comment.username, data.comment.text);
        }
    };

    function updateLikeCount(postId, likes) {
        const likeCountElement = document.querySelector(`#like-count-${postId}`);
        if (likeCountElement) {
            likeCountElement.innerText = likes;
        }
    }

    function addCommentToDOM(postId, username, text) {
        const commentSection = document.querySelector(`#comments-${postId}`);
        if (commentSection) {
            const commentElement = document.createElement("p");
            commentElement.innerHTML = `<b>${username}:</b> ${text}`;
            commentSection.appendChild(commentElement);
        }
    }
