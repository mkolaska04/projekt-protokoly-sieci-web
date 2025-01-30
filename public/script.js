document.addEventListener('DOMContentLoaded', () => {
    const postModal = document.getElementById('post-modal');
    const openPostModalBtn = document.getElementById('open-post-modal');
    const closePostModalBtn = document.getElementById('close-post-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const postForm = document.getElementById('post-form');

    document.querySelectorAll('.open-comment-modal').forEach(button => {
        button.addEventListener('click', function () {
            const postId = this.dataset.postId;
            const commentModal = document.getElementById(`comment-modal-${postId}`);
            const modalOverlay = document.getElementById('modal-overlay');

            if (commentModal) {
                commentModal.style.display = "block";
                modalOverlay.style.display = "block";
            } else {
                console.error(`Modal for post ${postId} not found`);
            }
        });
    });

    document.querySelectorAll('.close-btn').forEach(button => {
        button.addEventListener('click', function () {
            this.closest('.modal').style.display = "none";
            document.getElementById('modal-overlay').style.display = "none";
            // location.reload();
        });
    });

    document.querySelectorAll('delete-button').forEach(form => {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const postId = this.dataset.postId;
            fetch(`/delete/${postId}`, {
                method: 'DELETE',   
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id:postId })
            })
                .then(response => response.json())
                .then(data => {
                    location.reload();
                })
                .catch(error => console.error("Error deleting post:", error));
        });
    });
    if (openPostModalBtn) {
        openPostModalBtn.addEventListener('click', () => {
            postModal.style.display = "block";
            modalOverlay.style.display = "block";
        });
    }
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', () => {
            postModal.style.display = "none";
            modalOverlay.style.display = "none";
        });
    }
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();

            if (!title || !content) return;

            try {
                const response = await fetch('/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content }),
                });
                postForm.reset();
                postModal.style.display = "none";
                modalOverlay.style.display = "none";
            } catch (error) {
                console.error("Error posting:", error);
            }
        });
    }


    let mqttClient = mqtt.connect('wss://test.mosquitto.org:8081');

    mqttClient.on('connect', () => {
        console.log("✅ Connected to MQTT Broker.");

        mqttClient.subscribe(['posts/new', 'comments/new'], (err) => {
            if (err) console.error("❌ Error subscribing to MQTT:", err);
            else console.log("📡 Subscribed to topics: 'posts/new', 'comments/new'");
        });
    });

    mqttClient.on('message', (topic, message) => {
        console.log("📩 MQTT received:", topic, message.toString());

        try {
            const data = JSON.parse(message.toString()); // ✅ Parsowanie JSON
            console.log(`Topic: ${topic}, Data:`, data);

            if (topic === 'posts/new') {
                location.reload();
            } else if (topic === 'comments/new') {
                console.log("🆕 New comment received:", data);
                // addCommentToDOM(data.postId, data.username, data.text);
                updateCommentCount(data.postId, data.commentCount);
            } else if (topic === 'posts/like') {
                console.log("👍 Like received:", data);
                updateLikeCount(data.postId, data.likes);
            }
        } catch (error) {
            console.error("❌ Error parsing MQTT message:", error);
        }
    });



    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const postId = this.dataset.postId;
            const commentText = this.querySelector('.comment-text').value.trim();

            if (!commentText) return;

            fetch(`/comment/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: commentText })
            })
                .then(response => response.json())
                .then(data => {
                    addCommentToDOM(postId, data.comment.username, data.comment.text);
                    this.querySelector('.comment-text').value = "";
                })
                .catch(error => console.error("Error posting comment:", error));
        });
    });

    function addCommentToDOM(postId, username, text) {
        const commentSection = document.querySelector(`#comment-list-${postId}`);
        if (commentSection) {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.innerHTML = `<b>${username}:</b> ${text}`;
            commentSection.appendChild(commentElement);
        }
    }

    function updateCommentCount(postId, count) {
        const commentCountElement = document.querySelector(`#comment-count-${postId}`);
        if (commentCountElement) {
            commentCountElement.innerText = count
        }
    }

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

    function updateLikeCount(postId, count) {
        const likeCountElement = document.querySelector(`#like-count-${postId}`);
        if (likeCountElement) {
            likeCountElement.innerText = count;
        }
    }

});

