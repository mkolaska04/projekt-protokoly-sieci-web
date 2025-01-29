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
import users from "./users.js"
import posts from "./posts.js"


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
});

mqttClient.on('message', (topic, message) => {
    console.log(`Received message: ${message.toString()} on topic: ${topic}`);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
        console.log(`Received message from WebSocket: ${message}`);
    });

    ws.send(JSON.stringify({ event: "connected", message: "WebSocket is working!" }));
});

app.get('/home', (req, res) => {
    res.render('home', { posts:posts });
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

    const userPosts = posts.filter(post => post.user_id === id);

    res.render('profile', { posts: userPosts });
});



app.get('/create', (req, res) => {
    res.render('home', { modal: true, posts: posts });
})
console.log(new Date().toISOString());




app.post('/create', (req, res) => {
    const { title, content } = req.body;
    const user_id = req.user.id;
    const username = req.user.username;
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

    posts.push(post);
    mqttClient.publish('posts/new', JSON.stringify(post));
    // res.render('/home');
    res.json({ success: true, post: post });
});


app.patch('/home/:id', (req, res) => {
    const post = posts.find((t) => t.id === parseInt(req.params.id));
    if (post) {
        post.content = req.body.content;
        mqttClient.publish('posts/update', JSON.stringify(post));
        res.status(200).json(post);
    } else {
        res.status(404).send('Tweet not found');
    }
});

app.delete('/home/:id', (req, res) => {
    const index = posts.findIndex((t) => t.id === parseInt(req.params.id));
    if (index !== -1) {
        const [deletedTweet] = posts.splice(index, 1);
        mqttClient.publish('posts/delete', JSON.stringify(deletedTweet));
        res.status(200).json(deletedTweet);
    } else {
        res.status(404).send('Tweet not found');
    }
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
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.cookies.username || "guest";

    if (!post.likes) post.likes = new Set();
    if (post.likes.has(userId)) {
        post.likes.delete(userId);
    } else {
        post.likes.add(userId);
    }

    const likeCount = post.likes.size;

    
    const message = JSON.stringify({ event: "postLiked", postId: post.id, likes: likeCount });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    res.json({ likes: likeCount, userLiked: post.likes.has(userId) });
});


app.get('/comments/:id', (req, res) => {
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
        text: req.body.comment
    };

    post.comments.push(newComment);
    console.log('New comment added:', newComment);
    console.log('Updated comments list:', post.comments);

    const message = JSON.stringify({
        event: "newComment",
        postId: post.id,
        comment: newComment,
        commentCount: post.comments.length 
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    res.json({ comment: newComment, commentCount: post.comments.length }); 
});





app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email && u.password === password);
    if (user) {
        res.cookie('username', user.username, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.cookie("user_id", user.id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.redirect('/home'); 
    } else {
        res.status(401).send('Invalid credentials'); 
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signup', (req, res) => {
    const { username, email, password, password2 } = req.body;
    if (password !== password2) {
        return res.render('signup', { error: 'Passwords do not match' });
    }
    if (users.find((u) => u.email === email)) {
        return res.render('signup', { error: 'User with this email already exists' });
    } else {
        const user = {
            id: v4(),
            username,
            email,
            password,
        };
        users.push(user);
        res.cookie('username', user.username, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.cookie("user_id", user.id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
        res.redirect('/home');
    }
});

app.get('/', (req, res) => {
    res.render('login');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})
