
const FinesseTunnelApi = {
  connect: connect,
  disconnect: disconnect,
  state: "disconnected"
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
  console.log("Connecting iframe with username: " + agent.username)

  FinesseTunnelApi.state = "connecting";

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.RESOURCEID + "|" + "snow", "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + agent.username, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + window.Finesse.password, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + window.finesseHostname, "*");
}

function disconnect(agent) {
  console.log("Disconnecting iframe with username: " + agent.username)

  FinesseTunnelApi.state = "disconnecting";

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.DISCONNECT_REQ + "|" + agent.username, "*");
}

export default FinesseTunnelApi;
