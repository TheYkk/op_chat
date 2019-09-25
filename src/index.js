/**  Copyright (C) TheYkk - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Kaan Karakaya <yusufkaan142@gmail.com>,  2019
*/

var fs = require('fs');

// ? .ENV file to process.env 
var dotenv = require('dotenv');
require('dotenv').config()

// ? Logger
const logger = require('pino')({level: process.env.LOG_LEVEL})

// ? Http(s) server
var express = require('express')();

// ? If ssl enabled import certificates
var httpdOptions = (process.env.PROTOCOL_TYPE === 'http') ? {} : {
        key: fs.readFileSync(process.env.SSL_KEY, 'utf8'),
        cert: fs.readFileSync(process.env.SSL_CRT, 'utf8')
    };

// ? Create server with Http(s)    
httpd = require(process.env.PROTOCOL_TYPE).createServer(httpdOptions, express);

// ? Init socket.io with Http(s) server
io = require('socket.io')(httpd);

// ? Route index of server
express.get('/', function(req, res) {
    res.header("X-powered-by","TheYkk");
    res.send('ok');
});

// ? Listen PORT
httpd.listen(process.env.SSL_PORT);

// ? Mongodb ORM import
const mongoose = require('mongoose');


// ? connect to Mongo daemon
mongoose.connect(process.env.MONGO,{ useNewUrlParser: true,useUnifiedTopology: true })
    .then(() => logger.info('MongoDB Connected'))
    .catch(err => logger.fatal(err));

// ? Mongoose Schema
const  chatSchema  =  new mongoose.Schema(
    {        
        msgFrom : {type: String, default :"", required: true},
        msgTo : {type: String, default :"", required: true},
        msg : {type: String, default : "", required: true}
    },
    {
        timestamps: true
    });

let  Chat  =  mongoose.model("Chat", chatSchema);

// ? Info for start
logger.info('Started to run at => ' + new Date());

// ? JWT for authentication
var jwt = require('socketio-jwt');
io.use(jwt.authorize({
    secret: process.env.JWT_SECRET,
    handshake: true
}));

// ? Users object
var users = {};

// ? Socket id to user id
function getID(id) {
    let uid = null;
    Object.keys(users).forEach(function(key) {
        if(users[key].socket == id) {
            uid = key;
        }
    });

    return uid;
}

// ? On client connect
io.on('connect', function(socket) {
    let user;
    const ID = socket.id;

    logger.trace('New connection : Socket.id =' + ID);

    user = socket.decoded_token;

    users[user.userid] = { socket: ID };
    
    // ? On Client close the connection
    socket.on('disconnect', () => {
        logger.info('Client disconnected : ',{socketID:ID,userID:getID(ID)})
        // ? Delete user from global object
        delete users[getID(ID)];
    });
    
    
    // ? On client send message
    socket.on('message',(m) =>{
        /**
         ** msgFrom
         ** msgTo
         ** msg
         * 
         */    

        // ? Save to mongodb
        const mes = new Chat(m);
        mes.save().then(() => logger.trace('Message added : ',m));

        // ? Send message to client 
        socket.emit("message", m);

        // ? If user active send message with socket emit
        if(users[m.msgTo] !== undefined ){
            io.to(users[m.msgTo].socket).emit("message", m);
            logger.trace(`Message send from : ${m.msgFrom} to : ${m.msgTo} msg:  ${m.msg} `);
        }else{
            logger.debug('User not online : '+m.msgTo,users)
        }

    });
    // ? Send  server are live to client
    socket.emit('live');
    setInterval(() => {
        socket.emit('live');
    },1000);
});

// ? Handle uncaughtException
process.on('uncaughtException', function (err) {
    logger.fatal((new Date).toUTCString() + ' uncaughtException:', err.message);
    logger.fatal(err.stack);
    //process.exit(1);
});