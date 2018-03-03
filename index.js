var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var got = require('got');
var cheerio = require('cheerio');
var URL = require('url');
const QueryString = require('querystring');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/download', async function (req, res) {
    var q = req.query.q;

    switch (URL.parse(q).hostname) {
        case 'www.indishare.me':
        case 'indishare.me':
        case 'userscloud.com':
        case 'uptobox.com':
        case 'uppit.com':
            var response = await indishareDownload(q);
            res.end(response || 'error');
            break;
        case 'sendit.cloud':
            var response = await generateSimpleFormForDownload(q);
            res.end(response);
            break;
        case 'w4files.pw':
            var response = await w4filesDownload(q);
            if (response) {
                res.redirect(response);
            }
            else {
                res.end('error');
            }
            break;
        case 'uplod.cc':
            var response = await uplodCCDownload(q);
            if (response) {
                res.redirect(response);
            }
            else {
                res.end('error');
            }
            break;
        case 'streamyourfile.com':
            var response = await streamYourFileDownload(q);
            if (response) {
                res.redirect(response);
            }
            else {
                res.end('error');
            }
            break;
        case 'turbobit.net':
            res.end('Not supported!!!');
        default:
            var response = await got(q).catch(() => {
                //do nothing;
            });
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(response.body);
            break;
    }
});

app.get('/proxy', function (req, res) {
    var reqheaders = {};
    for (h in req.headers) {
        if (h != 'host') reqheaders[h] = req.headers[h];
    }
    got.stream(req.query.q, {
        method: req.method,
        headers: reqheaders
    }).on('response', (r) => {
        for (h in r.headers) {
            res.setHeader(h, r.headers[h]);
        }
    }).pipe(res);
});

async function uplodCCDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        var $ = cheerio.load(response.body);
        var downloadLocation = $('a.btn-dl-plus').attr('href');

        var innerResponse = await got(downloadLocation).catch(() => {

        });
        if (innerResponse) {
            $ = cheerio.load(innerResponse.body);
        }
    }
}

async function w4filesDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        var $ = cheerio.load(response.body);

        var matches = response.body.match(/<a[^>]*>([^<]+)<\/a>/g);
        var finalHref = '';
        matches.forEach((i, e) => {
            var el = $(i);
            if (el.text() == 'download now') {
                finalHref = el.attr('href');
            }
        });
        return finalHref;
    }
    else {
        return null;
    }
}

async function indishareDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        const form = {};
        var $ = cheerio.load(response.body);
        $("input", "form").each((i, e) => {
            if (e.attribs.name) {
                form[e.attribs.name] = e.attribs.value;
            }
        });

        var innerResponse = await got.post(q, {
            body: form,
            form: true
        });

        if (innerResponse) {
            $ = cheerio.load(innerResponse.body);
            var divElement = $('<div></div>');

            $('a').each((i, e) => {
                divElement.append($('<a></a>').attr('href', '/proxy?q=' + encodeURIComponent(e.attribs.href)).text(e.attribs.href)).append('<br/>');
            });
            return '<html><body>' + divElement.toString() + '<script></script></body></html>';
        } else {
            return null;
        }
    }
    else {
        return null;
    }
}

async function streamYourFileDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        const form = {};
        var $ = cheerio.load(response.body);
        $("input", "form").each((i, e) => {
            if (e.attribs.name) {
                if (e.attribs.name == 'op') {
                    form[e.attribs.name] = 'download2';
                }
                else {
                    form[e.attribs.name] = e.attribs.value;
                }
            }
        });

        var returnLocation;
        var innerResponse = await got.post(q, {
            body: form,
            form: true
        }).catch((r) => {
            if (r.statusCode == 302) returnLocation = r.headers.location;
        });

        return returnLocation;
    }
    else {
        return null;
    }
}

async function generateSimpleFormForDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        var $ = cheerio.load(response.body);
        var formElement = $('<form></form>').attr('method', 'post').attr('action', q);
        $("input", "form").each((i, e) => {
            formElement.append(e);
        });
        var finalBody = '<html><body>' + formElement.toString() + '<script>document.getElementsByTagName("form")[0].submit();</script></body></html>';
        return finalBody;
    }
    else {
        return 'error';
    }
}

function getRandomColor() {
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

var knownProviders = [
    'sendit.cloud'
    , 'userscloud.com'
    , 'uptobox.com'
    , 'uppit.com'
    , 'turbobit.net'
    , 'streamyourfile.com'
    , 'rapidgator.net'
    , 'multiup.org'
    , 'filescdn.com'
    , 'filecloud.io'
    , 'www.embedupload.com'
    , 'bdupload.info'
    , '9xupload.me'
    , 'uploadkadeh.com'
    , 'upfile.mobi'
    , 'www.indishare.me'
    , 'clicknupload.org'
    , 'w4files.pw'
    , 'uplod.cc'
    , 'www.w4links.site'
    , 'www.flashx.tv'
    , '9xplay.live'
    , 'openload.co'];

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('message', async function (data) {
        var listOfUrl = [];
        listOfUrl.push(data);
        var tag = JSON.stringify(data);
        var tagColor = getRandomColor();
        function sendToClient(message, targetLink) {
            var objectToSend = {
                tag: tag,
                message: message,
                tagColor: tagColor,
            };
            var knownProvider = false;
            if (targetLink) {
                objectToSend.url = targetLink;
                if (knownProviders.includes(URL.parse(targetLink).hostname)) {
                    objectToSend.knownProvider = true;
                }
            }
            socket.emit('message', objectToSend);
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
                    !listOfUrl.includes(linkHref) && listOfUrl.push(linkHref) && sendToClient($(link).text(), linkHref);
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