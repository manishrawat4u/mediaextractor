var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var got = require('got');
var cheerio = require('cheerio');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

function getRandomRolor() {
    var lum = -0.25;
    var hex = String('#' + Math.random().toString(16).slice(2, 8).toUpperCase()).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var rgb = "#",
        c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }
    return rgb;
}

function absolute(base, relative) {
    var stack = base.split("/"),
        parts = relative.split("/");
    stack.pop(); // remove current file name (or empty string)
    // (omit if "base" is the current folder without trailing slash)
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] == ".")
            continue;
        if (parts[i] == "..")
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join("/");
}

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('message', async function (data) {
        var listOfUrl=[];
        listOfUrl.push(data);
        var tag = JSON.stringify(data);
        var tagColor = getRandomRolor();
        function sendToClient(message, url) {
            socket.emit('message', {
                tag: tag,
                message: message,
                url: url,
                tagColor: tagColor
            });
        }
        sendToClient('Recieved...');

        var response = await got(data).catch(() => {
            sendToClient('Error...');
        });
        if (response) {
            var $ = cheerio.load(response.body);
            $('a').each(function (i, link) {
                var linkHref = $(link).attr('href');
                if (linkHref && !linkHref.startsWith('#')) {
                    if (linkHref.startsWith('http://') || linkHref.startsWith('https://') || linkHref.startsWith('//')) {
                        //do nothing
                    }
                    else {
                        linkHref = absolute(data, linkHref);
                    }
                    !listOfUrl.includes(linkHref) && listOfUrl.push(linkHref) &&sendToClient($(link).text(), linkHref);
                }
            });
            console.log('a message recvd...');
            sendToClient('Completed...');
        }
    });
});

var port = normalizePort(process.env.PORT || '3000');

http.listen(port, function () {
    console.log('listening on *:' + port);
});

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}