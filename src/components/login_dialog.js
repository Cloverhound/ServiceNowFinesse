import React, { Component } from 'react';
//var Loader = require('halogen/PulseLoader');
import { PulseLoader } from 'react-spinners';

class LoginDialog extends Component {

  constructor() {
    super();
    this.state = { 
      loading: false,
      showMobileAgent: false
    };
    this.toggleShowMobileAgent = this.toggleShowMobileAgent.bind(this);
  }

  handleLogin(event) {
    this.props.handleLogin(event);
  }

  toggleShowMobileAgent() {
    this.setState({
      showMobileAgent: !this.state.showMobileAgent
    });
  }

  render() {
    let errorTextStyle = {
      color: "red",
      margin: 0
    };

    let submitButtonStyle = {
        border: "none",  
      //border: "2px solid #333",
        borderRadius: "25px",
        backgroundColor: "#4b7fde",
        color: "#FFF",
        //backgroundColor: "transparent",
        margin: "0px",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: "bold"
    };

    var loaderStyle = {
      margin: "17px 11px 5px 11px"
    };

    if(!this.props.loading) {
      loaderStyle.visibility = "hidden";
    }

    if(this.props.previousLoginFailed && !this.props.loading) {
      console.log("Previous login failed, setting margin top...");
      submitButtonStyle.marginTop = "22px";
      loaderStyle.display = "none";
    }


    return (
      <div id="login-section" className="login-section">
        

        <form id="login-form" className="login-form" onSubmit={this.handleLogin.bind(this)}>
          <input placeholder="username" type="text" name="username"></input>
          <input placeholder="password" type="password" name="password"></input>
          <input placeholder="extension" type="text" name="extension"></input>

          { this.props.mobileAgentEnabled ?
            <div style={{margin: 0}}>
              <input
                style={{width: '1em', display: 'inline-block', marginRight: '6px'}}
                name="mobileAgentEnabled"
                type="checkbox"
                checked={this.state.showMobileAgent}
                onChange={this.toggleShowMobileAgent} />
              <label>Mobile Agent</label>
            </div>
          : null}

          { this.state.showMobileAgent ?
            <div style={{margin: 0}}>
              <select placeholder="mode" type="text" name="mobileAgentMode" 
                  style={{width: '175px', padding: '7px'}}>
                <option value="CALL_BY_CALL">Call by Call</option>
                <option value="NAILED_CONNECTION">Nailed Connection</option>
              </select>

              <input placeholder="dialed number" type="text" name="mobileAgentDialedNumber"></input>
            </div>
          : null}

          {
            this.props.previousLoginFailed  && !this.props.loading ? (
              <div id="loginErrorText" style={errorTextStyle}>
                {this.props.previousLoginFailed.reason}
              </div>
            ) : null
          }

          <div id="loaderDiv" style={loaderStyle}>
            <PulseLoader color="#39C1A6" width={116} margin="5px"/>
          </div>

          <input type="submit" value="Login" style={submitButtonStyle}></input>

         
        </form>
      </div>
    );
  }
}

export default LoginDialog;
