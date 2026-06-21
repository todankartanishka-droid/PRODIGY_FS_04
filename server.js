const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const fs = require("fs");
const multer = require("multer");

const jwt = require("jsonwebtoken");

const SECRET_KEY = "chatapp_secret_key";

const upload = multer({
    dest:"uploads/"
});

const app = express();

const server = http.createServer(app);

const io = new Server(server);


// Middleware

app.use(express.json());

app.use(express.static("public"));

app.use(
"/uploads",
express.static("uploads")
);


// Connected users storage

let users = {};

let userStatus = {};


// Chat history

let chatHistory = {};


// REGISTER USER

app.post("/register", async(req,res)=>{

const {username,password}=req.body;

if(!username || !password){

return res.json({

message:"All fields required"

});

}

let userList=[];

if(fs.existsSync("users.json")){

userList=JSON.parse(

fs.readFileSync("users.json")

);


}

let existingUser =
userList.find(
u=>u.username===username
);

if(existingUser){

return res.json({

message:"User already exists"

});


}

let hashedPassword =
await bcrypt.hash(password,10);

userList.push({

username:username,

password:hashedPassword

});

fs.writeFileSync(

"users.json",

JSON.stringify(userList,null,2)

);

res.json({

message:"Account created successfully"

});

});

app.post(
"/upload",
upload.single("file"),
(req,res)=>{


const fileName = req.file.filename;


// get uploader details

const room = req.body.room;

const shareType = req.body.shareType;

const username = req.body.username;


const fileData = {

file:fileName,

username:username,

time:new Date().toLocaleTimeString()

};


// Current Room

if(shareType==="room"){

io.to(room).emit(
"fileShared",
fileData
);

}


// All Connected Users

else if(shareType==="all"){

io.emit(
"fileShared",
fileData
);

}



res.json({

message:"File uploaded",

file:fileName

});


});


// LOGIN USER

app.post("/login",async(req,res)=>{

const {username,password}=req.body;

let userList=[];

if(fs.existsSync("users.json")){

userList=JSON.parse(

fs.readFileSync("users.json")

);

}

const user =
userList.find(

u=>u.username===username

);

if(!user){

return res.json({

message:"User not found"

});

}

const match =
await bcrypt.compare(

password,

user.password

);

if(!match){

return res.json({

message:"Wrong password"

});

}

const token = jwt.sign(
{
username:user.username
},
SECRET_KEY,
{
expiresIn:"1h"
}
);


res.json({

message:"Login successful",

username:user.username,

token:token

});

}); 


// SOCKET CONNECTION

io.on("connection",(socket)=>{

console.log("User connected");


// JOIN ROOM

socket.on("joinRoom",(data)=>{

const username=data.username;

const room=data.room;


// Store user socket information

users[socket.id]={

username:username,

room:room,

socketId:socket.id

};

userStatus[username] = {
    status:"online",
    socketId:socket.id
};

socket.join(room);

if(!chatHistory[room]){

chatHistory[room]=[];

}


// Send old messages

socket.emit(

"oldMessages",

chatHistory[room]

);


// Notify room

io.to(room).emit(

"chatMessage",

{

username:"System",

message:

`${username} joined ${room}`,

time:new Date().toLocaleTimeString()

}

);


// Online users

io.emit(

"userCount",

Object.keys(users).length

);


// Send online users list for private chat

io.emit(
"userStatus",
userStatus
);

});


// PUBLIC MESSAGE

socket.on("chatMessage",(data)=>{

const user =
users[socket.id];

if(!user)
return;

const messageData={

username:user.username,

message:data.message,

time:new Date().toLocaleTimeString()

};

chatHistory[user.room].push(

messageData

);

io.to(user.room).emit(

"chatMessage",

messageData

);

});


// PRIVATE MESSAGE

socket.on("privateMessage",(data)=>{

const receiver = userStatus[data.receiver];


if(receiver && receiver.socketId){

io.to(receiver.socketId).emit(
"privateMessage",
{
sender:data.sender,
message:data.message,
time:new Date().toLocaleTimeString()
}
);

}

});


// TYPING INDICATOR

socket.on("typing",()=>{

const user =
users[socket.id];

if(user){

socket.to(user.room).emit(

"typing",

`${user.username} is typing...`

);

}

});


// DISCONNECT

socket.on("disconnect",()=>{

const user =
users[socket.id];

if(user){

io.to(user.room).emit(

"chatMessage",

{

username:"System",

message:

`${user.username} left chat`,

time:new Date().toLocaleTimeString()

}

);

userStatus[user.username] = {
    status:"offline"
};

delete users[socket.id];

io.emit(

"userCount",

Object.keys(users).length

);


// update private chat user list

io.emit(
"userStatus",
userStatus
);

}

});

});

server.listen(5000,()=>{

console.log(

"Server running on http://localhost:5000"

);

});