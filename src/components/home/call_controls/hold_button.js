import React, { Component } from 'react';
import CallControlButton from './call_control';


class HoldButton extends Component {

  render() {
    let agent = this.props.agent;
    let call = this.props.call;
    if (call && call.state === "ACTIVE" && !call.held && !agent.state.startsWith('WORK')) {
      return <CallControlButton type="hold" function={this.props.phoneApi.hold.bind(null, agent, call)} icon="pause"/>
    }
    return null;
  }

}

export default HoldButton;
