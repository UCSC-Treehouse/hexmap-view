// reflect.js
// This captures the user input to reflect a set of nodes on another map.

var app = app || {};
(function (hex) { // jshint ignore: line
Reflect = (function () { // jshint ignore: line
    var ManagerAddressBook = new Mongo.Collection('ManagerAddressBook');
    var ManagerFileCabinet = new Mongo.Collection('ManagerFileCabinet');
    //'use strict';

    var title = 'Reflect on Another Map',
        dialogHex,
        $button,
        $dialog,
        mapId,
        toMapId,
        toMapIds,
        dataType,
        dataTypes,
        selectionList,
        lastUser,
        subscribedToMaps = false,
        selectionSelected = ''; // option selected from the selection list

    Template.reflectT.helpers({
        tStats: function () {
            return !Session.get('reflectRanked');
        },
        ranked: function () {
            return Session.get('reflectRanked');
        },
    });

    function hide() {
        // Free some things, then hide the dialog
        selectionSelected = selectionList.selected;
        selectionList.destroy();
        selectionList = undefined;
        dialogHex.hide();
    }
 
    function show () {

        // Show the contents of the dialog, once per trigger button click
 
        // Create the target map selector
 
        // Put the data in the format the selector wants
        var mapIdData = [];
        toMapIds.forEach(function(mapId){
            mapIdData.push({id: mapId, text: mapId});
        });

        var $mapAnchor = $('#reflectDialog .mapIdAnchor');
        Util.createOurSelect2($mapAnchor, {data: mapIdData}, toMapId);
 
        $mapAnchor.show();

        // Define the event handler for selecting in the list
        $mapAnchor.on('change', function (ev) {
            toMapId = ev.target.value;
            //console.log('toMapId', toMapId);
        });

        // Create the layer name selector.
        selectionList = createLayerNameList(
                                    $('#reflectDialog .layerNameListAnchor'),
                                    $('#reflectDialog .selectionListLabel'),
                                    selectionSelected);
           
        // Only include binary data types, which also includes node selections.
        selectionList.enable(true, {binary: true});

        // Create the data type selector
 
        // Put the data in the format the selector wants
        var dataTypeData = [];
        dataTypes.forEach(function(type){
            dataTypeData.push({id: type, text: type});
        });

        var $dataTypeAnchor = $('#reflectDialog .dataTypeAnchor');
        Util.createOurSelect2($dataTypeAnchor, {data: dataTypeData}, dataType);
 
        $dataTypeAnchor.show();

        // Define the event handler for selecting in the list
        $dataTypeAnchor.on('change', function (ev) {
            dataType = ev.target.value;
            //console.log('data type selected:', dataType);
        });
        
        // Event handler for the Tstats vs. ranked.
        $('#reflectDialog .ranked').on('change', function (ev) {
        
            //console.log('ranked ev.target.checked', ev.target.checked);
            
            Session.set('reflectRanked', ev.target.checked);
        });
        $('#reflectDialog .tStats').on('change', function (ev) {
        
            //console.log('tStats ev.target.checked', ev.target.checked);
            
            Session.set('reflectRanked', !ev.target.checked);
        });
    }

    function criteriaCheck () {
    
        // Bail with a message if the required data needed is not present.
        if (!(Session.get('reflectCriteria'))) {
            dialogHex.hide();
            Util.banner('Data not available', 'Sorry, the required data to ' +
            'reflect onto another map is not available for this map.');
            return false;
        }
        return true;
    }

    function preShow () {
        var good = Util.credentialCheck('to reflect onto another map');
        if (good) {
            good = criteriaCheck();
        }
        return good;
    }

    function get_reflection_count(operation,dataType,toMapId,nodeIds) {
        //grab the available nodes from database
        var available_nodes = ManagerFileCabinet.findOne({operation: operation,
                                                          datatype:dataType,
                                                          toMapId: toMapId
                                                           }).available_nodes;
        //make object for easy 'in' operation
        //nodes must be of type string for this to work ...?

        //console.log(available_nodes);
        //console.log(nodeIds);
        var in_count=0;
        try {
            _.each(nodeIds,function(node){
                if (available_nodes.indexOf(node) !== -1 ){
                     in_count+=1;
                }
            });
        } catch (e) {
        
            // If there are no available nodes, that will be reported later.
            jQuery.noop();
        }

        return in_count;
    }
    function mapManager (operation, nodeIds) {
        
        var userId=Meteor.user().username;

        //console.log("reflect MapMan nodeIds:",nodeIds,dataType);
        //only perform reflection if there if there is some intersect of
        // reflection nodes and selected nodes
        if (get_reflection_count(operation,dataType,toMapId,nodeIds) !== 0) {
            Meteor.call("mapManager", operation,
                dataType,
                userId,
                ctx.project,
                toMapId,
                nodeIds,
                selectionSelected,
                //Session.get('reflectRanked'),
                function (error) {
                    if (error) {
                        Util.banner('error', 'Unknown server error.');
                        console.log(error);
                    } else {
                        console.log('Mapmanager: Operation ' +
                            operation + ' success');
                    }
                });
            //show a message to user
            Util.banner('info', 'Your other map will update shortly.');
            hide();
            
            Meteor.call("isWindowOpen", Meteor.user().username, toMapId,
                function (error, result) {
                    // no errors are returned
                    if (!result) { //result is true if window is opened
                        var pathPeices = toMapId.split('/');
                        var major = pathPeices[0];
                        var minor = pathPeices[1];
                        //how to open a new window
                        // TODO use a slash instead of a .
                        window.open(URL_BASE + '/?p=' + major + '.' + minor);
                    }
                });
            
        }
        return get_reflection_count(operation,dataType,toMapId,nodeIds);
    }


    function tell_user_about_subset(have_data_count, request_count) {
 
        // Tell the user that not all of the nodes had data.
        var message = have_data_count.toString() +
                            ' of ' +
                            request_count.toString() +
                            ' requested nodes have data to reflect.\n' +
                            'Reflection computed with only those nodes.';
        if (have_data_count ===0){
            message += ' Therefore reflection was not computed.';
        }
        alert(message);
    }
 
   function mapIt () {
        // Gather the user input and call the map manager.
        selectionSelected = selectionList.selected;
        
        // Bail if no selection is selected
        if (_.isUndefined(selectionSelected)) { return; }

        var nodeIds = [];
        _.each(layers[selectionList.selected].data,
            function (val, key) {
                if (val === 1)  { nodeIds.push(key); }
            }
        );
 
        // Request the map manager to reflect using these nodes,
        // and receive a count of nodes that had data.
        var have_data_count = mapManager('reflection', nodeIds);
       
        // If some of the nodes don't have data, let the user know.
        if (have_data_count < nodeIds.length) {
            tell_user_about_subset(have_data_count, nodeIds.length);
        }
	}
 
    function getReflectionInfo() {
        // grab array for possible maps to reflect to
        var addressEntry = ManagerAddressBook.findOne();
        //console.log(addressEntry);
        if (addressEntry) {
            toMapIds = addressEntry.toMapIds;
            dataTypes = addressEntry.datatypes;
        }

        if (addressEntry && toMapIds && toMapIds.length > 0) {
            // We have map IDs, so initialize the selected target map
            // and enable the trigger to open the reflection dialog
            toMapId = toMapIds[0];
            dataType= dataTypes[0];
            Session.set('reflectCriteria', true);
        } else {
            Session.set('reflectCriteria', false);
        }
    }
    
    function userChange () {
        // When the user changes, either logs on or off, subscribe to ...
        var user = Meteor.user();

        if (lastUser) {
            Meteor.subscribe('ClosedWindow',lastUser.username, mapId);
        }

        // Save the user for cleaning up when it changes
        lastUser = user;

        // Initialize the reflection criteria found flag.
        Session.set('reflectCriteria', false);
        
        if (user) {

            //subscribes to fill in available datatypes and target map ids
            // and which node Ids are available in any given refleciton
            if (!subscribedToMaps) {
                Meteor.subscribe('reflectionToMapIds',
                                  ctx.project,
                                  getReflectionInfo
                                 );
                Meteor.subscribe('ManagerFileCabinet',ctx.project);
                subscribedToMaps = true;
            }
            
            //keep track of windows open
            Meteor.subscribe('OpenedWindow',user.username,ctx.project);

            // Just before the page is closed, update the DB
            window.addEventListener('beforeunload', function () {
                Meteor.subscribe('ClosedWindow',user.username,mapId);
            });
        }
        // Save the map ID for cleaning up when it changes
        mapId = ctx.project;
    }
    
return { // Public methods
    init: function () {
 
        $button = $('.reflectTrigger');
        $dialog = $('#reflectDialog');
        Meteor.autorun(userChange);
        if (_.isUndefined(Session.get('reflectRanked'))) {
            Session.set('reflectRanked', false);
        }

        // Define the dialog options & create an instance of DialogHex
        var opts = {
            title: title,
            buttons: [{ text: 'Reflect', click: mapIt }],
        };
        dialogHex = createDialogHex({
            $el: $dialog,
            opts: opts,
            preShowFx: preShow,
            showFx: show,
            hideFx: hide,
            helpAnchor: '/help/reflect.html',
        });
 
        // Listen for the menu clicked
        Tool.add("reflectTrigger", function(ev) {
            if (!$(ev.target).hasClass('disabled')) {
                dialogHex.show();
            }
        }, 'Reflect nodes onto another map');
    },
};
}());
})(app);
