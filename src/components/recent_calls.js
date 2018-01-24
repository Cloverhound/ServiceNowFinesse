import React, { Component } from 'react';
import moment from "moment";

class RecentCallsView extends Component {
  render(){
      let tabNames = this.props.tabNames;
      if(this.props.agent.currentTab !== tabNames.RECENTS) {
        return null;
      }

      return (
        <RecentCalls agent={this.props.agent} phoneApi={this.props.phoneApi} tabNames={this.props.tabNames}/>
      )
  }
}

class RecentCalls extends Component {

  render() {

    let agent = this.props.agent;
    let recentCalls = agent.recentCalls;

    let ulStyle = {
      listStyleType: "none",
      margin: "0",
      border: "0",
      padding: "0",
      fontSize: "0.9rem"
    }

    let recentCallComponents = []
    for(let i = 0; i < recentCalls.length; i++) {
      let recentCall = recentCalls[i];
      recentCallComponents.push(
        <RecentCall key={recentCall.id} agent={this.props.agent} tabNames={this.props.tabNames} call={recentCall} phoneApi={this.props.phoneApi}/>
      );
    }

    var noRecentsStyle = {
      marginTop: "5px",
      width: "100%",
      textAlign: "center",
      padding: "40px",
      color: "darkslategray"
    };

    return (
      <div id="recent_calls">
        {
          recentCallComponents.length > 0 ? (
            <ul style={ulStyle}>
              {recentCallComponents}
            </ul>
          ) : (<div style={noRecentsStyle}> No Recent Calls </div>)
        }
      </div>
    )
  }
}

class RecentCall extends Component {

  handleMakeCall() {
    this.props.phoneApi.call(this.props.agent, this.props.call.otherParty);
    this.props.agent.currentTab = this.props.tabNames.HOME;
    window.rerender(this.props.agent);
  }

  render() {

    let phoneIconStyle = {
      float: "left",
      marginLeft: "10px",
      marginTop: "4px",
      fontSize: "14px",
      color: "rgb(100, 100, 100)"
    }
    let phoneIcon = <i style={phoneIconStyle} className="material-icons">call</i>

    let callIconStyle = {
      marginLeft: "0",
      marginTop: "4px",
      marginRight: "15px",
      fontSize: "14px",
      color: "rgb(100, 100, 100)"
    }
    let callIcon = <i style={callIconStyle}className="material-icons">call_received</i>
    if(this.props.call.direction === "outbound") {
      callIcon = <i style={callIconStyle} className="material-icons">call_made</i>
    }


    let callNumberStyle = {
      display: "inline-block",
      cursor: "pointer",
      verticalAlign: "top",
      marginTop: "3px",
      color: "rgb(36, 83, 199)"
    }

    let callNumber = (
      <div className={"recent-call-number"} style={callNumberStyle} onClick={this.handleMakeCall.bind(this)}>{this.props.call.otherParty}</div>
    )


    let callDateStyle = {
      display: "inline-block",
      marginLeft: "10px",
      verticalAlign: "top",
      marginTop: "3px",
      color: "rgb(120, 120, 120)"
    }
    let startedAtMoment = moment(this.props.call.startedAt)
    if(moment().diff(startedAtMoment) > 0) {
      startedAtMoment = startedAtMoment.format('h:mm a')
    } else {
      startedAtMoment = startedAtMoment.format('L')
    }
    let callDate = <div style={callDateStyle}>{startedAtMoment}</div>

    let callDurationStyle={
      display: "inline-block",
      marginLeft: "10px",
      verticalAlign: "top",
      marginTop: "3px",
      color: "rgb(120, 120, 120)"
    }

    let callDuration = moment.duration(this.props.call.duration)
    let hr = ""
    if(callDuration.hours() > 0) {
      hr = callDuration.hours() + "h ";
    }
    let min = ""
    if(callDuration.minutes() > 0) {
      min = callDuration.minutes() + "m "
    }
    let sec = ""
    if(callDuration.seconds() > 0 && callDuration.hours() === 0) {
      sec = callDuration.seconds() + "s"
    }

    callDuration = <div style={callDurationStyle}>{hr + min + sec}</div>



    let liStyle = {
      border: "0",
      borderBottom: "1px solid #cccccc",
      padding: "4px 0px"
    }

    return (

      <li style={liStyle}>{phoneIcon} {callIcon} {callNumber} {callDate} {callDuration}</li>
    )
  }
}

export default RecentCallsView;
