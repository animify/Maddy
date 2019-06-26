const cuid = require('cuid');
const mongoose = require('mongoose');
const uri = 'mongodb+srv://animify:Password00@reel-yrzwb.mongodb.net/test?retryWrites=true&w=majority';
const { URLSearchParams } = require('url');
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const fetch = require('node-fetch');
const Relation = require('./models/Relation');

mongoose.connect(uri, { useNewUrlParser: true });

const server = restify.createServer({
    name: 'Reel',
    version: '1.0.0',
});

const cors = corsMiddleware({
    origins: ['*'],
});

async function sendPost(payload, url) {
    console.log('sending post', payload);
    return await fetch(url, {
        method: 'POST',
        body: payload,
        headers: { 'Content-type': 'application/json' },
    });
}

async function sendCallback(code) {
    const params = new URLSearchParams();

    params.append('client_id', '662900450978.673844679700');
    params.append('client_secret', '767c913096222754b705ef7d84b019ea');
    params.append('code', code);
    params.append('redirect_uri', 'https://reel.animify.now.sh/hooks/callback');

    console.log('sending callback', params);

    const res = await fetch('https://slack.com/api/oauth.access', {
        method: 'POST',
        body: params,
        headers: { 'Content-type': 'application/x-www-form-urlencoded' },
    });

    return res.json();
}

const getWebhook = cuid => {
    return `https://reel.animify.now.sh/hooks/v1/${cuid}`;
};

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(
    restify.plugins.bodyParser({
        requestBodyOnGet: true,
    })
);

server.get('/hooks', function(req, res, next) {
    res.send('Reel');
    next();
});

server.get('/hooks/callback', function(req, res, next) {
    const query = req.query;
    console.log(query);

    sendCallback(query.code).then(response => {
        const id = cuid();
        const hook = response.incoming_webhook.url;
        const channel = response.incoming_webhook.channel;
        const team = response.team_name;
        const teamId = response.team_id;
        const data = { id, hook, channel, team, teamId };
        const relation = new Relation(data);

        console.log('relation', relation);

        relation
            .save()
            .then(() => {
                res.json({ ...data, webhook: getWebhook(id) });
                next();
            })
            .catch(err => {
                res.json({ success: false });
                next();
            });
    });
});

server.get('/api/get/:id', async function(req, res, next) {
    const params = req.params;

    if (!params || (params && !params.id)) {
        res.json({ success: false });
        return next();
    }

    try {
        const found = await Relation.findOne({ id: params.id });

        res.json({
            id: found.id,
            hook: getWebhook(found.id),
            channel: found.channel,
            team: found.team,
            teamId: found.teamId,
        });
    } catch (err) {
        res.json({ success: false });
    }
    next();
});

server.post('/hooks/v1/:id', async function(req, res, next) {
    const params = req.params;

    if (!params || (params && !params.id)) {
        res.json({ success: false });
        return next();
    }

    res.setHeader('content-type', 'application/json');

    console.log('sending post request');

    if (req.body.action === 'created' && req.body.release) {
        const releaseMessage = `:package: New release *${req.body.release.name}* created in repository *${req.body.repository.name}* (<${
            req.body.repository.html_url
        }|@${req.body.repository.full_name}>).\n:label: Tagged *${req.body.release.tag_name}* by <${req.body.release.author.html_url}|*@${
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

        const found = await Relation.findOne({ id: params.id });

        sendPost(payload, found.hook).then(() => {
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
