
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
        });
    });
    document.querySelectorAll('.edit-profile').forEach(button => {
        button.addEventListener('click', function () {
            console.log("edit profile")
            const userId = this.dataset.userId;
            console.log(userId)
            const type = this.dataset.type;
            const editElement = document.getElementById(`edit-${userId}`);
            if (!editElement) {
                console.error(`Element edit-${userId} nie istnieje!`);
                return;
            }

            const editForm = document.createElement("div");
            editForm.innerHTML = `
                <input type="${type}" id="edit-form-${userId}" placeholder="Change ${type}" />
                <button class="save-button" data-user-id="${userId}">💾 Zapisz</button>
                <button class="cancel-button" data-user-id="${userId}">❌ Anuluj</button>
            `;

            editElement.replaceWith(editForm);
            document.querySelector(`.save-button[data-user-id="${userId}"]`).addEventListener('click', function () {
                const newContent = document.querySelector(`#edit-form-${userId}`).value.trim();
                fetch(`/users/${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: type, value: newContent })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert("✅ Profil został zaktualizowany!");
                            editForm.replaceWith(editElement);
                            location.reload();
                        } else {
                            alert(`🚨 Błąd: ${data.error}`);
                            
                        }
                    })
                    .catch(error => console.error("❌ Błąd edycji:", error));
            });
            document.querySelector(`.cancel-button[data-user-id="${userId}"]`).addEventListener('click', function () {
                editForm.replaceWith(editElement);
            })
        })
    });






    document.querySelectorAll('.delete-comment').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const commentId = this.dataset.commentId;
            const postId = this.dataset.postId;
            if (!confirm("❌ Czy na pewno chcesz usunąć ten komentarz?")) return;
            fetch(`/comment/${postId}/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("✅ Komentarz został usunięty!");
                        document.getElementById(`comment-${commentId}`).remove();
                    } else {
                        alert(`🚨 Błąd: ${data.error}`);
                    }
                })
                .catch(error => console.error("❌ Błąd usuwania komentarza:", error));
        });
    });


    document.querySelectorAll('.edit-comment').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const commentId = this.dataset.commentId;
            const postId = this.dataset.postId;
            const commentElement = document.getElementById(`comment-text-${commentId}`);
            const currentContent = commentElement.innerText;
            const editForm = document.createElement('div');
            editForm.innerHTML = `
                <textarea id="edit-comment-${commentId}" rows="3">${currentContent}</textarea>
                <button class="save-edit-comment" data-post-id="${postId}" data-comment-id="${commentId}">💾 Zapisz</button>
                <button class="cancel-edit-comment" data-post-id="${postId}" data-comment-id="${commentId}">❌ Anuluj</button>
            `;
            commentElement.replaceWith(editForm);

            document.querySelector(`.save-edit-comment[data-comment-id="${commentId}"]`).addEventListener('click', function () {
                const newContent = document.querySelector(`#edit-comment-${commentId}`).value.trim();
                if (!newContent || newContent === currentContent) return;

                fetch(`/comment/${postId}/${commentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newContent })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert("✅ Komentarz został zaktualizowany!");
                            editForm.replaceWith(commentElement);
                            commentElement.innerText = newContent;
                        } else {
                            alert(`🚨 Błąd: ${data.error}`);
                        }
                    })
                    .catch(error => console.error("❌ Błąd edycji komentarza:", error));
            });

        })
    });




    document.querySelectorAll(".delete-button").forEach(button => {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            const postId = this.dataset.postId;

            if (!confirm("❌ Czy na pewno chcesz usunąć ten post?")) return;

            fetch(`/delete/${postId}`, {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("✅ Post został usunięty!");
                        document.getElementById(`post-${postId}`).remove();
                    } else {
                        alert(`🚨 Błąd: ${data.error}`);
                    }
                })
                .catch(error => console.error("❌ Błąd usuwania posta:", error));
        });
    });

    document.querySelectorAll(".edit-button").forEach(button => {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            const postId = this.dataset.postId;
            const postContentElement = document.querySelector(`#post-content-${postId}`);
            const currentContent = postContentElement.innerText;
            console.log(currentContent)
            const editForm = document.createElement("div");
            editForm.innerHTML = `
                <textarea id="edit-textarea-${postId}" rows="3">${currentContent}</textarea>
                <button class="save-edit-button" data-post-id="${postId}">💾 Zapisz</button>
                <button class="cancel-edit-button" data-post-id="${postId}">❌ Anuluj</button>
            `;

            postContentElement.replaceWith(editForm);

            document.querySelector(`.save-edit-button[data-post-id="${postId}"]`).addEventListener("click", function () {
                const newContent = document.querySelector(`#edit-textarea-${postId}`).value.trim();
                if (!newContent || newContent === currentContent) return;

                fetch(`/edit/${postId}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newContent })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert("✅ Post został zaktualizowany!");
                            editForm.replaceWith(postContentElement);
                            postContentElement.innerText = newContent;
                        } else {
                            alert(`🚨 Błąd: ${data.error}`);
                        }
                    })
                    .catch(error => console.error("❌ Błąd edycji posta:", error));
            });

            document.querySelector(`.cancel-edit-button[data-post-id="${postId}"]`).addEventListener("click", function () {
                editForm.replaceWith(postContentElement);
            });
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
            const data = JSON.parse(message.toString());
            console.log(`Topic: ${topic}, Data:`, data);

            if (topic === 'posts/new') {
                location.reload();
            } else if (topic === 'comments/new') {
                console.log("🆕 New comment received:", data);
                updateCommentCount(data.postId, data.commentCount);
            } else if (topic === 'posts/like') {
                console.log("👍 Like received:", data);
                updateLikeCount(data.postId, data.likes);
            } else if (topic === "posts/delete") {
                console.log("🗑️ Delete received:", data);
                alert("Post został usunięty!");
                location.reload();
            } else if (topic === "posts/update") {
                console.log("✏️ Edit received:", data);
                alert("Post został zaktualizowany!");
                location.reload();
            }
        } catch (error) {
            console.error("❌ Error parsing MQTT message:", error);
        }
    });
    let CURRENT_USER_ID = null;

    fetch("/current-user", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
            if (data.userId) {
                CURRENT_USER_ID = data.userId;
                console.log(`👤 Zalogowany użytkownik: ${CURRENT_USER_ID}`);
                connectWebSocket(CURRENT_USER_ID);
            } else {
                console.error("❌ Brak zalogowanego użytkownika");
            }
        })
        .catch((error) => console.error("⚠️ Błąd:", error));

    function connectWebSocket(userId) {
        const socket = new WebSocket(`ws://localhost:8080/?userId=${userId}`);

        socket.onopen = () => {
            console.log("✅ WebSocket Połączony!");
            socket.send(JSON.stringify({ type: "user_connected", userId }));
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "post_liked") {
                notifyAuthor(message, "liked");
            } else if (message.type === "comment_added") {
                notifyAuthor(message, "commented on");
            } else if (message.type === "followed") {
                console.log("📢 Followed:", message);
                return alert(`📢 ${message.liker} followed You`);
            }
        };

        socket.onclose = () => console.log("❌ WebSocket Rozłączony!");
        socket.onerror = (error) => console.error("⚠️ Błąd WebSocket:", error);
    }

    function notifyAuthor(likeData, action) {
        return alert(`📢 Your post '${likeData.postTitle}' was ${action} by ${likeData.liker}`);
    }

    document.querySelectorAll('.follow-button').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const userId = this.dataset.userId;

            fetch(`/follow/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => response.json())
                .then(data => {
                    document.querySelector(`#follow-${userId}`).innerText = data.followed ? "Unfollow" : "Follow";
                })
                .catch(error => console.error("Error:", error));
        }
        );
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
                    addCommentToDOM(postId, data.comment.id, data.comment.username, data.comment.text);
                    this.querySelector('.comment-text').value = "";
                })
                .catch(error => console.error("Error posting comment:", error));
        });
    });

    function addCommentToDOM(postId, commentId, username, text) {
        const commentSection = document.querySelector(`#comment-list-${postId}`);
        if (commentSection) {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.innerHTML = `<b>${username}</b>:<div id="comment-text-${commentId}">${text} </div>
                                                    <button class="delete-comment" id="delete-comment-${commentId}"
                                                        data-comment-id="${commentId}" data-post-id="${postId}">🗑️</button>
                                                    <button class="edit-comment" id="edit-comment-${commentId}"
                                                        data-comment-id="${commentId}" data-post-id="${postId}">✏️</button>`
            commentSection.appendChild(commentElement);
            document.querySelector(`#delete-comment-${commentId}`).addEventListener('click', function (event) {
                event.preventDefault();
                const commentId = this.dataset.commentId;
                const postId = this.dataset.postId;
                if (!confirm("❌ Czy na pewno chcesz usunąć ten komentarz?")) return;
                fetch(`/comment/${postId}/${commentId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert("✅ Komentarz został usunięty!");
                            document.getElementById(`comment-${commentId}`).remove();
                        } else {
                            alert(`🚨 Błąd: ${data.error}`);
                        }
                    })
                    .catch(error => console.error("❌ Błąd usuwania komentarza:", error));
            }
            );

            document.querySelector(`#edit-comment-${commentId}`).addEventListener('click', function (event) {
                event.preventDefault();
                const commentId = this.dataset.commentId;
                const postId = this.dataset.postId;
                const commentElement = document.getElementById(`comment-text-${commentId}`);
                const currentContent = commentElement.innerText;
                const editForm = document.createElement('div');
                editForm.innerHTML = `
                <textarea id="edit-comment-${commentId}" rows="3">${currentContent}</textarea>
                <button class="save-edit-comment" data-post-id="${postId}" data-comment-id="${commentId}">💾 Zapisz</button>
                <button class="cancel-edit-comment" data-post-id="${postId}" data-comment-id="${commentId}">❌ Anuluj</button>
            `;
                commentElement.replaceWith(editForm);

                document.querySelector(`.save-edit-comment[data-comment-id="${commentId}"]`).addEventListener('click', function () {
                    const newContent = document.querySelector(`#edit-comment-${commentId}`).value.trim();
                    if (!newContent || newContent === currentContent) return;

                    fetch(`/comment/${postId}/${commentId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newContent })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert("✅ Komentarz został zaktualizowany!");
                                editForm.replaceWith(commentElement);
                                commentElement.innerText = newContent;
                            } else {
                                alert(`🚨 Błąd: ${data.error}`);
                            }
                        })
                        .catch(error => console.error("❌ Błąd edycji komentarza:", error));
                });

            });
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
                    document.querySelector(`#like-button-${postId}`).innerText = data.userLiked ? "Unlike" : "Like";
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

