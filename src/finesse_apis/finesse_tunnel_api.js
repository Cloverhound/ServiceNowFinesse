
const FinesseTunnelApi = {
  connect: connect,
  disconnect: disconnect
}

var MESSAGE_TYPE = {
  EVENT: 0,
  ID: 1,
  PASSWORD: 2,
  RESOURCEID: 3,
  STATUS: 4,
  XMPPDOMAIN: 5,
  PUBSUBDOMAIN: 6,
  SUBSCRIBE: 7,
  UNSUBSCRIBE: 8,
  PRESENCE: 9,
  CONNECT_REQ: 10,
  DISCONNECT_REQ: 11
};

function connect(agent) {
  console.log("Connecting iframe with username: " + agent.username + " and password: " + agent.password)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + agent.username, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + agent.password, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + window.finesseHostname, "*");
}

function disconnect(agent) {
  console.log("Disconnecting iframe with username: " + agent.username)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.DISCONNECT_REQ + "|" + agent.username, "*");
}

export default FinesseTunnelApi;
