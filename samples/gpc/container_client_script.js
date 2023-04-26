var ctiContainer = document.getElementById('ctiContainer');
var finesseFrame = document.getElementById('finesseFrame');
var openFrameConfig = {};
var agent = null;
var pendingConfig = false;
var currentRecord = null;
var currentCall = null;

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

function receiveMessage(event) {
	jslog("Finesse Plugin: parent frame received message: " + JSON.stringify(event.data));

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
		case 'callStarted':
			jslog("Finesse Plugin: call started event: " +  JSON.stringify(event.data.call));
			break;
		case 'callEnded':
			jslog("Finesse Plugin: call ended event: " +  JSON.stringify(event.data.call));
			if (currentCall && currentCall.id == event.data.call.id) {
				// special for GPC
				event.data.call.employeeId = currentCall.employeeId;
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

	if (call.callType != "ACD_IN" && call.callType != "PREROUTE_ACD_IN") {
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

	var employeeId = call.callVariables["user.ESCEID"] || call.callVariables["ESCEID"];
    var caseId = call.callVariables["user.ESCCaseID"] || call.callVariables["ESCCaseID"];
	var assignmentGroup = call.callVariables["callVariable9"];

	if (employeeId == "123456" || caseId == "TestCaseID") {
		employeeId = "788637";
		caseId = "";
		assignmentGroup = "ESC Benefits";
    }

	var assignmentGroupSysId = null;

	switch (assignmentGroup) {
		case "ESC Benefits":
			assignmentGroupSysId = "5ebf5f20133d960017035f722244b00a";
			break;
		case "ESC Leave Management":
			assignmentGroupSysId = "ad30f4ecdb9b3e04ccb1f8621f96194e";
			break;
		case "ESC Employee Services":
			assignmentGroupSysId = "c9402360133d960017035f722244b02b";
			break;
	}

	currentCall = call;
	currentCall.employeeId = employeeId;

    if (employeeId && caseId == "unknown") {
        findUserByEmployeeId(employeeId, function(response) {
            //ajaxResponse(response);

            var message = response.responseXML.documentElement.getAttribute('answer');
            var res = JSON.parse(message);
            if (res.result != "found") {
                return;
            }

            // entity = "sn_hr_core_case_list";
            // query = "sysparm_query=opened_for%3D" + res.user.sys_id + "%5EORu_created_for%3D" + res.user.sys_id + "%5EORDERBYDESCsys_created_on&sysparm_first_row=1";
            // openFrameAPI.openServiceNowForm({entity: entity, query: query });
            entity = "sn_hr_core_case";
            query = "opened_for%3D" + res.user.sys_id + "%5EORu_created_for%3D" + res.user.sys_id + "%5EORDERBYDESCsys_created_on&sysparm_first_row=1";
            openFrameAPI.openServiceNowList({entity: entity, query: query });
        });
        return;
    } else if (caseId) {
        entity = "sn_hr_core_case";
        query = "finesse_screenpop=true&sysparm_query=number=HRC" + caseId;
    } else if (employeeId) {
		findUserByEmployeeId(employeeId, function(response) {
			var employeeSysId = "";
            var message = response.responseXML.documentElement.getAttribute('answer');
            var res = JSON.parse(message);
            if (res.result == "found") {
				employeeSysId = res.user.sys_id;
            }

			//entity = "sn_hr_core_case";
			//query = "finesse_screenpop=true&sys_id=-1&finesse_employee_id=" + employeeId;

			entity = "sn_hr_core_case_creation";
			query = "finesse_screenpop=true&sysparm_user=" + employeeSysId;

			if (assignmentGroupSysId) {
				query += "&assignment_group=" + assignmentGroupSysId;
			}

			//openFrameAPI.openServiceNowForm({entity: entity, query: query });
			openFrameAPI.openCustomURL(entity + ".do?" + query);
		});
		return;
    } else if (call.callVariables["callVariable8"] == "screenpop") {
		var employeeSysId = "5136503cc611227c0183e96598c4f706"; // 'guest' user sys id

		//entity = "sn_hr_core_case";
        //query = "finesse_screenpop=true&sys_id=-1&finesse_employee_id=guest";

		entity = "sn_hr_core_case_creation";
		query = "finesse_screenpop=true&sysparm_user=" + employeeSysId;

		if (assignmentGroupSysId) {
			query += "&assignment_group=" + assignmentGroupSysId;
		}
    }

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
			// openFrameAPI.openServiceNowForm({ entity: entity, query: query });
			openFrameAPI.openCustomURL(entity + ".do?" + query);
			break;
	}

	if (!employeeId) { return; }
	if (popData.manual) { return; }

    findUserByEmployeeId(employeeId, ajaxResponse);
	//findUserByPhone(call.from, sendCallerInfoToFinesse);
	updateCallerView(call);
}

function findUserByEmployeeId(employeeId, callback) {
    var ga = new GlideAjax("x_clove_finesse.FinesseDataReader");
    ga.addParam("sysparm_name", "findUserProfileByEmployeeIdAJAX");
    ga.addParam("sysparm_employee_id", employeeId);

    // submit request to server, call callback function with server response
    ga.getXML(callback);
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
		//var user = findUserByPhone(call.otherParty, function(userInfo) {
		var user = findUserByEmployeeId(call.employeeId, function(userInfo) {
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

function findUserByPhone(phone, cb) {

	var ga = new GlideAjax("x_clove_finesse.FinesseDataReader");
	ga.addParam("sysparm_name", "findUserProfileByPhoneAJAX");
	ga.addParam("sysparm_phone", phone);

	// submit request to server, call ajaxResponse function with server response
	ga.getXML(function(res) {
		ajaxResponse(res, cb);
	});
}

function ajaxResponse(response) {
    var message = response.responseXML.documentElement.getAttribute('answer');

    jslog("Finesse Plugin: Find user result: " + message);
    jslog("Finesse Plugin: Sending callerInfo to Finesse frame");
    finesseFrame.contentWindow.postMessage({
        type: 'callerInfo',
        info: JSON.parse(message)
    }, '*');

}

function sendCallerInfoToFinesse(info) {
	jslog("Finesse Plugin: Sending callerInfo to Finesse frame");
	finesseFrame.contentWindow.postMessage({
		type: 'callerInfo',
		info: info
	}, '*');
}

document.addEventListener("DOMContentLoaded", function () {

	jslog("Finesse Plugin: running removeFromStack");
	var ga = new GlideAjax("global.OpenFrameNavFixer");
	ga.addParam("sysparm_name", "removeFromStack");
	ga.addParam("sysparm_url_to_remove", "x_clove_finesse_finesse_plugin_container.do");
	ga.getXML(function(res) {
		var resString = (new XMLSerializer()).serializeToString(res.responseXML);
		jslog("Finesse Plugin: removeFromStack response: " + resString);
	});

	if (openFrameAPI.Initialized == undefined) openFrameAPI.init({}, function (snConfig) {
         jslog("Finesse Plugin: Openframe Config received - " + JSON.stringify(snConfig));

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
});

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

			finesseFrame.contentWindow.postMessage(event, '*');

			break;
		case 'ASSOCIATE_RECORD':
			if (currentRecord != null) { return; }

			jslog("Finesse Plugin: Associating record to current call: " + JSON.stringify(event.record));
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

function searchUsers(search) {
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
