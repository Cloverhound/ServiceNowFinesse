import React, { Component } from 'react';

class AgentHeader extends Component {

  onLogoutClick() {
    this.props.stateApi.logout(this.props.agent)
  }

  render() {
    let agent = this.props.agent;

    let logoutStyle = {
      float: 'right',
      color: '#FFF',
      textDecoration: 'underline'
    }

    return (
      <div id="header">
        <span>{agent.firstName} {agent.lastName} ({agent.extension})</span>
        <a href="#" onClick={this.onLogoutClick.bind(this)} style={logoutStyle}>Sign Out</a>
      </div>
    );
  }
}

export default AgentHeader;
