var fs = require('fs');
var http = require("http");
var WebSocketServer = new require('ws');
var express = require('express');
var app = express();
var path = require('path');
var port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, '../public')));
var server = http.createServer(app);
server.listen(port);
console.log("http server listening on %d", port);

var webSocketServer = new WebSocketServer.Server({server: server})
console.log("websocket server created")

//var webSocketServer = new WebSocketServer.Server({
//    port: port
//});
var bodyParser = require('body-parser');
var dataParser = bodyParser.urlencoded({
    extended: false
});
var method = "POST";
var store = [];
var listofchannels = [];
var chatname = '', channelname, servername = "";
var irc = require('../');
var bots = [];
var clients = {};
var user_list = {};
var websoc = "";
var isChannelListrequested = false;
var protectedchannels = {};
var clientChannels = [];

app.get('/chatRoom.xhtml', function (req, res) {
    method = "GET";
    handler(req, res);
});

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, '../public/html/welcome.xhtml'));
});

app.get("/ak48tf7nl148logininfonetworkapplications", function (req, res) {

    res.send(store[chatname]); // send web page
});

app.get("/user_list", function (req, res) {

    res.send(user_list); // send web page
});

app.post('/chatRoom.xhtml', dataParser, handler);

//app.listen(80, function () {

//    console.log("server runs on 80");
//});

app.get("/test", function (req, res) {
    res.sendFile(path.join(__dirname, '../public/test/test.html'));
})

webSocketServer.on('connection', function (ws) {

    var id = Math.random();
    //console.log(chatname + "-----------------------------chatname");
    clients[chatname] = ws;
    websoc = ws;

    ws.on('message', function (message) {

        var obj = JSON.parse(message);
        if (obj.hasOwnProperty('cm')) {
            //console.log("obj.cm.userFrom==" + obj.cm.userFrom + "---obj.cm.to=" + obj.cm.to.trim());
            bots[obj.cm.userFrom.trim()].say(obj.cm.to, obj.cm.message);
            clients[obj.cm.userFrom].send(message);
        } else if (obj.hasOwnProperty('pm')) {
            //console.log("obj.pm.userFrom==" + obj.pm.userFrom + "---obj.pm.to=" + obj.pm.to.trim());
            bots[obj.pm.userFrom.trim()].say(obj.pm.to.trim(), obj.pm.message);
            clients[obj.pm.userFrom].send(message);
        } else if (obj.hasOwnProperty('nc')) {

            bots[obj.nc.userFrom.trim()].join(obj.nc.channelName);
        }
        else if (obj.hasOwnProperty('rf')) {

            //console.log("obj.rf.userFrom==" + obj.rf.userFrom.trim());
            chatname = obj.rf.userFrom.trim();
        }
        else if (obj.hasOwnProperty('kick')) {

            //console.log("obj.kick.user==" + obj.kick.user.trim());
            chatname = obj.kick.user.trim();
            var jsonstring = '{"error":{"userFrom":"' + chatname + '","reason":"kicked out from server","code":"kicked"}}';
            clients[chatname].send(jsonstring);
        }
        else if (obj.hasOwnProperty('close')) {

            //console.log("obj.close.user==" + obj.close.user.trim());

            var temp_name = obj.close.user.trim();

            var jsonstring = '{"error":{"userFrom":"' + temp_name + '","reason":"user closed","code":"closed"}}';
            chatname = temp_name;
            clients[temp_name].send(jsonstring);
        }
        else if (obj.hasOwnProperty('cl')) {

            /*chatname = obj.cl.userFrom.trim();
             var temp_name = chatname, channellist = "",arrs =[];
             console.log("obj.channellist==" + temp_name);

             channellist = bots[temp_name.trim()].channellist;
             for (var i=0;i<channellist.length;i++){

             arrs.push(channellist[i].name);
             }*/
            chatname = obj.cl.userFrom.trim();
            var temp_name = chatname;
            var jsonstring = '{"cl":{"channellist":"' + clientChannels + '"}}';
            if (temp_name in clients) {
                chatname = temp_name;
                clients[temp_name].send(jsonstring);
            }

        }

    });

    ws.on('close', function (ws) {
        console.log('connection closed ' + chatname + "--->ws=" + ws + "--->clients[chatname]=" + clients[chatname]);
        delete clients[chatname];
        bots[chatname].disconnect();
        delete bots[chatname];
        delete store[chatname];

    });

});

function handler(req, res) {

    // var myMap = { 'chatname': req.body.yourchatname};
    chatname = req.body.yourchatname;

    channelname = req.body.yourchannelname.toLowerCase();

    if (channelname.indexOf('.') > -1) {
        res.sendFile(path.join(__dirname, '../public/html/welcome.xhtml'));
        return;
    }

    servername = req.body.servercombo;

    hashpass = req.body.pass_hash;


    if (channelname in protectedchannels) {
        if (protectedchannels[channelname] !== hashpass) {

            res.sendFile(path.join(__dirname, '../public/html/welcome.xhtml'));
            return;
        }
    } else {
        protectedchannels[channelname] = hashpass;
    }


    if (!(clientChannels.indexOf(clientChannels) > -1)) {
        clientChannels.push(channelname);
    }


    if (!store.hasOwnProperty(chatname)) {
        store[chatname] = new Object();

        eval("store['" + chatname + "']." + "chatname" + " = '" + chatname
            + "'");
        if (typeof req.body.password_text !== 'undefined') {
            eval("store['" + chatname + "']." + "chatpassword" + " = '"
                + req.body.password_text + "'");
        }
        eval("store['" + chatname + "']." + "channel" + " = '" + channelname
            + "'");

        var bot = new irc.Client(servername, chatname, {
            debug: true,
            channels: [channelname]
        });

        bots[chatname] = bot;
        console.log("new client created:" + chatname);

        bots[chatname].addListener('message#', function (from, to, message) {
            //console.log('%s => %s: %s', from, to, message);
            var substring = [];
            substring[0] = "<script";
            substring[1] = "<style";

            if (!(message.indexOf(substring[0]) > -1) && !(message.indexOf(substring[1]) > -1)) {
                var jsonstring = '{"cm":{"userFrom":"' + from + '","message":"' + message + '","to":"' + to + '"}}';
                if (bot.nick in clients) {
                    clients[bot.nick].send(jsonstring);
                }
            }
            else {
                var jsonstring = '{"cm":{"userFrom":"' + 'Admin' + '","message":"<b style="color:palevioletred">Last warning for user:</b>' + from + '--><I>Please do not use scripts in the message box</I>","to":"' + to + '"}}';
                if (bot.nick in clients) {
                    clients[bot.nick].send(jsonstring);
                }
            }

        });

        bots[chatname].addListener('pm', function (nick, message) {
            //console.log('Got private message from %s: %s', nick, message);
            var jsonstring = '{"pm":{"userFrom":"' + nick + '","message":"' + message + '"}}';
            if (bot.nick in clients) {
                clients[bot.nick].send(jsonstring);
            }
        });

        bots[chatname].addListener('error', function (message) {
            //console.error('ERRORsssssss: %s: %s', message.command, message.args.join(' '));

            if (message.command == 'err_notregistered') {
                //console.log("go back" + message.nick + "---message.user=" + message.user + "---command=" + message.command);
                var jsonstring = '{"error":{"userFrom":"' + chatname + '","reason":"' + message.command + '","code":"notreg"}}';


                if (chatname in bots) {
                    bots[chatname].disconnect();
                }
                if (chatname in clients) {
                    clients[chatname].send(jsonstring);
                }
            }
            else {
                console.log("-->quit-->" + message.nick + "---command=" + message.command);
            }
        });


        bots[chatname].addListener('join', function (channel, nick, message) {
            //console.log('%s has joined %s', nick, channel);
            var jsonstring = '{"user":{"names":"' + nick + '","channel":"' + channel + '"}}';
            if (bot.nick in clients) {
                clients[bot.nick.trim()].send(jsonstring);
            }

        });
        bots[chatname].addListener('part', function (channel, nick, reason, message) {
            //console.log('%s has left %s: %s because of %s',  nick, channel, message,reason);

            var jsonstring = '{"quit":{"names":"' + nick + '","channel":"' + channel + '","reason":"' + reason + '"}}';
            if (bot.nick in clients) {
                clients[bot.nick.trim()].send(jsonstring);
            }
        });
        bots[chatname].addListener('kick', function (channel, who, by, reason) {
            //console.log('%s was kicked from %s by %s: %s', who, channel, by, reason);
        });

        bots[chatname].addListener('who', function (info) {
            //console.log('%s was ', info);
        });

        bots[chatname].addListener('names', function (channel, nicks) {


            var arrs = [];
            for (var key in nicks) {
                arrs.push(escape(key));
            }
            if (bot.nick in clients) {
                var jsonstring = '{"users":{"names":"' + arrs + '","channel":"' + channel + '"}}';

                clients[bot.nick.trim()].send(jsonstring);
            }


        });

        bots[chatname].addListener('quit', function (nick, reason, channels, message) {

            console.log('%s has left %s: %s because of %s', nick, channels, message, reason);
            var jsonstring = '{"quit":{"names":"' + nick + '","channel":"' + channels + '","reason":"' + reason + '"}}';
            if (bot.nick.trim() in clients) {
                clients[bot.nick.trim()].send(jsonstring);
            }

        });

        bots[chatname].addListener('registered', function () {

            if (isChannelListrequested == false) {
                isChannelListrequested = true;
                bot.list(servername);

            }
            else {
                var jsonstring = '{"channel":{"names":"' + listofchannels + '"}}';
                if (bot.nick in clients && listofchannels.length > 0) {

                    clients[bot.nick.trim()].send(jsonstring);
                }
            }
        });


        bots[chatname].addListener('channellist_start', function () {
            //console.log('list started');

        });

        bots[chatname].addListener('channellist_item', function (channel_info) {


            /* if(channel_info.name.substr(0,2) != "##" && limit<=200) {
             limit=limit+1;
             listofchannels.push(channel_info.name);
             var jsonstring = '{"channel":{"names":"' + channel_info.name + '"}}';
             clients[bot.nick.trim()].send(jsonstring);

             }*/
        });

        bots[chatname].addListener('channellist', function (channel_list) {

            var num = 0;
            for (var key in channel_list) {
                if (num > 200) {
                    break;
                }
                if (channel_list[key].name.substr(0, 2) != "##" && channel_list[key].name.indexOf('.') === -1) {
                    listofchannels.push(channel_list[key].name);
                }
                num++;
            }
            var jsonstring = '{"channel":{"names":"' + listofchannels + '"}}';
            for (bots.nick in clients) {
                clients[bots.nick].send(jsonstring);
            }
        });

        res.sendFile(path.join(__dirname, '../public/html/chatRoom.xhtml'));
    } else {
        res.sendFile(path.join(__dirname, '../public/html/welcome.xhtml'));
    }
}




