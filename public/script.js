const socket=io();

if(!localStorage.getItem("username")){

window.location.href="login.html";

}


document.getElementById("currentUser").innerText =
"Welcome " + localStorage.getItem("username");

// Ask notification permission

Notification.requestPermission();

let joined=false;



function joinRoom(){


const username =
localStorage.getItem("username");


const room=
document.getElementById("room").value;



if(!username || !room){

alert(
"Enter username and room"
);

return;

}



socket.emit(
"joinRoom",
{
username,
room
}
);


joined=true;


}





function sendMessage(){



if(!joined){

alert(
"Join room first"
);

return;

}



const message=
document.getElementById("message").value;



if(!message)
return;



socket.emit(
"chatMessage",
{
message
}
);



document.getElementById("message").value="";


}




socket.on(
"chatMessage",
(data)=>{


const box=
document.getElementById("messages");



box.innerHTML+=`

<p>

<b>${data.username}</b>

(${data.time})

:

${data.message}

</p>

`;



box.scrollTop=
box.scrollHeight;


});






socket.on(
"oldMessages",
(messages)=>{


messages.forEach(msg=>{


const box=
document.getElementById("messages");


box.innerHTML+=`

<p>

<b>${msg.username}</b>

:

${msg.message}

</p>


`;

});


});






document
.getElementById("message")
.addEventListener(
"input",
()=>{


socket.emit("typing");


});







socket.on(
"typing",
(data)=>{


document
.getElementById("typing")
.innerText=data;



setTimeout(()=>{


document
.getElementById("typing")
.innerText="";


},2000);


});





socket.on(
"userCount",
(count)=>{


document
.getElementById("userCount")
.innerText=
"Online Users: "+count;



});

// PRIVATE MESSAGE RECEIVE

socket.on(
"privateMessage",
(data)=>{


const box =
document.getElementById("messages");



box.innerHTML += `

<p>

<b>Private from ${data.sender}</b>

(${data.time})

:

${data.message}

</p>

`;



// Browser notification

if(Notification.permission==="granted"){


new Notification(

"New message from " + data.sender,

{

body:data.message

}

);


}



});

async function uploadFile(){


const file =
document.getElementById("fileInput").files[0];


if(!file){

alert("Select a file first");

return;

}


const room =
document.getElementById("room").value;

const shareType =
document.querySelector(
'input[name="shareType"]:checked'
).value;


if(!room){

alert("Join room first");

return;

}


let formData =
new FormData();


formData.append(
"file",
file
);


formData.append(
"room",
room
);


formData.append(
"username",
localStorage.getItem("username")
);

formData.append(
"shareType",
shareType
);

const response =
await fetch(
"/upload",
{
method:"POST",
body:formData
}
);



const data =
await response.json();



alert(
"File uploaded: "
+
data.file
);


}

function logout(){

localStorage.removeItem("username");

window.location.href="login.html";

}


// FILE SHARING DISPLAY

socket.on(
"fileShared",
(data)=>{


const box =
document.getElementById("messages");


box.innerHTML += `

<p>

<b>📁 File Shared</b>

<br>

${data.username} shared:

<a href="/uploads/${data.file}" target="_blank">

${data.file}

</a>

<br>

Time:
${data.time}

</p>

`;


box.scrollTop =
box.scrollHeight;


});

let onlineUsers = {};

socket.on("userStatus",(data)=>{

const list =
document.getElementById("userList");


list.innerHTML="";


Object.keys(data).forEach(username=>{


let status =
data[username].status;


if(username !== localStorage.getItem("username")){


list.innerHTML += `

<option value="${username}">

${status==="online" ? "🟢" : "⚪"} 
${username}
(${status})

</option>

`;

}


});


});



function sendPrivateMessage(){


const receiver =
document.getElementById("userList").value;


const message =
document.getElementById("privateMessage").value;


if(!receiver || !message){

alert("Select user and enter message");

return;

}


socket.emit(
"privateMessage",
{

receiver:receiver,

sender:localStorage.getItem("username"),

message:message

}

);


document.getElementById("privateMessage").value="";

}

function previewImage(){

const file =
document.getElementById("fileInput").files[0];


if(file){

const image =
document.getElementById("preview");


image.src =
URL.createObjectURL(file);

}

}