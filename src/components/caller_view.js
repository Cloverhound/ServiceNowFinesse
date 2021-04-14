import React, { Component } from 'react';
import AnswerButton from './home/call_controls/answer_button'
import HoldButton from './home/call_controls/hold_button'
import ResumeButton from './home/call_controls/resume_button'
import HangupButton from './home/call_controls/hangup_button'
import moment from "moment";
import "moment-duration-format";

class CallerView extends Component {

  constructor(props) {
    super(props);

    let htmlUrl = null;
    let agent = props.agent || {};
    if (agent.callerInfo && agent.callerInfo.html) {
        // Repoint image URL to ServiceNow base URL
        let html = agent.callerInfo.html.replace(/src="\/([^\.]+)\.iix"/, 'src="' + props.origin + '/$1.iix"');
        htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    }

    this.state = { 
      now: (new Date()),
      htmlUrl: htmlUrl
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState({ now: (new Date()) });
    }, 500);
  }
  
  /** 
   * We only want to generate a URL for our dynamic HTML once for each new HTML string
   *  This method if the HTML is set and changed and updates the URL if so
   */
  componentDidUpdate() {
    let agent = this.props.agent || {};
    if (!agent.callerInfo || !agent.callerInfo.html) {
      return;
    }

    if (agent.callerInfo.html && (this.originalHtml != agent.callerInfo.html
      || !this.state.htmlUrl)) {
        // Repoint image URL to ServiceNow base URL
        let html = agent.callerInfo.html.replace(/src="\/([^\.]+)\.iix"/, 'src="' + this.props.origin + '/$1.iix"');
        let url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        console.log("Updating caller info with HTML:", url, html);
        this.originalHtml = agent.callerInfo.html;
        this.setState({
          htmlUrl: url,
          html: html,
          originalHtml: agent.callerInfo.html
        });
    }
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

      let containerStyle = {
        height: 'calc(100% - 63px)',
      }
      if (agent.currentTab !== this.props.tabNames.CALLER) {
        containerStyle.display = 'none';
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
        iframe: {
          border: 'none',
          width: '100%',
          height: '100%'
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

      let call = null;
      for (let callId in agent.calls) {
        if (agent.calls[callId] && agent.calls[callId].line == 1) {
          call = agent.calls[callId];
        }
      }
      
      if (!call || !agent.callerInfo || agent.callerInfo.result != 'found') {
        return (
          <div style={containerStyle}>
            <div id="callerView" style={{height: "100%"}}>
              <div style={styles.header}>
                User not found
                <AnswerButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
                <HangupButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
                <ResumeButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
                <HoldButton call={call} agent={agent} phoneApi={this.props.phoneApi}/>
              </div>
            </div>
          </div>
        )
      }

      let formattedCallTime = ''
      if (call) {
        let elapsedTime = this.state.now - call.startedAt;
        if (elapsedTime < 0) {
          elapsedTime = 0;
        }
        formattedCallTime = moment.duration(elapsedTime);
        formattedCallTime = '(' + formattedCallTime.format('mm:ss', { trim: false }) + ')';
      }

      let viewUrl = "";
      if (agent.callerInfo.html && this.state.htmlUrl) {        
        viewUrl = this.state.htmlUrl;
      } else if (!agent.callerInfo.html) {
        viewUrl = this.props.config.callerInfoViewUrl || 'x_clove_finesse_finesse_caller_view.do';
        viewUrl = this.props.origin + "/" + viewUrl + "?sysparm_nostack=true&data=" + encodeURIComponent(encodeURIComponent(JSON.stringify(call)));
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

            <iframe id="callerInfoFrame" style={styles.iframe}
              src={viewUrl}>
            </iframe>
          
          </div>
        </div>
      )
  }
}

export default CallerView;
