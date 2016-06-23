var channel_user_list = {};
var warned = false;
var clientChannels = [];
var socket;
if (!window.WebSocket) {
    document.body.innerHTML = 'This web browser does not support web sockets';
}

window.onbeforeunload = function (e) {
    var jsonstring = '{"rf":{"userFrom":"' + $("#chatname").val() + '"}}';
    socket.send(jsonstring);
};

// create connection
var host = location.origin.replace(/^http/, 'ws');
//var socket = new WebSocket(host,"tomishere");

function createSocket(channelName) {
//alert("bro chat+ "+$("#chatname").val());

socket = new WebSocket(host,$("#chatname").val());
// incomming messages handler
socket.onmessage = function (event) {
    var incomingMessage = event.data;
    var obj = JSON.parse(incomingMessage);

    if (obj.hasOwnProperty('cm') || obj.hasOwnProperty('pm')) {
        showMessage(incomingMessage);

    }
    else if (obj.hasOwnProperty('user')) {
        addToUserList(obj.user.names, obj.user.channel);
    }
    else if (obj.hasOwnProperty('users')) {

        addUserstoChannel(obj.users.names, obj.users.channel);
        refreshUserList(obj.users.names, obj.users.channel);
    }
    else if (obj.hasOwnProperty('channel')) {
        showChannelList(obj.channel.names);
    }
    else if (obj.hasOwnProperty('cl')) {
        var temp = obj.cl.channellist;

        showChannelList(temp);

    }
    else if (obj.hasOwnProperty('quit')) {
        showQuitMessage(obj.quit.names, obj.quit.channel, obj.quit.reason);
    }
    else if (obj.hasOwnProperty('error')) {
        socket.close();
        if (obj.error.code == "kicked") {
            window.location.href = '/?msg=kickedout';
        }
        else if (obj.error.code == "notreg") {
            window.location.href = '/?msg= the name is already registered!';
        }
        else if (obj.error.code == "closed") {
            window.location.href = '/';
        }
    }
};

socket.onopen = function () {
	//var channelName = $("#channelSelect option:selected").text();
	//alert("channelName " + channelName);
	if (channelName != "") {
		addNewChat(channelName.trim());
	}
}

socket.onclose = function() {
    //alert("here we are");
    setTimeout(function(){createSocket("")}, 300);
}


}
function currentTab() {
    var selectedTab = $("#tabs").tabs('option','active');
    if (selectedTab == false) {
        selectedTab = 0;
    }
    selectedTabName = $($("#tabs li")[selectedTab]).text();
    selectedTabName = selectedTabName.substring(0,selectedTabName.length-1);
    
   // alert("current tab: "+selectedTab);
    return selectedTabName;
}

// send message from form publish
function sendMessage() {
    var outgoingMessage = document.getElementById("usermsg").value;
    outgoingMessage = JSON.stringify(outgoingMessage);
    var  substring = [];
    substring[0] = "<script";
    substring[1] = "<style";
    var tabName = currentTab();

    if (!(outgoingMessage.indexOf(substring[0]) > -1) && !(outgoingMessage.indexOf(substring[1]) > -1)) {
        if (tabName in sessionStorage) {
            outgoingMessage = '"'+Crypto.AES.encrypt(outgoingMessage, sessionStorage[tabName])+'"';
        }
        if ((tabName.charAt(0) == "#") || (tabName.charAt(0) == "&")) {
            jsonstring = '{"cm":{"userFrom":"' + $("#chatname").val() + '","to":"' + tabName + '","message":' + outgoingMessage + '}}';
        } else {
            jsonstring = '{"pm":{"userFrom":"' + $("#chatname").val() + '","to":"' + tabName + '","message":' + outgoingMessage + '}}';
        }
        socket.send(jsonstring);
    }
    else{

        var mes = "", jsonstring = "";
        if (warned == false) {
            mes = "<b style='color:palevioletred'>Last warning for user:</b>" + $("#chatname").val() + "--><I>Please do not use scripts in the message box</I>";
            if (tabName in sessionStorage) {
                mes = Crypto.AES.encrypt(mes, sessionStorage[tabName]);
            }

            if (tabName.charAt(0) == '#') {
                jsonstring = '{"cm":{"userFrom":"Admin","message":"' + mes + '","to":"' + tabName + '"}}';
            }
            else {
                jsonstring = '{"pm":{"userFrom":"Admin","message":"' + mes + '","to":"' + tabName + '"}}';
            }
            showMessage(jsonstring);
            warned = true;
        }
        else {
            jsonstring = '{"kick":{"user":"' + $("#chatname").val() + '"}}';
            socket.send(jsonstring);
        }
    }
    return false;
}


function showMessage(message) {

    var obj = JSON.parse(message);
    var tabname = '';
    var messageText = "";
    var chatname = "";
    var userFrom = "";

    if (obj.hasOwnProperty('cm')) {
        tabname = obj.cm.to;
        messageText = obj.cm.message;
        if (tabname in sessionStorage) {

            messageText = Crypto.AES.decrypt(messageText, sessionStorage[tabname]).toString();//Crypto.enc.Utf8
	    messageText = messageText.substr(1,messageText.length-2);
        }
        userFrom = obj.cm.userFrom;
        tabname = tabname.substring(1).toLowerCase();
    } else if (obj.hasOwnProperty('pm')) {
        if (obj.pm.hasOwnProperty('to')) {
            tabname = obj.pm.to;
        } else {
            tabname = obj.pm.userFrom;
        }
        messageText = obj.pm.message;
        userFrom = obj.pm.userFrom;
    }

    var id = "#tabs-"+tabname;

  addNewChat(tabname);

    if (messageText != "") {

        if ($(id).html() == "") {
            $(id).html("");
        }

        if (userFrom == $("#chatname").val()) {
            chatname = "You";
        } else {
            chatname = userFrom;
        }
        $(id).append(
            "<div class='message_div'><div class='nick'>" + chatname + "</div><div class='messageInList'>" + messageText + "</div></div>"
        );
        $(id + " .message_div").css({'border-bottom': "1px solid #CCCCCC"});

        $(id).animate({scrollTop: $(id).prop("scrollHeight") - $(id).height()}, 1);

    }


}


function addToUserList(user_list, channel) {

    var user_arr = user_list.split(',');
    channel = channel.toLowerCase();
    var arr_length = channel_user_list[channel].length;

    if ($("#chatname").val() != user_arr[0]) {
        if (channel_user_list[channel].indexOf(user_arr[0]) <= -1) {
            channel_user_list[channel][arr_length] = user_arr[0];
            $("#chatMembers").append('<li><a>' + user_arr[0] + '</a></li>');
        }
    }

    document.getElementById("member_count").innerHTML = channel_user_list[channel].length;

    var id = "#tabs-" + channel.substring(1);


    $(id).append(
        "<div class='message_div'><div class='nick'>--></div><div class='messageInList' style='color:#36AF36;font-style: italic;'>" + user_arr[0] + " has joined  " + channel + "</div></div>"
    );
    $(id + " .message_div").css({'border-bottom': "1px solid #CCCCCC"});

    $(id).animate({scrollTop: $(id).prop("scrollHeight") - $(id).height()}, 1);
}

function addUserstoChannel(user_list, channel) {

    channel = channel.toLowerCase();
    var user_arr = user_list.split(',');
    channel_user_list[channel] = user_arr;
    //alert(channel+"--adduserstochannel--"+user_arr.length);
    $("#chatMembers").html(" ");
    for (var i = 0; i < user_arr.length; i++) {
        if ($("#chatname").val() != user_arr[i]) {
            $("#chatMembers").append('<li><a>' + user_arr[i] + '</a></li>');
        }
    }

}

function refreshUserList(user_list, channel) {

    var user_arr = user_list.split(',');
    $("#chatMembers").html(" ");

    for (var i = 0; i < user_arr.length; i++) {
        if ($("#chatname").val() != user_arr[i]) {
            $("#chatMembers").append('<li><a>' + user_arr[i] + '</a></li>');
        }
    }

    document.getElementById("member_count").innerHTML = user_arr.length;

};

function refreshUserListArray(user_arr) {
    style = 'color:#36AF36;font-style: italic;'

    $("#chatMembers").html(" ");
    document.getElementById("member_count").innerHTML = user_arr.length;
    for (var i = 0; i < user_arr.length; i++) {
        if ($("#chatname").val() != user_arr[i]) {
            $("#chatMembers").append('<li><a>' + user_arr[i] + '</a></li>');
        }
    }
}


function showChannelList(channel_list){

    //alert(channel_list);
    var user_arr = channel_list.split(','), option = "";
    for (var i = 0; i < user_arr.length; i++) {
        option = '<option value="'
            + user_arr[i].trim() + '">'
            + user_arr[i] + '</option>';

        if(!(clientChannels.indexOf(user_arr[i]) > -1)) {
            clientChannels.push(user_arr[i].trim())
            $('#channelSelect').append(option);
        }
    }
    $('#reload_gif').hide("slow");
    $('#reload').show("slow");
    loadWindow();
}

function addNewChat(name) {
    var id = 'tabs-' + name;
    var namecheck, namelength;
    var ischannel=true;
    if (name.charAt(0) == '#' || name.charAt(0) == '&') {
	ischannel = true;
        namecheck = name.substring(1).toLowerCase();
    } else {
	ischannel = false;
        namecheck = name;
    }
    namelength = getTextWidth(name, "bold 13pt arial");

    if ($("#ui-id-" + namecheck).length == 0) {

        $("#ultab")
            .append(
                "<li id='li-id-" + namecheck + "'><a id='ui-id-"
                + namecheck
                + "' onclick='tabClick(this.id,"+ischannel+");' href='#tabs-"
                + namecheck
                + "'>"
                + name
                + "</a><span class='ui-icon ui-icon-close' role='presentation'>*</span></li>");

        if (name.charAt(0) == "#") {


            $("#message_display_div")
                .append(
                    '<div class="divMessageBox" id="tabs-' + namecheck.toLowerCase() + '" style="display:block"></div>');

            $("#li-id-" + namecheck.toLowerCase()).width((namelength) + "px");

            var jsonstring = '{"nc":{"channelName":"' + name + '","userFrom":"' + $("#chatname").val() + '"}}';
            channel_user_list[name] = [];
//alert("new chat is created! " + socket);
            socket.send(jsonstring);
        } else {
            $("#message_display_div").append(
                '<div class="divMessageBox" id="' + id + '"></div>');
            $("#li-id-" + name).width((namelength) + "px");

        }

        $("div#tabs").tabs("refresh");

    }
    var index = $("#ui-id-" + namecheck.toLowerCase()).parent().index();
//alert("index " + index + " namecheck "+namecheck);
    $('#tabs').tabs("option", "active", index);
}

function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return (metrics.width + 100);
};


function channelChange() {

    var names = $("#channelSelect option:selected").text().trim();

    if ($("#channelSelect").val() != "0") {

        if ($("#li-id-" + names.substring(1)).length != 0) {
            var index = $("#ui-id-" + names.substring(1).toLowerCase()).parent().index();
            $('#tabs').tabs("option", "active", index);

            refreshUserListArray(channel_user_list[names]);

        } else {

            addNewChat(names);
        }
    }
}

function closeWindow() {
    var jsonstring = '{"close":{"user":"' + $("#chatname").val() + '"}}';
    socket.send(jsonstring);
}

function showQuitMessage(names, channel, reason) {

    channel_user_list[channel].splice( $.inArray(names, channel_user_list[channel]), 1 );
    document.getElementById("member_count").innerHTML = channel_user_list[channel].length;
    channel = channel.substring(1);

    var id = "#tabs-" + channel;


    $('ul#chatMembers li:contains('+names+')').remove();

    $(id).append(
        "<div class='message_div'><div class='nick'>--></div><div class='messageInList' style='color:#9F1010;font-style: italic;'>" + names + " -- " + reason + "</div></div>"
    );
    $(id + " .message_div").css({'border-bottom': "1px solid #CCCCCC"});

    $(id).animate({scrollTop: $(id).prop("scrollHeight") - $(id).height()}, 1);

}

function refreshChannels(){

    $('#reload').hide();
    $('#reload_gif').show();
    var jsonstring = '{"cl":{"userFrom":"' + $("#chatname").val() + '"}}';
    socket.send(jsonstring);
}

function loadWindow() {

    $('.modal').fadeOut(1000);

}

