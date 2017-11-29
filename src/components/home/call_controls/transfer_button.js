import React, { Component } from 'react';
import CallControlButton from './call_control';

class TransferButton extends Component {

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
    let call = this.props.call;
    var otherCall = this.getOtherCall(call);
    if(call.line === 1 && otherCall && !otherCall.held)  {
      return <CallControlButton
            type="transfer"
            function={this.props.phoneApi.transfer.bind(null, agent, call)}
            icon="transfer"/>
    }

    return null;
  }

}

export default TransferButton;
