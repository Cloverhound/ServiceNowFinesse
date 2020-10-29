var ctiContainer = document.getElementById('ctiContainer');
var finesseFrame = document.getElementById('finesseFrame');
var openFrameConfig = {};
var agent = null;
var pendingConfig = false;
var currentRecord = null;
var currentCall = null;
var lastState = "LOGOUT";

function updateCallerView(call) {
	call = call || {};
	//document.getElementById("callerViewFrame").src = "x_clove_finesse_finesse_caller_view.do?data=" + encodeURIComponent(encodeURIComponent(JSON.stringify(call)));
}

function showCallerView() {
	//document.getElementById("callerViewFrame").style.display = "block";
}

function hideCallerView() {
	//document.getElementById("callerViewFrame").style.display = "none";
}

window.addEventListener("message", receiveMessage, false);

window.addEventListener("beforeunload", function (e) {
	if (!lastState || lastState == "LOGOUT") {
		return;
	}

    var confirmationMessage = 'You are still logged in to Finesse. '
                            + 'Please logout before closing or refreshign the page.';

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});

function receiveMessage(event) {
	try {
		jslog(JSON.parse(event.data));
		parsedJSON = JSON.parse(event.data);

		if (parsedJSON.eventName == "openframe_awa_agent_presence") {
			handleWorkspaceStateChange(parsedJSON.args);
		}
	}catch(e) {
		jslog("JSON parse failed");
	}


	if (!event.data.type) return;

	switch (event.data.type) {
		case 'readyForConfig':
			if (!openFrameAPI.Initialized) {
				pendingConfig = true;
				return;
			}

			sendConfigToPlugin();

			break;
		case 'screenPop':
			handleScreenPop(event.data.popData);
			break;
		case 'popRecord':
			handlePopRecord(event.data.record);
			break;
		case 'show':
			window.openFrameAPI.show();
			break;
		case 'hide':
			window.openFrameAPI.hide();
			break;
		case 'stateUpdated':
			handleStateChange(event.data.state);
			break;
		case 'callStarted':
			jslog("Finesse Plugin: call started event: " +  JSON.stringify(event.data.call));
			updateUserProfile(event.data.call);
			break;
		case 'callUpdated':
			jslog("Finesse Plugin: call updated event: " +  JSON.stringify(event.data.call));
			updateUserProfile(event.data.call);
			break;
		case 'callEnded':
			jslog("Finesse Plugin: call ended event: " +  JSON.stringify(event.data.call));
			if (currentCall && currentCall.id == event.data.call.id) {
				if (openFrameConfig.customCallEndClass) {
					getCustomScreenPopForCall(currentCall, openFrameConfig.customCallEndClass, openFrameConfig.customCallEndFunction, function(){});
				}

				currentCall = null;
				updateCallerView();
				hideCallerView();
			}
			logCallEnded(event.data.call);
			break;
		case 'tabShown':
			if (event.data.name == 2 && currentCall) {
				showCallerView();
			} else {
				hideCallerView();
			}
			break;
		case 'listContacts':
			searchUsers(event.data.search);
			break;
	}
}

function updateUserProfile(call) {
	call = call || {};

	if (call.line != 1) {
		return;
	}
	if (!call.otherParty) {
		currentCall = call;
		return;
	}
	if (currentCall && currentCall.otherParty == call.otherParty) {
		currentCall = call;
		return;
	}

	currentCall = call;
	showUserProfile(call);
}

function handleWorkspaceStateChange(args) {
	switch (args.result.presence.name) {
		case 'Available':
			openFrameAPI.setPresenceIndicator('Available', 'green');
			break;
		case 'On Call':
			openFrameAPI.setPresenceIndicator('Away', 'orange');
			break;
		case 'Away':
			openFrameAPI.setPresenceIndicator('Away', 'orange');
			break;
		case 'Offline':
			openFrameAPI.setPresenceIndicator('Away', 'grey');
			break;
		default:
			openFrameAPI.setPresenceIndicator('Away', 'orange');
	}
	finesseFrame.contentWindow.postMessage({
			type: 'workspaceStateUpdated',
			variables: args
		}, '*');
}

function setWorkspaceState(state) {
	switch (state) {
		case "available":
			var ga = new GlideAjax("x_clove_finesse.WorkspacePresenceAPI");
			ga.addParam("sysparm_name","setPresence");
			ga.addParam("sysparm_type", "available");
			ga.addParam("sysparm_userID", g_user.userID);
			ga.addParam("sysparm_presenceSysId", openFrameConfig.availableSysId);
			ga.addParam("sysparm_channelId", openFrameConfig.monitoredAvailableChannel);
			ga.getXML(function(res) {
				var resString = (new XMLSerializer()).serializeToString(res.responseXML);
				jslog("Workspace API response.. " + resString);
			});
			break;
		case "away":
			var ga2 = new GlideAjax("x_clove_finesse.WorkspacePresenceAPI");
			ga2.addParam("sysparm_name","setPresence");
			ga2.addParam("sysparm_type", "away");
			ga2.addParam("sysparm_userID", g_user.userID);
			ga2.addParam("sysparm_presenceSysId", openFrameConfig.awaySysId);
			ga2.addParam("sysparm_channelId", "");
			ga2.getXML(function(res) {
				var resString = (new XMLSerializer()).serializeToString(res.responseXML);
				jslog("Workspace API response.. " + resString);
			});
			break;
	}
}

function handleStateChange(state) {
	lastState = state;

	if (!state || !openFrameAPI.setPresenceIndicator) {
		return;
	}

	switch (state) {
		case 'READY':
			openFrameAPI.setPresenceIndicator('Available', 'green');
			setWorkspaceState("available");
			break;
		case 'NOT_READY':
			openFrameAPI.setPresenceIndicator('Away', 'red');
			setWorkspaceState("away");
			break;
		case 'LOGOUT':
		case '':
		case null:
		case undefined:
			openFrameAPI.setPresenceIndicator('Offline', 'grey');
			break;
		default:
			openFrameAPI.setPresenceIndicator('Away', 'orange');
	}
}

function handlePopRecord(record) {
	var popType = "current_window";
	if (openFrameConfig.recordPopType) {
		popType = openFrameConfig.recordPopType;
	} else if (openFrameConfig.manualPopType) {
		popType = openFrameConfig.manualPopType;
	} else if (openFrameConfig.popType) {
		popType = openFrameConfig.popType;
	}

	jslog("Finesse Plugin: Popping record via: " + popType + " - " + JSON.stringify(record));

	switch (popType) {
		case "new_window":
			// open in new window with nav
			window.open('/nav_to.do?uri=/' + record.type + '.do?sys_id=' + record.id);
			break;
		case "new_window_no_nav":
			// open in new window on its own
			window.open('/' + record.type + '.do?sys_id=' + record.id);
			break;
		default:
			// open in current window
			openFrameAPI.openServiceNowForm({ entity: record.type, query: "sys_id=" + record.id });
			break;
	}

}

function handleScreenPop(popData) {
	var query = openFrameConfig.query;
	var entity = openFrameConfig.entity;

	var call = popData.call;
	var agent = popData.agent;

	if ((!openFrameConfig.popOnDirectInbound && call.callType == "OTHER_IN") ||
		(!openFrameConfig.popOnDirectOutbound && call.callType == "OUT")) {
		jslog("Finesse Plugin: Not an ACD call, ignoring pop");
		return;
	}

	var callVariables = Object.entries(popData.call.callVariables);
	for (var i = 0; i < callVariables.length; i++) {
		var name = callVariables[i][0];
		var value = callVariables[i][1];

		query = query.replace("{{" + name + "}}", value);
		entity = entity.replace("{{" + name + "}}", value);
	}

	query = query.replace("{{from}}", encodeURIComponent(call.from));
	entity = entity.replace("{{from}}", encodeURIComponent(call.from));

	query = query.replace("{{to}}", encodeURIComponent(call.to));
	entity = entity.replace("{{to}}", encodeURIComponent(call.to));

	query = query.replace("{{direction}}", encodeURIComponent(call.direction));
	entity = entity.replace("{{direction}}", encodeURIComponent(call.direction));

	query = query.replace("{{username}}", encodeURIComponent(agent.username));
	entity = entity.replace("{{username}}", encodeURIComponent(agent.username));

	query = query.replace("{{extension}}", encodeURIComponent(agent.extension));
	entity = entity.replace("{{extension}}", encodeURIComponent(agent.extension));

	var popType = "current_window";
	if (popData.manual && openFrameConfig.manualPopType) {
		popType = openFrameConfig.manualPopType;
	} else if (openFrameConfig.popType && openFrameConfig.popType != "") {
		popType = openFrameConfig.popType;
	}

	if (openFrameConfig.customScreenPopClass) {
		getCustomScreenPopForCall(call, openFrameConfig.customScreenPopClass, openFrameConfig.customScreenPopFunction, function (customData) {
			finishScreenPop(popData, customData.entity, customData.query, popType, customData.context);
		});
	} else {
		finishScreenPop(popData, entity, query, popType);
	}

}

function finishScreenPop(popData, entity, query, popType, context) {
	jslog("Finesse Plugin: Screen popping: " + entity + " - " + query + " - via " + popType);

	switch (popType) {
		case "new_window":
			// open in new window with nav
			window.open('/nav_to.do?uri=/' + entity + '.do?' + query);
			break;
		case "new_window_no_nav":
			// open in new window on its own
			window.open('/' + entity + '.do?' + query);
			break;
		default:
			// open in current window
			openFrameAPI.openServiceNowForm({ entity: entity, query: query });
			break;
	}

	if (popData.manual) { return; }

	var call = popData.call;
	if (context) {
		call.context = context;
	}
	if (context && context.callData) {
		finesseFrame.contentWindow.postMessage({
			type: 'updateCallData',
			variables: context.callData,
			callId: call.id
		}, '*');
	}

	//currentCall = call;
}

function showUserProfile(call) {
	jslog("Finesse Plugin: Showing user profile for:" + call.otherParty);
	findUserByPhone(call.otherParty, function(info) {
		sendCallerInfoToFinesse(info, call);
	});
}

function sendConfigToPlugin() {
	finesseFrame.contentWindow.postMessage({
		type: 'config',
		config: openFrameConfig,
		origin: window.location.origin
	}, '*');
}

function logCallEnded(call) {
	try{
		var user = findUserByPhone(call.otherParty, function(userInfo) {
			jslog("Found user for call that ended: " +  JSON.stringify(userInfo));

			var taskId = null;
			if (currentRecord && currentRecord.type == 'new_call') {
				jslog("Looking up new call: " + JSON.stringify(currentRecord));
				var gr = new GlideRecord('new_call');
				gr.get(currentRecord.sys_id);
				taskId = gr.transferred_to && gr.transferred_to.toString();
				jslog("Found task: " + taskId);
			} else if (currentRecord) {
				jslog("Using current record for phone log: " + JSON.stringify(currentRecord));
				taskId = currentRecord.sys_id;
			}

			var startedAt = new Date(call.startedAt);
			var endedAt = new Date(call.endedAt);

			var ga = new GlideAjax("x_clove_finesse.FinesseCallLogger");
			ga.addParam("sysparm_name", "logPhoneCall");
			ga.addParam("sysparm_data", JSON.stringify({
				call_id: call.id,
				phone_number: call.otherParty,
				agent: g_user.userID,
				duration: call.duration,
				start_time: formatDate(startedAt),
				end_time: formatDate(endedAt),
				call_type: call.direction == "outbound" ? "outgoing" : "incoming",
				contact: userInfo.user ? userInfo.user.sys_id : null,
				task: taskId
			}));

			currentRecord = null;

			ga.getXML(function(res) {
				var resString = (new XMLSerializer()).serializeToString(res.responseXML);
				jslog("Finesse Plugin: logPhoneCall response: " + resString);
			});
		});


	} catch (err) {
		jslog("Finesse Plugin: ERROR - exception logging call end - " + err.toString());
		console.error("Finesse Plugin: ERROR - exception logging call end - ", err);
	}
}

function formatDate(datetime) {
	return datetime.getUTCFullYear() + "-" + leftPadOneZero(datetime.getUTCMonth() + 1) + "-" + leftPadOneZero(datetime.getUTCDate()) + " " + leftPadOneZero(datetime.getUTCHours()) + ":" + leftPadOneZero(datetime.getUTCMinutes()) + ":" + leftPadOneZero(datetime.getUTCSeconds());
}

function leftPadOneZero(n){
  if(n <= 9){
    return "0" + n;
  }
  return n;
}

function getCustomScreenPopForCall(call, scriptClass, functionName, cb) {

	var ga = new GlideAjax(scriptClass);
	ga.addParam("sysparm_name", functionName);
	ga.addParam("sysparm_call", JSON.stringify(call));

	// submit request to server, call ajaxResponse function with server response
	ga.getXML(function(res) {
		var message = res.responseXML.documentElement.getAttribute('answer');
		jslog("Finesse Plugin: Get custom screenpop for call result: " + message);
		cb(JSON.parse(message));
	});
}

function findUserByPhone(phone, cb) {
	var findUserClass = openFrameConfig.customFindUserClass || "x_clove_finesse.FinesseDataReader";
	var findUserFunction = openFrameConfig.customFindUserFunction || "findUserProfileByPhoneAJAX";

	var ga = new GlideAjax(findUserClass);
	ga.addParam("sysparm_name", findUserFunction);
	ga.addParam("sysparm_phone", phone);

	// submit request to server, call ajaxResponse function with server response
	ga.getXML(function(res) {
		ajaxResponse(res, cb);
	});
}

function ajaxResponse(response, cb) {
	var message = response.responseXML.documentElement.getAttribute('answer');
	jslog("Finesse Plugin: Find user by phone result: " + message);

	if (cb) {
		cb(JSON.parse(message));
	}
}

function sendCallerInfoToFinesse(info, call) {
	jslog("Finesse Plugin: Sending callerInfo to Finesse frame");

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4){
			var html = xhr.responseText;
			jslog("Finesse Plugin: received caller info HTML:" + html);
			info.html = html;
			finesseFrame.contentWindow.postMessage({
				type: 'callerInfo',
				info: info
			}, '*');
		}
	};
	var url = openFrameConfig.callerInfoViewUrl || 'x_clove_finesse_finesse_caller_view.do';
	url = "/" + url + "?sysparm_nostack=true&data=" + encodeURIComponent(encodeURIComponent(JSON.stringify(call)));
	jslog("Finesse Plugin: requesting caller info URL:" + url);
	xhr.open('GET', url);
	xhr.send();

}

document.addEventListener("DOMContentLoaded", function () {
	setTimeout(init, 0);
});

function init() {

	openFrameAPI.init({}, function (snConfig) {
         jslog("Finesse Plugin: Openframe Config received - " + JSON.stringify(snConfig));

		 openFrameAPI.setPresenceIndicator('Offline', 'grey');
		// set finesse state here too

		 var paramsList = snConfig.configuration.split("\n");
		 for(var i = 0; i < paramsList.length; i++) {
			 if (paramsList[i].startsWith("#") || paramsList[i].trim() === "") {
				 continue;
			 }

			 var keyValue = paramsList[i].split("=");

			 if (keyValue.length <= 1) {
				 continue;
			 }

			 var key = keyValue[0].trim();
			 var value = keyValue[1];
			 if (keyValue.length > 2) {
				 for(var j = 2; j < keyValue.length; j++) {
					 value += ("="+keyValue[j]);
				 }
			 }
			 value = value.trim();

			 openFrameConfig[key] = value;
		 }

		openFrameConfig["snowUserSysId"] = g_user.userID;

         openFrameAPI.Initialized = true;
         openFrameAPI.subscribe(openFrameAPI.EVENTS.COMMUNICATION_EVENT, communicationEvent);
		 openFrameAPI.subscribe(openFrameAPI.EVENTS.OPENFRAME_SHOWN, openFrameShown);

		 if (pendingConfig) {
			 sendConfigToPlugin();
			 pendingConfig = false;
		 }


	}, function (error) {
        jslog("Finesse Plugin: ERROR - Openframe init failed - " + error.toString());
		console.error("Finesse Plugin: ERROR - Openframe init failed - ", error);
    });

}

function communicationEvent(event) {
	jslog("Finesse Plugin: Communication event received: " + JSON.stringify(event));

	switch (event.type) {
		case 'OUTGOING_CALL':
			event.type = 'clickToCall';
			if (event.recordId) {
				currentRecord = {
					sys_id: event.recordId,
					type: event.recordType
				};
			}
			if (event.data && event.data.metaData && event.data.metaData.phoneNumber) {
				event.phoneNumber = event.data.metaData.phoneNumber;
			}

			finesseFrame.contentWindow.postMessage(event, '*');

			break;
		case 'ASSOCIATE_RECORD':
			jslog("Finesse Plugiin: Associating record to current call: " + JSON.stringify(event.record));
			currentRecord = event.record;

			break;
		default:
			jslog("Finesse Plugin: Unknown communication event: " + JSON.stringify(event));
			console.warn("Finesse Plugin: Unknown communication event: ", event);
			break;
	}
}

function openFrameShown() {
	finesseFrame.contentWindow.postMessage({ type: 'frameShown' }, '*' );
}

function searchUsers(search){
	try{
		var ga = new GlideAjax("x_clove_finesse.FinesseDataReader");
		ga.addParam("sysparm_name","searchUsersAJAX");
		ga.addParam("sysparm_search", search);
		ga.getXML(function(response) {
			var message = response.responseXML.documentElement.getAttribute('answer');
			var contacts = JSON.parse(message);
			sendContactsToPlugin(contacts);
		});
	} catch (e) {
		console.error(e);
	}
}

function sendContactsToPlugin(contacts) {
	finesseFrame.contentWindow.postMessage({
		type: 'listContacts',
		info: contacts
	}, '*');
}