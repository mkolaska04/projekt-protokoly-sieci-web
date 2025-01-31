import express from "express"
import { dirname } from "path"
import { fileURLToPath } from "url"
import mqtt from "mqtt"
import http from "http"
import WebSocket from "ws"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import { v4 } from "uuid"
import path from "path"
import users from "./data/users.js"
import posts from "./data/posts.js"
import cookie from "cookie"
import bcrypt from "bcryptjs";

let clients = new Map();
const __dirname = dirname(fileURLToPath(import.meta.url))
const port = 3000
const app = express()

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    res.locals.isLoggedIn = false;
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authenticateUser);


const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');
mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');

    mqttClient.subscribe(['posts/new', 'posts/update', 'posts/delete', 'posts/like', 'comments/new'], (err) => {
        if (err) {
            console.error('Error subscribing to topics', err);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    console.log(`Received message: ${message.toString()} on topic: ${topic}`);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });



wss.on("connection", (ws, req) => {
    console.log("🔌 Nowe połączenie WebSocket!");

    if (!req.headers.cookie) {
        console.log("❌ Brak ciasteczek! Połączenie zamknięte.");
        ws.close();
        return;
    }

    const cookies = cookie.parse(req.headers.cookie);
    const userId = cookies.user_id;

    if (!userId) {
        console.log("❌ Brak `user_id` w cookies! Połączenie zamknięte.");
        ws.close();
        return;
    }

    console.log(`✅ WebSocket połączony dla użytkownika ${userId}`);
    clients.set(userId, ws);
    console.log("🟢 Aktualnie podłączeni użytkownicy:", [...clients.keys()]);

    ws.on("close", () => {
        clients.delete(userId);
        console.log(`❌ WebSocket zamknięty dla użytkownika ${userId}`);
    });
});

app.get("/current-user", (req, res) => {
    if (!req.cookies.user_id) {
        return res.status(401).json({ error: "User not logged in" });
    }
    res.json({ userId: req.cookies.user_id });
});

server.listen(8080, () => {
    console.log(`Server running at http://localhost:8080}`);
}
)

app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
})

app.patch('/users/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { type, value } = req.body; 
    if (type === "password") {
        user.password = bcrypt.hashSync(value, 10);
    } else {
        user[type] = value;
        if (type === "username") {
            res.cookie('username', value, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        }
    }
    res.status(200).json({ success: true, message: "User updated", user });
})
app.get('/home', (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.render('home', { posts: posts });
});

app.get('/all', (req, res) => {
    res.render('home', { posts: posts });
}
)

app.get('/following', (req, res) => {
    const user_id = req.user.id;
    const followedusers = users.filter(user => user.followed.includes(user_id));
    const followedPosts = followedusers.flatMap(user => user.posts)
   
    return res.render('home', { posts: followedPosts });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/explore', (req, res) => {
    const pattern = req.query.search ? req.query.search.toLowerCase() : "";
    const results = pattern ? users.filter(u => u.username.toLowerCase().includes(pattern)) : [];

    console.log('Search results:', results);

    res.render('explore', { results, searchQuery: req.query.search || "" });
});


app.get('/logout', (req, res) => {
    res.clearCookie('username');
    res.locals.isLoggedIn = false;
    res.redirect('/login');
});


app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    const userPosts = posts.filter(post => post.user_id === id);

    res.render('profile', { posts: userPosts, user: user });
});

app.post('/follow/:id', (req, res) => {
    const follower_id = req.user.id;
    const follower = users.find(u => u.id === follower_id);
    const { id } = req.params;
    const user = users.find(u => u.id === id);

    if (!user) return res.status(404).send('User not found');
    if (user.followed.some(x => x===follower_id)) {
        user.followed = user.followed.filter(f => f !== follower_id);
        console.log(`🚫 Użytkownik ${follower_id} przestał obserwować użytkownika ${id}`);
        res.json({ success: true, followed: false });
    } else {
        user.followed.push(follower_id);
        const authorWs = clients.get(id);
        if (authorWs && authorWs.readyState === WebSocket.OPEN) {
            console.log(`📡 Wysyłanie powiadomienia do autora ${id}`);
            authorWs.send(JSON.stringify({
                type: "followed",
                liker: follower.username,
            }));
        } else {
            console.log(`🚨 Autor ${id} NIE jest online!`);
        }
        res.json({ success: true, followed: true });
    }
});



app.get('/create', (req, res) => {
    res.render('home', { modal: true, posts: posts });
})
console.log(new Date().toISOString());




app.post('/create', (req, res) => {
    const { title, content } = req.body;
    const user_id = req.user.id;
    const username = req.user.username;
    const user = users.find(u => u.id === user_id);
    const id = v4();
    const date = new Date().toISOString().split('T').join(' ').split('.')[0];

    const post = {
        id,
        user_id,
        username,
        title,
        content,
        date,
        comments: [],
        likes: new Set()
    };
    user.posts.push(post);
    posts.push(post);
    mqttClient.publish('posts/new', JSON.stringify(post));

    res.json({ success: true, post: post });
});



app.patch("/edit/:id", (req, res) => {
    const postId = req.params.id;
    const userId = req.cookies.user_id;
    const { content } = req.body;

    const post = posts.find((p) => p.id === postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.user_id !== userId) {
        return res.status(403).json({ error: "Nie masz uprawnień do edytowania tego posta!" });
    }

    post.content = content;
    
    mqttClient.publish("posts/update", JSON.stringify(post));
    return res.status(200).json({ success: true, message: "Post zaktualizowany!", post });
});

app.delete("/delete/:id", (req, res) => {
    const postId = req.params.id;
    const userId = req.cookies.user_id;
    const user = users.find((u) => u.id === userId);

    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) return res.status(404).json({ error: "Post not found" });

    if (posts[index].user_id !== userId) {
        return res.status(403).json({ error: "Nie masz uprawnień do usunięcia tego posta!" });
    }
    user.posts = user.posts.filter((p) => p.id !== postId);
    const deletedPost = posts.splice(index, 1);
    mqttClient.publish("posts/delete", JSON.stringify(deletedPost));
    return res.status(200).json({ success: true, message: "Post usunięty!" });
});


function authenticateUser(req, res, next) {
    const username = req.cookies.username;
    if (username) {
        const user = users.find((u) => u.username === username);
        if (user) {
            req.user = user;
            res.locals.isLoggedIn = true;
            res.locals.username = user.username;
            res.locals.user_id = user.id;
            console.log('User is logged in:', username);
            console.log('isLoggedIn in middleware:', res.locals.isLoggedIn);
            return next();
        }
    }
    res.locals.isLoggedIn = false;
    next();
}

app.post('/like/:id', (req, res) => {
    const postId = req.params.id;
    const post = posts.find(p => p.id === postId);
    if (res.headersSent) return;
    if (!post) {
        return res.status(404).json({ error: "Post not found" });
    }

    if (!post.likes) post.likes = new Set();

    const userId = req.user.id;

    if (post.likes.has(userId)) {
        post.likes.delete(userId);
    } else {
        post.likes.add(userId);
    }
    const likeCount = post.likes.size;

    mqttClient.publish('posts/like', JSON.stringify({ postId, likes: likeCount }));
    const liker = users.find((u) => u.id === userId)?.username || "Unknown";

    console.log(`👍 Post '${post.title}' polubiony przez ${liker}`);
    const authorWs = clients.get(post.user_id);

    if (authorWs && authorWs.readyState === WebSocket.OPEN) {
        console.log(`📡 Wysyłanie powiadomienia do autora ${post.user_id}`);
        authorWs.send(JSON.stringify({
            type: "post_liked",
            postTitle: post.title,
            liker: liker,
        }));
    } else {
        console.log(`🚨 Autor ${post.user_id} NIE jest online!`);
    }
    return res.json({ success: true, likes: likeCount, userLiked: post.likes.has(userId) });
});



app.get('/comment/:id', (req, res) => {
    const post = posts.find(t => t.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post.comments);
});




app.post('/comment/:id', (req, res) => {
    const post = posts.find(t => t.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const newComment = {
        id: v4(),
        user_id: req.user.id,
        username: req.user.username,
        text: req.body.comment,

    };

    post.comments.push(newComment);
 

    const message = JSON.stringify({
        event: "newComment",
        postId: post.id,
        comment: newComment,
        commentCount: post.comments.length
    });

    mqttClient.publish('comments/new', message);
    const userId = req.user.id;
    const liker = users.find((u) => u.id === userId)?.username || "Unknown";

    console.log(`👍 Post '${post.title}' polubiony przez ${liker}`);
    const authorWs = clients.get(post.user_id);

    if (authorWs && authorWs.readyState === WebSocket.OPEN) {
        console.log(`📡 Wysyłanie powiadomienia do autora ${post.user_id}`);
        authorWs.send(JSON.stringify({
            type: "comment_added",
            postTitle: post.title,
            liker: liker,
        }));
    } else {
        console.log(`🚨 Autor ${post.user_id} NIE jest online!`);
    }


    res.json({ comment: newComment, commentCount: post.comments.length });
});

app.delete('/comment/:id/:commentId', (req, res) => {
    const post = posts.find(t => t.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const commentId = req.params.commentId;
    const commentIndex = post.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return res.status(404).json({ error: "Comment not found" });

    post.comments.splice(commentIndex, 1);
    res.json({ success: true, message: "Comment deleted" });
}
)

app.patch('/comment/:id/:commentId', (req, res) => {
    const post = posts.find(t => t.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const commentId = req.params.commentId;
    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.text = req.body.comment;
    res.json({ success: true, message: "Comment updated" });
})
    

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) {
        return res.render('login', { error: 'There is no account linked to this email' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.render('login', { error: 'Incorrect password' });
    }

    res.cookie("user_id", user.id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
    res.cookie('username', user.username, {httpOnly: true, maxAge: 1000 * 60 * 60 * 24, secure:false, sameSite:'Lax'});
    res.redirect('/home');
});

app.get('/signup', async (req, res) => {
    const haslo = await bcrypt.hash("user123", 10);
    console.log(haslo);
    res.render('signup');
})

app.post('/signup', async (req, res) => {
    const { username, email, password, password2 } = req.body;
    if (password !== password2) {
        return res.render('signup', { error: 'Passwords do not match' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    if (users.find((u) => u.email === email)) {
        return res.render('signup', { error: 'User with this email already exists' });
    } else {
        const user = {
            id: v4(),
            username,
            email,
            password:hashedPassword,
            followed: []

        };
        users.push(user);
        res.cookie('username', user.username, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.cookie("user_id", user.id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.redirect('/home');
    }
});

app.get('/', (req, res) => {
    if (req.cookies.username) {
        res.redirect('/home');
    }
    res.redirect('/login');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})
