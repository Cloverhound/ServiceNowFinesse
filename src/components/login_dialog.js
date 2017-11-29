import React, { Component } from 'react';
var Loader = require('halogen/PulseLoader');

class LoginDialog extends Component {

  constructor() {
    super();
    this.state = { "loading": false};
  }

  handleLogin(event) {
    this.props.handleLogin(event);
  }

  render() {
    let errorTextStyle = {
      color: "red",
      margin: 0
    };

    let submitButtonStyle = {
        border: "2px solid #333",
        borderRadius: "25px",
        backgroundColor: "transparent",
        margin: "0px",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: "bold"
    };

    var loaderStyle = {
      margin: "0px",
      marginTop: "17px",
      marginBottom: "5px"
    };

    if(!this.props.loading) {
      loaderStyle.visibility = "hidden";
    }

    if(this.props.previousLoginFailed && !this.props.loading) {
      console.log("Previous login failed, setting margin top...");
      submitButtonStyle.marginTop = "25px";
      loaderStyle.display = "none";
    }


    return (
      <div id="login-section" className="login-section">
        <form id="login-form" className="login-form" onSubmit={this.handleLogin.bind(this)}>
          <input placeholder="username" type="text" name="username"></input>
          <input placeholder="password" type="password" name="password"></input>
          <input placeholder="extension" type="text" name="extension"></input>

          {
            this.props.previousLoginFailed  && !this.props.loading ? (
              <div id="loginErrorText" style={errorTextStyle}>
                {this.props.previousLoginFailed.reason}
              </div>
            ) : null
          }

          <div id="loaderDiv" style={loaderStyle}>
            <Loader color="#39C1A6" size="16px" margin="5px"/>
          </div>

          <input type="submit" value="Login" style={submitButtonStyle}></input>
        </form>
      </div>
    );
  }
}

export default LoginDialog;
