const restify = require('restify');
const axios = require('axios');
const corsMiddleware = require('restify-cors-middleware');

const server = restify.createServer({
    name: 'Reel',
    version: '1.0.0',
});

const cors = corsMiddleware({
    origins: ['github.com'],
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

server.post('/hook', function(req, res, next) {
    res.setHeader('content-type', 'application/json');
    res.json({ success: true, body: req.body });

    if (req.body.action === 'created' && req.body.release) {
        const releaseMessage = `New release *${req.body.release.name}* created in repository *${req.body.repository.name}* (<${
            req.body.repository.html_url
        }|@${req.body.repository.full_name}>).\nTagged *${req.body.release.tag_name}* by <${req.body.release.author.html_url}|*@${
            req.body.release.author.login
        }*>.`;

        axios.post(
            'https://hooks.slack.com/services/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',
            {
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
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }

    return next();
});

server.listen(3003, function() {
    console.log('%s listening at %s', server.name, server.url);
});
