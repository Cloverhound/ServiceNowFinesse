import React, { Component } from 'react';
import Finesse from '../../finesse_apis/finesse_api';

class MakeCallForm extends Component {

  handleMakeCall() {
    console.log("Make call control making call.");

    let agent = this.props.agent;
    let calls = agent.calls;
    
    if(Object.keys(calls).length === 1) {
      this.props.phoneApi.consult(agent, this.props.digits);
    } else {
      this.props.phoneApi.call(agent, this.props.digits);
    }
    
    Finesse.agent.currentTab = Finesse.tabNames.HOME;
    window.MainApp.updateDigits("");
  }

  handleChange(event) {
    //this.setState({value: event.target.value});
    window.MainApp.updateDigits(event.target.value);
  }

  clear() {
    console.log("Make call clear button clicked, clearing.");
    window.MainApp.updateDigits("");
  }

  _handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleMakeCall();
    }
  }

  render() {
    let calls = this.props.agent.calls;
    let callIds = Object.keys(calls);

    var callButtonText = "CALL";
    if(callIds.length > 0) {
      callButtonText = "ADD";
    }

    if(callIds.length === 0 || (callIds.length === 1 && !calls[callIds[0]].held) ) {
      return (
        <div className="tab-content make-call" data-structure="make-call"
          style={{
            display: 'block',
            position: 'absolute',
            width: '100%',
            bottom: '5px'
          }}
        >
          <form className="make-call-form">
            <input onChange={this.handleChange.bind(this)}
              id="dial_num" type="tel" placeholder="Number to Dial"
              value={this.props.digits}
              onKeyPress={this._handleKeyPress.bind(this)}
            />
            <a className="make-call-clear" onClick={this.clear.bind(this)}>
              <i className="fa fa-times" aria-hidden="true"></i>
            </a>
            <a onClick={this.handleMakeCall.bind(this)} className="cta hybrid">
              <i className="fa fa-phone" aria-hidden="true"></i>
                <span>{callButtonText}</span>
            </a>
          </form>
        </div>
      )
    } else {
      return null;
    }
  }
}


export default MakeCallForm;
