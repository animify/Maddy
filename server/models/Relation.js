const mongoose = require('mongoose');

module.exports = mongoose.model(
    'Relation',
    new mongoose.Schema({ id: String, team: String, slackHook: String, channel: String, teamId: String })
);
