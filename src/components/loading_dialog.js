import React, { Component } from 'react';
//var Loader = require('halogen/PulseLoader');
import { PulseLoader } from 'react-spinners';

export default class LoadingDialog extends Component {

  render() {

    return (
      <div id="loadingDiv" style={{
        margin: 'auto',
        width: '125px',
        marginTop: 'calc(50vh - 50px)',
        fontSize: '1.5em',
        fontWeight: 'bold'
      }}>
        <span>Loading</span>
        <div style={{
          margin: '15px 6px'
        }}>
          <PulseLoader color="#39C1A6" width={116} margin="5px"/>
        </div>
      </div>
    );
  }

}

