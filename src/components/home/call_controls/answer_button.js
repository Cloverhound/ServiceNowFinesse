import React, { Component } from 'react';
import CallControlButton from './call_control';


class AnswerButton extends Component {

  render() {
    let agent = this.props.agent;
    var call = this.props.call;
    if(call.direction === "inbound" && call.state === "ALERTING" )  {
      return <CallControlButton
            type="answer"
            function={this.props.phoneApi.answer.bind(null, agent, call)}
            icon="answer"/>
    }

    return null;
  }

}

export default AnswerButton;
