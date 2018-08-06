import React, { Component } from 'react';


class ScreenPopButton extends Component {

  render() {
    var call = this.props.call;
    var enableManualScreenPop = window.OpenFrame.config.enableManualScreenPop

    let style = {
      transform: 'rotate(180deg)',
      color: 'rgb(99, 149, 226)',
      marginRight: '2px',
      fontSize: '15px'
    }

    if(call.state !== "ALERTING" && enableManualScreenPop) {
      return <a style={{float: 'left'}} onClick={this.props.snowApi.screenPop.bind(null, call)}>
              <span style={style} className="material-icons">
                exit_to_app
              </span>
            </a>
            
    } else {
      return null;
    }
  }
}

export default ScreenPopButton;