import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import $ from "jquery";


class Tabs extends Component {

  onHomeClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("running onhome click...");
    agent.currentTab = tabNames.HOME;
    this.props.rerender(agent);
  }

  onRecentsClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("running onrecents click...");
    agent.currentTab = tabNames.RECENTS;
    this.props.rerender(agent);
  }

  render() {
    let tabNames = this.props.tabNames;

    var tabBarStyle = {
      position: "absolute",
      bottom: "0px",
      width: "100%",
      background: "whitesmoke",
      cursor: "pointer"
    };

    var tabStyle = {
      display: "inline-block",
      borderTop: "2px solid rgb(230, 230, 230)",
      width: "50%",
      color: "rgb(200, 200, 200)",
      textAlign: "center",
      fontSize: "smaller",
      padding: "5px"
    }

    var tabTextStyle = {
      fontSize: "8px",
      display: "none"
    }

    var homeStyle = $.extend(true, {

    }, tabStyle);
    var recentsStyle = $.extend(true, {}, tabStyle);

    //homeStyle.borderRight = "1px solid gray";

    if(this.props.agent.currentTab === tabNames.HOME) {
      homeStyle.color = "rgb(54, 125, 236)";
      homeStyle.borderColor = "rgb(99, 149, 226)";
      //recentsStyle.background = "linear-gradient(rgb(249, 249, 249), rgb(250, 250, 250) 40%, white 95%)"
    } else {
      recentsStyle.color = "rgb(54, 125, 236)";
      recentsStyle.borderColor = "rgb(99, 149, 226)";
      //homeStyle.background = "linear-gradient(rgb(249, 249, 249), rgb(250, 250, 250) 40%, white 95%)"
    }

    return (
      <div style={tabBarStyle} className="tabbar">
        <div style={homeStyle} className="tab home" onClick={this.onHomeClick.bind(this)}>
          <FontAwesome name='home' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Home</div>
        </div>
        <div style={recentsStyle} className="tab recents" onClick={this.onRecentsClick.bind(this)}>
          <FontAwesome name='clock-o' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Recents</div>
        </div>
      </div>
    );
  }

}

export default Tabs;
