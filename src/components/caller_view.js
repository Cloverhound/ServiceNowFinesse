import React, { Component } from 'react';
import AnswerButton from './home/call_controls/answer_button'
import HoldButton from './home/call_controls/hold_button'
import ResumeButton from './home/call_controls/resume_button'
import HangupButton from './home/call_controls/hangup_button'
import moment from "moment";
import "moment-duration-format";

class CallerView extends Component {

  constructor() {
    super();

    this.state = { now: (new Date()) };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState({ now: (new Date()) });
    }, 500);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  handleIncidentClick(incident) {
    console.log("Clicked incident:", incident);
    this.props.pluginApi.popRecord('incident', incident.sys_id);
  }

  handleUserClick(user) {
    console.log("Clicked user:", user);
    this.props.pluginApi.popRecord('sys_user', user.sys_id);
  }

  render(){
      let agent = this.props.agent;
      if (agent.currentTab !== this.props.tabNames.CALLER) {
        return null;
      }

      let containerStyle = {
        height: 'calc(100% - 63px)',
      }

      let styles = {
        header: {
          padding: "8px 0px 8px 10px",
          //textAlign: "center",
          borderRadius: "4px",
          backgroundColor: "#fafafa",
          margin: "5px 5px 0px 5px",
          fontSize: "12px"
        },
        profileCard: {
          margin: "5px 10px"
        },
        photo: {
          container: {
            display: "inline-block"
          },
          image: {
            maxHeight: "100px",
            maxWidth: "100px"
          }
        },
        info: {
          container: {
            display: "inline-block",
            width: "calc(100% - 125px)",
            verticalAlign: "top",
              paddingTop: "8px",
              paddingLeft: "20px"
          },

          name: {
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "5px"
          },

          title: {
            fontSize: "14px",
            marginBottom: "10px"
          },

          field: {
           // marginTop: "2px"
          },

          label: {
            fontSize: "12px",
            color: "#666",
            width: "55px",
            display: "inline-block"
          },

          value: {
            marginLeft: "5px",
            fontSize: "12px"
          }
        },

        recents: {
          container: {
            margin: "5px 10px"
          },
          label: {
            padding: "5px 10px",
            verticalAlign: "middle",
            backgroundColor: "#fafafa",
            borderRadius: "4px 4px 0px 0px",
            width: "100%",
            display: "inline-block",
            fontSize: "12px"
          },
          table: {
            fontSize: "12px"
          }
        }
      };

      if (this.props.type == "snow") {
        containerStyle.height = 'calc(100% - 28px)';
      }

      if (Object.keys(agent.calls).length == 0) {
        return (
          <div style={containerStyle}>
            <div id="callerView" style={{height: "100%"}}>
              <div style={styles.header}>
                No current call
              </div>
            </div>
          </div>
        )
      }

      if (!agent.callerInfo || agent.callerInfo.result != 'found') {
        return (
          <div style={containerStyle}>
            <div id="callerView" style={{height: "100%"}}>
              <div style={styles.header}>
                User not found
              </div>
            </div>
          </div>
        )
      }

      let incidentRows = [];
      for (let i = 0; i < agent.callerInfo.user.incidents.length; i++) {
        let incident = agent.callerInfo.user.incidents[i];
        incidentRows.push(
          <div key={i} style={{marginTop: "1px", padding: "10px", backgroundColor: "#FFF"}} 
              className="clickable"
              onClick={this.handleIncidentClick.bind(this, incident)}>
            <div style={{width: "100%", verticalAlign: "top"}} >
              <div style={{fontWeight: "bold", display: "inline-block", width: "100px"}}>
                {incident.number}
              </div>
              <div style={{display: "inline-block", width: "70px"}}>
                {incident.state}
              </div>
            
              <div style={{color: "#666", display: "inline-block", fontSize: "10px", marginRight: "8px"}}>
                Opened:
              </div>
              <div style={{color: "#666", display: "inline-block", fontSize: "10px"}}>
                {incident.opened_at.substring(0, incident.opened_at.length - 3) }
              </div>
            </div>
            <div style={{width: "100%", marginTop: "2px"}}>
              <div style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                {incident.short_description}
              </div>
            </div>
          </div>
        );
      }

      let call = agent.calls[agent.lastPopped];

      let formattedCallTime = ''
      if (call) {
        let elapsedTime = this.state.now - call.startedAt;
        if (elapsedTime < 0) {
          elapsedTime = 0;
        }
        formattedCallTime = moment.duration(elapsedTime);
        formattedCallTime = '(' + formattedCallTime.format('mm:ss', { trim: false }) + ')';
      }

      return (
        <div style={containerStyle}>
          <div id="callerView" style={{height: "100%"}}>

            <div style={styles.header}>
              {(call && call.otherParty) || "Unknown Number"} {formattedCallTime}
              <AnswerButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <HangupButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <ResumeButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              <HoldButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
            </div>

            <div style={styles.profileCard}>
              <div style={styles.photo.container}>
                <img style={styles.photo.image}
                     src={ window.FinessePlugin.origin + "/" + agent.callerInfo.user.photo } 
                     className="clickable"
                     onClick={this.handleUserClick.bind(this, agent.callerInfo.user)}
                />
              </div>
              <div style={styles.info.container}>
                <div style={styles.info.name} 
                    className="clickable"
                    onClick={this.handleUserClick.bind(this, agent.callerInfo.user)}>
                  { agent.callerInfo.user.name }
                </div>
                <div style={styles.info.title}>
                  { agent.callerInfo.user.title } | { agent.callerInfo.user.department }
                </div>
                <div style={styles.info.field}>
                  <span style={styles.info.label}>
                    Business:
                  </span>
                  <span style={styles.info.value}>
                    { agent.callerInfo.user.phone }
                  </span>
                </div>
                <div style={styles.info.field}>
                  <span style={styles.info.label}>
                    Mobile:
                  </span>
                  <span style={styles.info.value}>
                    { agent.callerInfo.user.mobile_phone }
                  </span>
                </div>
              </div>
            </div>
            <div style={styles.recents.container}>            
              <span style={styles.recents.label}>Recent Incidents</span>
              <div style={styles.recents.table}>
                {incidentRows}
              </div>
            </div>
          
          </div>
        </div>
      )
  }
}

export default CallerView;
