import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import $ from "jquery";

import dialpad from "../ic_dialpad_48px.svg";

class DialpadIcon extends Component {
 render() {
   return (
      <svg xmlns="http://www.w3.org/2000/svg" style={this.props.style} width="48" height="48" viewBox="0 0 48 48">
        <path d="M24 38c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zM12 2C9.79 2 8 3.79 8 6s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm24-16c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM24 26c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm12 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-12 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
      </svg>
   );
}
}

class Tabs extends Component {

  onHomeClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("User clicked Home tab.");
    agent.currentTab = tabNames.HOME;
    this.props.rerender(agent);
  }

  onDialpadClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("User clicked Dialpad tab.");
    agent.currentTab = tabNames.DIALPAD;
    this.props.rerender(agent);
  }

  onRecentsClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("User clicked Recents tab.");
    agent.currentTab = tabNames.RECENTS;
    this.props.rerender(agent);
  }

  render() {
    let tabNames = this.props.tabNames;

    var tabBarStyle = {
      position: "absolute",
      bottom: "0px",
      width: "100%",
      background: "#FFF",
      cursor: "pointer"
    };

    var tabStyle = {
      display: "inline-block",
      borderTop: "2px solid rgb(230, 230, 230)",
      width: "33.3333%",
      fill: "rgb(200, 200, 200)",
      color: "rgb(200, 200, 200)",
      textAlign: "center",
      fontSize: "smaller",
      padding: "5px"
    }

    var dialpadTabStyle = {
      display: "inline-block",
      borderTop: "2px solid rgb(230, 230, 230)",
      width: "33.3333%",
      fill: "rgb(200, 200, 200)",
      color: "rgb(200, 200, 200)",
      textAlign: "center",
      fontSize: "smaller",
      paddingTop: "5px"
    }

    var selectedTabStyle = {
      fill: "rgb(50, 121, 231)",
      color: "rgb(54, 125, 236)",
      borderColor: "rgb(99, 149, 226)"
    }

    var dialpadIconStyle = {
      marginBottom: "-3px",
      height: "15px"
    }

    var tabTextStyle = {
      fontSize: "8px",
      display: "none"
    }

    var homeStyle = $.extend(true, {}, tabStyle);
    var recentsStyle = $.extend(true, {}, tabStyle);

    //homeStyle.borderRight = "1px solid gray";

    if(this.props.agent.currentTab === tabNames.HOME) {
      homeStyle.color = "rgb(54, 125, 236)";
      homeStyle.borderColor = "rgb(99, 149, 226)";
      //recentsStyle.background = "linear-gradient(rgb(249, 249, 249), rgb(250, 250, 250) 40%, white 95%)"
    } else if (this.props.agent.currentTab === tabNames.DIALPAD) {
      dialpadTabStyle = $.extend(true, dialpadTabStyle, selectedTabStyle);
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
        <div style={dialpadTabStyle} className="tab dialpad" onClick={this.onDialpadClick.bind(this)}>
        <DialpadIcon style={dialpadIconStyle} alt="dialpad" />
          <div style={tabTextStyle} className="tab-text">Dialpad</div>
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
