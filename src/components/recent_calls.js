import React, { Component } from 'react';

class RecentCallsView extends Component {
  render(){
      let tabNames = this.props.tabNames;
      if(this.props.currentTab !== tabNames.RECENTS) {
        return null;
      }

      return (
        <RecentCalls recentCalls={this.props.recentCalls} phoneApi={this.props.phoneApi}/>
      )
  }
}

class RecentCalls extends Component {

  render() {

    let ulStyle = {
      listStyleType: "none",
      border: "1px solid gray"
    }

    let recentCallComponents = []
    for(let i = 0; i < this.props.recentCalls.length; i++) {
      let recentCall = this.props.recentCalls[i];
      recentCallComponents.push(
        <RecentCall call={recentCall} phoneApi={this.props.phoneApi}/>
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
    this.props.phoneApi.call(this.props.call.otherParty);
  }

  render() {

    let liStyle = {
      border: "1px solid gray"
    }

    let callButtonStyle = {
      display: "inline-block",
      marginLeft: "60px"
    }

    let callButton = (
      <div style={callButtonStyle} onClick={this.handleMakeCall.bind(this)}>
        Call
      </div>
    )
    return (
      <li style={liStyle}>{this.props.call.otherParty} {callButton}</li>
    )
  }
}

export default RecentCallsView;
