const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const fetch = require('node-fetch');

const server = restify.createServer({
    name: 'Reel',
    version: '1.0.0',
});

const cors = corsMiddleware({
    origins: ['*'],
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(
    restify.plugins.bodyParser({
        requestBodyOnGet: true,
    })
);

server.get('/', function(req, res, next) {
    res.send('Reel');
    next();
});

async function sendPost(payload) {
    console.log('sending post', payload);
    return fetch('https://hooks.slack.com/services/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', {
        method: 'POST',
        body: payload,
        headers: { 'Content-type': 'application/json' },
    });
}

server.post('/hook', function(req, res, next) {
    res.setHeader('content-type', 'application/json');

    console.log('sending post request');

    if (req.body.action === 'created' && req.body.release) {
        const releaseMessage = `New release *${req.body.release.name}* created in repository *${req.body.repository.name}* (<${
            req.body.repository.html_url
        }|@${req.body.repository.full_name}>).\nTagged *${req.body.release.tag_name}* by <${req.body.release.author.html_url}|*@${
            req.body.release.author.login
        }*>.`;

        const payload = JSON.stringify({
            text: releaseMessage,
            attachments: [
                {
                    fallback: 'You are unable to visit the release',
                    color: '#000',
                    attachment_type: 'default',
                    actions: [
                        {
                            type: 'button',
                            text: `See release ${req.body.release.tag_name}`,
                            url: req.body.release.html_url,
                        },
                    ],
                },
            ],
        });

        sendPost(payload).then(() => {
            console.log('then');
            res.json({ success: true, body: req.body });
            next();
        });
    } else {
        res.json({ success: false });
        next();
    }
});

server.listen(3003, function() {
    console.log('%s listening at %s', server.name, server.url);
});
