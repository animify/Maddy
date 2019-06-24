const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');

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

server.post('/hook', function(req, res, next) {
    res.setHeader('content-type', 'application/json');
    res.json({ success: true, body: req.body });
    return next();
});

server.listen(3003, function() {
    console.log('%s listening at %s', server.name, server.url);
});
