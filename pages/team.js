import React, { Component } from 'react';

export default class extends Component {
    static getInitialProps({ query: props }) {
        return props;
    }

    render() {
        const { id, hook, channel, team, teamId } = this.props;
        return (
            <div>
                <h4>Cuid: {id}</h4>
                <h4>Webhook: {hook}</h4>
                <h4>Posting to: {channel}</h4>
                <h4>Team: {team}</h4>
                <h4>Team ID: {teamId}</h4>
            </div>
        );
    }
}
