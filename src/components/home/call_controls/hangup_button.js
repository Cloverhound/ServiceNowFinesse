import React, { Component } from 'react';
import CallControlButton from './call_control';


class HangupButton extends Component {

  render() {
    let agent = this.props.agent;
    let call = this.props.call;
    if ( (call.direction === "outbound" || call.state === "ACTIVE") && (!call.held) ) {
      return <CallControlButton  type="hangup" function={this.props.phoneApi.hangup.bind(null, agent, call)} icon="end"/>
    }
    return null;
  }
}

export default HangupButton;
