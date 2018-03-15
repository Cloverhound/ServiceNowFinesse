import React, { Component } from 'react';
import MakeCallForm from './make_call_form';
import moment from "moment";

class DialpadView extends Component {

  addDigit(digit) {
    console.log("Clicked dialpad digit:", digit);

    let call = this.props.phoneApi.getActiveCall(this.props.agent);
    if (call) {
      this.props.phoneApi.sendDtmf(digit, this.props.agent, call);
    }

    window.MainApp.addDigit(digit);
  }

  render(){
      let tabNames = this.props.tabNames;
      if(this.props.agent.currentTab !== tabNames.DIALPAD) {
        return null;
      }

      let calls = this.props.agent.calls;
      let callsActive = (Object.keys(calls).length > 0);

      return (
        <div style={{
          maxWidth: '500px',
          position: 'relative',
          height: 'calc(100% - 71px)',
          margin: 'auto',
          padding: '10px 20px',
        }}>
        <div className="dial-pad">
                          <a onClick={this.addDigit.bind(this, '1')}>
                            <span>1</span>
                            <span style={{display: 'block', visibility: 'hidden', fontSize: '0.5rem'}}>
                                X X X
                            </span>
                          </a>
                          <a onClick={this.addDigit.bind(this, '2')}>
                            <span>2</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                                A B C
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '3')}>
                            <span>3</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                                D E F
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '4')}>
                            <span>4</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              G H I
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '5')}>
                            <span>5</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              J K L
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '6')}>
                            <span>6</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              M N O
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '7')}>
                            <span>7</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              P Q R S
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '8')}>
                            <span>8</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              T U V
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '9')}>
                            <span>9</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                               W X Y Z
                            </span>
                        </a>
                        <a onClick={this.addDigit.bind(this, '*')} style={{
                          paddingTop: "12px",
                          paddingBottom: "6px",
                          fontSize: "1.8rem"
                        }}>
                            <span>*</span>
                       
                        </a>
                          <a onClick={this.addDigit.bind(this, '0')}>
                            <span>0</span>
                            <span style={{display: 'block', fontSize: '0.5rem'}}>
                              +
                            </span>
                        </a>
                          <a onClick={this.addDigit.bind(this, '#')} style={{
                            paddingTop: "12px",
                            paddingBottom: "14px"
                          }}>
                            <span>#</span>
                            
                        </a>
                        </div>
<div id="myDiv" style={{position: 'relative', height: 'calc(100% - 217px'}}>
   <MakeCallForm agent={this.props.agent} digits={this.props.digits} phoneApi={this.props.phoneApi}/>
</div>
</div>
      )
  }
}

export default DialpadView;
