var fs = require('fs');
var dotenv = require('dotenv');
require('dotenv').config()

var express = require('express')();

var httpdOptions = (process.env.PROTOCOL_TYPE === 'http') ? {} : {
        key: fs.readFileSync(process.env.SSL_KEY, 'utf8'),
        cert: fs.readFileSync(process.env.SSL_CRT, 'utf8')
    };
httpd = require(process.env.PROTOCOL_TYPE).createServer(httpdOptions, express);
io = require('socket.io')(httpd);

express.get('/', function(req, res) {
    res.header("X-powered-by","TheYkk");
    res.send('724 Operator chat powered by TheYkk');
});
var jwt = require('socketio-jwt');


httpd.listen(process.env.SSL_PORT);

console.log('Started to run at => ' + new Date());
var users = {};

io.use(jwt.authorize({
    secret: process.env.JWT_SECRET,
    handshake: true
}));

io.on('connect', function(socket) {
    let user;
    const ID = socket.id;

    //console.log('gelen ' + ID);

    user = socket.decoded_token;

    users[user.userid] = { socket: ID };

    socket.on('disconnect', () => {
        //console.log('Cikan ' + ID);
        //console.log('idsi ' + getID(ID));

        delete users[getID(ID)];
    });

    socket.on('who', (cuser) => {
        //console.log(cuser);
        let status = {
            offline: [],
            online:[]
        };
        // let calisanlar = JSON.parse(cuser.users);
        cuser.forEach(e => {
            //console.log(e)
            if(users[e]) {
                //console.log('online = '+e)
                status.online.push(e);
            } else {
                //console.log('ofline = '+e)
                status.offline.push(e);
            }
        });
        //console.log(status)
        socket.emit('status',status);
    });

    socket.emit('live');
    
    setInterval(() => {
        socket.emit('live');
    }, cTime * 1000);
});

function getID(id) {
    let uid;
    Object.keys(users).forEach(function(key) {
        if(users[key].socket == id) {
            uid = key;
        }
    });

    return uid;
}

process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});