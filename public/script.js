// import mqtt from 'mqtt';
document.addEventListener('DOMContentLoaded', () => {

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

    document.querySelectorAll('.open-comment-modal').forEach(button => {
        button.addEventListener('click', function () {
            const postId = this.dataset.postId;
            document.getElementById(`comment-modal-${postId}`).style.display = "block";
        });
    });

    document.querySelectorAll('.close-btn').forEach(button => {
        button.addEventListener('click', function () {
            this.closest('.modal').style.display = "none";
        });
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
            const commentElement = document.createElement("p");
            commentElement.innerHTML = `<b>${username}:</b> ${text}`;
            commentSection.appendChild(commentElement);
        }
    }

    const ws = new WebSocket("ws://localhost:3000");

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket Message:", data);

        if (data.event === "postLiked") {
            document.querySelector(`#like-count-${data.postId}`).innerText = data.likes;
        }

        if (data.event === "newComment") {
            addCommentToDOM(data.postId, data.comment.username, data.comment.text);
        }
    };

    const postModal = document.getElementById('post-modal');
    const openPostModalBtn = document.getElementById('open-post-modal');
    const closePostModalBtn = document.getElementById('close-post-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const postForm = document.getElementById('post-form');
    const postsContainer = document.querySelector('.posts');

    postModal.style.display = "none";
    modalOverlay.style.display = "none";

    openPostModalBtn.addEventListener('click', () => {
        postModal.style.display = "block";
        modalOverlay.style.display = "block";
    });

    closePostModalBtn.addEventListener('click', () => {
        postModal.style.display = "none";
        modalOverlay.style.display = "none";
    });
    
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

            const data = await response.json();
            addPostToDOM(data.post);
            postForm.reset();
            postModal.style.display = "none";
            modalOverlay.style.display = "none";
        } catch (error) {
            console.error("Error posting:", error);
        }
    });

  const mqttClient = mqtt.connect('wss://test.mosquitto.org:8081', { reconnectPeriod: 1000 });

  mqttClient.on('connect', () => {
      console.log("✅ Connected to MQTT Broker.");
      mqttClient.subscribe('posts/new', (err) => {
          if (err) console.error("❌ Error subscribing to MQTT:", err);
          else console.log("📡 Subscribed to 'posts/new'");
      });
  });

  mqttClient.on('message', (topic, message) => {
      console.log("📩 MQTT received:", topic, message.toString());

      if (topic === 'posts/new') {
          const newPost = JSON.parse(message.toString());
          location.reload();
      }
    
  });


});
