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


console.log(v4());
console.log(v4());

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = 3000
const app = express()


let tweets = []

let users = [
    {   id:"02fdae9c-9178-460c-bf9e-0c4e6a5b6253",
        username: 'admin',
        email: "admin@gmail.com",
        password: 'adminadmin123'
    },
    {   id:"687bc087-3fe8-4a1c-8b34-2e790b1685ff",
        username: 'user1',
        email: "user1@wp.pl",
        password: 'user123'
    },
    ]
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

    ws.send('Welcome to the WebSocket server!');
});

app.get('/home', (req, res) => {
    res.render('home', { posts:tweets });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/explore', (req, res) => {
    res.render('explore');
});


app.get('/logout', (req, res) => {
    res.clearCookie('username'); 
    res.locals.isLoggedIn = false;
    res.redirect('/login'); 
});


app.get('/profile/:id', (req, res) => {
    const { id } = req.params;

    const userPosts = tweets.filter(post => post.user_id === id);

    res.render('profile', { posts: userPosts });
});



app.get('/create', (req, res) => {
    res.render('home', { modal: true, posts: tweets });
})
console.log(new Date().toISOString());

app.post('/create', (req, res) => {
    const { title, content } = req.body;
    const user_id = req.user.id;
    const username = req.user.username;
    const id = v4();
    const date = new Date().toISOString().split('T').join(' ').split('.')[0];

    const tweet = {
        id,
        user_id,
        username,
        title,
        content,
        date,
        comments: [],
        likes: 0,
    };

    tweets.push(tweet);
    mqttClient.publish('tweets/new', JSON.stringify(tweet));
    res.redirect('/home');
});


app.patch('/home/:id', (req, res) => {
    const tweet = tweets.find((t) => t.id === parseInt(req.params.id));
    if (tweet) {
        tweet.content = req.body.content;
        mqttClient.publish('tweets/update', JSON.stringify(tweet));
        res.status(200).json(tweet);
    } else {
        res.status(404).send('Tweet not found');
    }
});

app.delete('/home/:id', (req, res) => {
    const index = tweets.findIndex((t) => t.id === parseInt(req.params.id));
    if (index !== -1) {
        const [deletedTweet] = tweets.splice(index, 1);
        mqttClient.publish('tweets/delete', JSON.stringify(deletedTweet));
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
