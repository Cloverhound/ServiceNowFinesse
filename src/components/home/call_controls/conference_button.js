import React, { Component } from 'react';
import CallControlButton from './call_control';

class ConferenceButton extends Component {

  getOtherCall(call) {
    let otherLine = 3 - call.line;
    return this.getCallByLine(otherLine);
  }

  getCallByLine(line) {
    let calls = this.props.agent.calls;
    var callIds = Object.keys(calls);
    for(var i = 0; i < callIds.length; i++) {
      var call = calls[callIds[i]];
      if(call.line === line) {
        return call;
      }
    }
    return false;
  }

  render() {
    let agent = this.props.agent;
    let icon =  <i className="fa fa-users button-icon conference" aria-hidden="true"></i>;
    var call = this.props.call;
    var otherCall = this.getOtherCall(call);
    if(call.line === 1 && otherCall && !otherCall.held)  {
      return <CallControlButton
            type="conference"
            function={this.props.phoneApi.conference.bind(null, agent, call)}
            icon={icon}
            dontUseSvg={true} />
    }

    return null;
  }

}

export default ConferenceButton;
