var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var got = require('got');
var cheerio = require('cheerio');
var URL = require('url');
const QueryString = require('querystring');
var util = require('util');

// Handle errors
app.use((err, req, res, next) => {
    if (! err) {
        return next();
    }

    res.status(500);
    res.send('500: Internal server error');
});

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
        case '9xupload.me':
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
            break;
        case 'clicknupload.org':
            var response = await clicknuploadDownload(q);
            res.end(response || 'error');
            break;
        case 'openload.co':
            var response = await openloadDownload(q);
            res.end(response || 'error');
            break;
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

async function openloadDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        var rx=/var suburl .*;/
        var $ = cheerio.load(response.body);
        eval(rx.exec(response.body)[0])
        var downloadLocation = $('a.btn-dl-plus').attr('href');

        var innerResponse = await got(downloadLocation).catch(() => {

        });
        if (innerResponse) {
            $ = cheerio.load(innerResponse.body);
        }
        return null;
    } else {
        return null;
    }
}

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
        return null;
    } else {
        return null;
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

async function clicknuploadDownload(q) {
    var response = await got(q).catch(() => {
        //do nothing;
    });
    if (response) {
        const form = {};
        var $ = cheerio.load(response.body);
        $("input", "form").each((i, e) => {
            if (e.attribs.name == 'op') {
                form[e.attribs.name] = 'download2';
            }
            else {
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

            var clickAttr = $('#downloadbtn').attr('onclick');

            if (clickAttr && clickAttr.split("'")[1]) {
                var finalDwldLink = clickAttr.split("'")[1];
                divElement.append($('<a></a>').attr('href', '/proxy?q=' + encodeURIComponent(finalDwldLink)).text(finalDwldLink)).append('<br/>');
            }

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
    if (relative.startsWith('/')) {
        return base.split('/', 3).join('/') + relative;
    }

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
    var ignoreList = [];
    var NEST_LEVEL = 1;
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('initialize', function (hostArray) {
        if (hostArray && hostArray instanceof Array) {
            ignoreList = hostArray;
        }
    });
    socket.on('addToIgnoreList', function (hostname) {
        hostname && !ignoreList.includes(hostname) && ignoreList.push(hostname);
    })
    socket.on('message', async function (data) {
        var listOfUrl = [];
        var tag = JSON.stringify(data);
        var tagColor = getRandomColor();

        if (data.startsWith('--search ')) {
            var q = data.substr(9);
            knownWebsitesToCrawl.forEach(x => {
                listOfUrl.push(util.format(x.search, q));
            });
            sendToClient('Query: ' + q + ', Nest Level: ' + NEST_LEVEL);
        }
        else if (data.startsWith('--nest ')) {
            var q = data.substr(7);
            NEST_LEVEL = parseInt(q);
            sendToClient('Nested level set to : ' + NEST_LEVEL);
        }
        else {
            listOfUrl.push(data);
            sendToClient('Received Url: ' + data + ', Nest Level: ' + NEST_LEVEL);
        }


        function sendToClient(message, targetLink) {
            var objectToSend = {
                tag: tag,
                message: message,
                tagColor: tagColor,
            };
            var knownProvider = false;
            if (targetLink) {
                if (ignoreList.includes(URL.parse(targetLink).hostname)) return;
                objectToSend.url = targetLink;
                if (knownProviders.includes(URL.parse(targetLink).hostname)) {
                    objectToSend.knownProvider = true;
                }
            }
            socket.emit('message', objectToSend);
        }

        async function scrapeIt(x, nestLevel) {
            nestLevel = nestLevel - 1;
            async function gethtmlonly() {
                var downloadeddata = '';
                var streamRequest;
                return new Promise((resolve, reject) => {
                    got.stream(x).on('response', function (r) {
                        if (r.headers['content-type'] && r.headers['content-type'].startsWith('text')) {
                            //sendToClient(r.headers["content-type"]);
                        } else {
                            streamRequest.abort();
                            reject('Invalid content type : ' + (r.headers['content-type'] || ''));
                        }
                    }).on('data', function (buffer) {
                        downloadeddata += buffer;
                    }).on('request', req => {
                        streamRequest = req;
                    }).on('end', function () {
                        resolve(downloadeddata);
                    }).on('error',function(){
                        console.log('error occurred while streaming ' + x);
                        reject('Error occurrect while streaming ' + x);
                    });
                });
            };
            var response = await gethtmlonly().catch((err) => {
                sendToClient('Error...' + err);
            });

            if (response) {
                var $ = cheerio.load(response);
                $('a,iframe').each(function (i, link) {
                    var linkHref
                    switch (link.name.toLowerCase()) {
                        case 'a':
                            linkHref = $(link).attr('href');
                            break;
                        case 'iframe':
                            linkHref = $(link).attr('src');
                            break;
                        default:
                    }
                    if (linkHref && !linkHref.startsWith('#')) {
                        if (linkHref.startsWith('http://') || linkHref.startsWith('https://') || linkHref.startsWith('//')) {
                            //do nothing
                        }
                        else {
                            linkHref = absolute(x, linkHref);
                        }
                        if (!listOfUrl.includes(linkHref)) {
                            listOfUrl.push(linkHref) && sendToClient($(link).text(), linkHref);
                            if (nestLevel >= 1) {
                                scrapeIt(linkHref, nestLevel - 1);
                            }
                        }
                    }
                });
                console.log('a message recvd...');
                sendToClient('Completed...');
            }
        }



        listOfUrl.forEach(x => scrapeIt(x, NEST_LEVEL));

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

var knownWebsitesToCrawl = [{
    url: 'http://digibolly.se',
    search: 'http://digibolly.se/?s=%s'
},
{
    url: 'https://bolly4u.link',
    search: 'https://bolly4u.link/?s=%s'
},
{
    url: 'https://www.worldfree4u.ws',
    search: 'https://www.worldfree4u.ws/search/%s'
},
{
    url: 'https://www.hindilinks4u.to',
    search: 'https://www.hindilinks4u.to/?s=%s'
},
{
    url: 'https://moviefishers.me/',
    search: 'https://moviefishers.me/?s=%s'
}];