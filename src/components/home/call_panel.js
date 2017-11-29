import React, { Component } from 'react';
import MakeCallForm from './make_call_form';
import AnswerButton from './call_controls/answer_button'
import HoldButton from './call_controls/hold_button'
import ResumeButton from './call_controls/resume_button'
import HangupButton from './call_controls/hangup_button'
import TransferButton from './call_controls/transfer_button'
import ConferenceButton from './call_controls/conference_button'
import moment from "moment";
import "moment-duration-format";

class CallPanel extends Component {
  constructor() {
    super();

    this.state = { "open": false, now: (new Date()) };
  }

  toggleContent() {
    this.setState({"open": !this.state.open});
  }

  startCallTimer() {
    var timer = setInterval(() => {
      this.setState({ now: (new Date()) });
    }, 1000);

    this.setState({timer: timer});
  }

  render() {
    let agent = this.props.agent;
    let calls = agent.calls;
    let callsActive = (Object.keys(calls).length > 0);

    let contentStyle = {
      maxHeight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      backgroundColor: '#EEE',
      float: 'left'
    }
    if (callsActive) {
      contentStyle = {
        maxHeight: '500px'
      }
    }

    let iconStyle = {
      marginRight: '10px',
      marginLeft: '2px',
      fontSize: '20px',
      verticalAlign: 'middle',
      float: "left"
    }
    let headerTextStyle = {
      verticalAlign: 'middle',
      float: 'left'
    }


    let callIds = Object.keys(calls);

    if(callIds.length === 0) {

      return (
        <div style={{height: 'calc(100% - 35px)', position: 'relative'}}>
          <div className="call-header" onClick={this.toggleContent.bind(this)}>
            <i style={iconStyle} className="fa fa-phone" aria-hidden="true"></i>
            <span style={headerTextStyle}>
              No Calls
            </span>
          </div>

          <MakeCallForm agent={agent} phoneApi={this.props.phoneApi}/>
        </div>
      );

    } else {
      let callTabs = [];
      for(let i = 0; i < callIds.length; i++) {
        let call = calls[callIds[i]];

        let callVariable1 = "";
        if(call.callVariables && call.callVariables["callVariable1"]) {
          callVariable1 = call.callVariables["callVariable1"]
        }

        let formattedCallTime = '';
        let elapsedTime = this.state.now - call.startedAt;
        if (elapsedTime < 0) {
          elapsedTime = 0;
        }
        formattedCallTime = moment.duration(elapsedTime);
        formattedCallTime = formattedCallTime.format('mm:ss', { trim: false });

        if (!this.state.timer) {
          this.startCallTimer.apply(this);
        }

        callTabs.push(
          <div className="call-tab">
            <div className="call-header">
              <i style={iconStyle} className="fa fa-phone header-phone-icon" aria-hidden="true"></i>
              <span className="header-other-party" style={headerTextStyle}>
                {call.otherParty} ({formattedCallTime})
              </span>
              <AnswerButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <HangupButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <ConferenceButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <TransferButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <ResumeButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <HoldButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
            </div>

            <div className="call-content" style={contentStyle}>
              <div>{"CallVariable1: " + callVariable1}</div>
            </div>
          </div>
        );
      }

      return (
        <div style={{height: 'calc(100% - 35px)', position: 'relative'}}>
          {callTabs}
          <MakeCallForm agent={this.props.agent} phoneApi={this.props.phoneApi}/>
        </div>
      );
    }
  }
}

export default CallPanel;
