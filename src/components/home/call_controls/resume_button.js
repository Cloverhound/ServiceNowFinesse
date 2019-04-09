import React, { Component } from 'react';
import CallControlButton from './call_control';


class ResumeButton extends Component {

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
    let icon = <i className="fa fa-play button-icon resume" aria-hidden="true"></i>;
    let call = this.props.call;
    if (!call) {
      return null;
    }
    var otherCall = this.getOtherCall(call);
    if(otherCall && otherCall.state !== "ACTIVE") {
      return null;
    }
    if (call.state === "ACTIVE" && call.held && !agent.state.startsWith('WORK')) {
      return <CallControlButton type="resume" function={this.props.phoneApi.resume.bind(null, agent, call)} icon={icon} dontUseSvg={true}/>
    }
    return null;
  }

}

export default ResumeButton;
