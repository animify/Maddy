import React, { useState, useEffect } from 'react';

function Team({ teamId }) {
    const [props, setProps] = useState({ id: null, webhook: null, channel: null, team: null });
    const { id, webhook, channel, team } = props;

    useEffect(() => {
        fetch(`/api/get/${teamId}`)
            .then(response => response.json())
            .then(setProps);
    }, []);

    return (
        <div>
            <h4>Cuid: {id}</h4>
            <h4>Webhook: {webhook}</h4>
            <h4>Posting to: {channel}</h4>
            <h4>Team: {team}</h4>
            <h4>Team ID: {teamId}</h4>
        </div>
    );
}

Team.getInitialProps = async ({ query }) => {
    return { teamId: query.id };
};

export default Team;
