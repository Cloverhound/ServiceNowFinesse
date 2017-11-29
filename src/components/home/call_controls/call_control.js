import React, { Component } from 'react';
import $ from "jquery";

function playInboundRingingMusic() {
  console.log("Playing inbound ringing music...");
  $('#ringtone').trigger('play');
}
function stopInboundRingingMusic() {
  console.log("Stopping inbound ringing music...");
  $('#ringtone').trigger('pause');
}


class CallControlButton extends Component {
  render() {
    let icon = "";
    if(this.props.dontUseSvg) {
      icon = this.props.icon;
    } else {
      icon = <SvgIcon name={this.props.icon} />
    }
    return (
      <a className="round-button" id={this.props.type + "-but"} onClick={this.props.function}>
        <span className={"icon-container " + this.props.type}>
          {icon}
        </span>
      </a>
    )
  }

  componentDidMount() {
    if(this.props.type === "answer") {
      playInboundRingingMusic();
    }
  }

  componentWillUnmount() {
    if(this.props.type === "answer") {
      stopInboundRingingMusic();
    }
  }
}


function SvgIcon(props) {
  return <svg dangerouslySetInnerHTML={{__html: '<use xlink:href="#' + props.name + '"/>' }} />;
}

export default CallControlButton;
