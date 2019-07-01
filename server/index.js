const cuid = require("cuid");
const mongoose = require("mongoose");
const uri =
  "mongodb+srv://animify:Password00@reel-yrzwb.mongodb.net/test?retryWrites=true&w=majority";
const { URLSearchParams } = require("url");
const restify = require("restify");
const corsMiddleware = require("restify-cors-middleware");
const fetch = require("node-fetch");
const Relation = require("./models/Relation");

mongoose.connect(uri, { useNewUrlParser: true });

const server = restify.createServer({
  name: "Maddy",
  version: "1.0.0"
});

const cors = corsMiddleware({
  origins: ["*"]
});

async function sendPost(payload, url) {
  console.log("sending post", payload, url);
  return await fetch(url, {
    method: "POST",
    body: payload,
    headers: { "Content-type": "application/json" }
  });
}

async function sendCallback(code) {
  const params = new URLSearchParams();

  params.append("client_id", "662900450978.673844679700");
  params.append("client_secret", "767c913096222754b705ef7d84b019ea");
  params.append("code", code);
  params.append("redirect_uri", "https://maddy.cloud/hooks/callback");

  console.log("sending callback", params);

  const res = await fetch("https://slack.com/api/oauth.access", {
    method: "POST",
    body: params,
    headers: { "Content-type": "application/x-www-form-urlencoded" }
  });

  return res.json();
}

const getWebhook = (cuid, teamId) => {
  return `https://maddy.cloud/hooks/v1/${teamId}/${cuid}`;
};

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(
  restify.plugins.bodyParser({
    requestBodyOnGet: true
  })
);

server.get("/hooks/callback", function(req, res, next) {
  const query = req.query;
  console.log(query);

  sendCallback(query.code).then(async response => {
    console.log("response", response);

    const id = cuid();
    const slackHook = response.incoming_webhook.url.trim();
    const channel = response.incoming_webhook.channel.trim();
    const team = response.team_name;
    const teamId = response.team_id.trim();
    const data = { id, slackHook, channel, team, teamId };
    const relation = new Relation(data);
    const found = await Relation.findOne({ teamId });

    try {
      if (found) {
        await Relation.deleteOne({ teamId: teamId });
      }

      await relation.save();
      res.json({ ...data, slackHook, webhook: getWebhook(id, teamId) });
      next();
    } catch (err) {
      res.json({ success: false });
      next();
    }
  });
});

server.get("/api/get/:teamId", async function(req, res, next) {
  const params = req.params;

  if (!params || (params && !params.teamId)) {
    res.json({ success: false });
    return next();
  }

  try {
    const found = await Relation.findOne({ teamId: params.teamId });

    res.json({
      id: found.id,
      webhook: getWebhook(found.id, found.teamId),
      channel: found.channel,
      team: found.team,
      teamId: found.teamId
    });
  } catch (err) {
    res.json({ success: false });
  }
  next();
});

server.post("/api/commands", async function(req, res, next) {
  res.setHeader("content-type", "application/json");

  try {
    const { user_id, team_id, text } = req.body;
    const found = await Relation.findOne({ teamId: team_id });

    switch (text) {
      case "webhook":
        res.json({
          text: `¡Hola <@${user_id}>! The webhook for your team is ${getWebhook(
            found.id,
            found.teamId
          )}`
        });
        break;
      default:
        res.json({
          text: `¡Hola <@${user_id}>! What's up, need help?`,
          attachments: [
            {
              fallback: "You are unable to visit the website",
              color: "#4200FF",
              attachment_type: "default",
              actions: [
                {
                  type: "button",
                  text: "Visit website",
                  url: "https://maddy.cloud"
                },
                {
                  type: "button",
                  text: "View team details",
                  url: `https://maddy.cloud/team/${team_id}`
                }
              ]
            }
          ]
        });
    }
  } catch (err) {
    res.json({
      response_type: "ephemeral",
      text: "Sorry, that didn't work. Please try again."
    });
  }
  next();
});

server.post("/api/send/:teamId", async function(req, res, next) {
  res.setHeader("content-type", "application/json");
  const params = req.params;

  if (!params || (params && !params.teamId)) {
    res.json({ success: false, message: "teamId not sent" });
    return next();
  }

  if (req.body.payload) {
    const payload = JSON.stringify(req.body.payload);
    const found = await Relation.findOne({ teamId: params.teamId });

    sendPost(payload, found.slackHook).then(() => {
      res.json({ success: true });
      next();
    });
  } else {
    next();
  }
});

server.post("/hooks/v1/:teamId/:id", async function(req, res, next) {
  res.setHeader("content-type", "application/json");
  const params = req.params;

  if (!params || (params && !params.id && !params.teamId)) {
    res.json({ success: false, message: "Webhook could not be found." });
    return next();
  }

  console.log("sending post request");

  if ("ref_type" in req.body && req.body.ref_type === "tag") {
    const releaseMessage = `:package: New release *${
      req.body.ref
    }* created in repository *${req.body.repository.name}* (<${
      req.body.repository.html_url
    }|@${req.body.repository.full_name}>).\n:label: Tagged *${
      req.body.ref
    }* by <${req.body.sender.html_url}|*@${req.body.sender.login}*>.`;

    const payload = JSON.stringify({
      text: releaseMessage,
      attachments: [
        {
          fallback: "You are unable to visit the release",
          color: "#4200FF",
          attachment_type: "default",
          actions: [
            {
              type: "button",
              text: `See release ${req.body.ref}`,
              url: `${req.body.repository.html_url}/releases/tag/${
                req.body.ref
              }`
            }
          ]
        }
      ]
    });

    const found = await Relation.findOne({
      id: params.id,
      teamId: params.teamId
    });

    sendPost(payload, found.slackHook).then(() => {
      res.json({ success: true, body: req.body });
      next();
    });
  } else {
    next();
  }
});

server.listen(3003, function() {
  console.log("%s listening at %s", server.name, server.url);
});
