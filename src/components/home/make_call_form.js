import React, { Component } from 'react';


class MakeCallForm extends Component {

  constructor() {
    super();

    this.state = { value: '' };
  }

  handleMakeCall() {
    let agent = this.props.agent;
    let calls = agent.calls;
    console.log("Handling make call...");
    if(Object.keys(calls).length === 1) {
      this.props.phoneApi.consult(agent, this.state.value);
    } else {
      this.props.phoneApi.call(agent, this.state.value);
    }
    this.setState({value: ''});
  }

  handleChange(event) {
    console.log("Handling change, setting state to: ", event.target.value);
    this.setState({value: event.target.value});
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
          <form>
            <input onChange={this.handleChange.bind(this)}
              id="dial_num" type="tel" placeholder="Enter a Number to Dial"
              value={this.state.value}
              onKeyPress={this._handleKeyPress.bind(this)}
            />
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
