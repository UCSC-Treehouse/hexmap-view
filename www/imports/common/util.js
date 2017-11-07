// util.js
// This contains various utilities used throughout the code.

import Prompt from '/imports/component/prompt.js';
import Select2 from '/imports/lib/select2.js';

exports.get_username = function (callback) {
    
    // Callback will be called with one parameter: the username or undefined
    Meteor.call('get_username', function (error, results) {
        if (error || !results) {
            callback(undefined);
        } else {
            callback(results);
        }
    });
}

exports.clean_file_name = function (dirty) {
    
    // Make a directory or file name out of some string
    // Valid characters:
    //     a-z, A-Z, 0-9, dash (-), dot (.), underscore (_)
    // All other characters are replaced with underscores.
    
    if (!dirty) { return undefined; }
    
    return dirty.replace(/[^A-Za-z0-9_\-\.]/g, "_");
}

exports.banner = function (severity, text) {

    // Display a message, either as a timed banner when 'severity' is one of
    // 'warn' or 'info', otherwise a dialog that requires the user to
    // dismiss the message.
    if (severity === 'warn' || severity === 'warning' || severity === 'info') {
    
        // Display a temporary message to the user on a banner.
        $("#banner")
            .removeClass('info warn error stay')
            .addClass(severity)
            .text(text)
            .show();
        $("#banner").delay(5000).fadeOut(1500);
    } else if (severity === 'error') {
        Prompt.show(text, { severity: 'error' });
    } else {
        console.log('invalid user message severity');
    }
    // Also inform the browser console of this issue.
    console.log(severity + ':', text);
}

exports.credentialCheck = function (credential) {

    // Bail with a message if the user is not logged in or does not have
    // the credentials.
    var returnVal = true;
    if (!Meteor.user()) {
        exports.banner('error', 'Please log in ' + credential + '.');
        returnVal = false;
    } else if (!(Session.get('jobCredential'))) {
        exports.banner('error', 'Sorry, you do not have credentials ' +
           credential + '. Please request access from hexmap at ucsc dot edu.');
        returnVal = false;
    }
    return returnVal;
}

exports.session = function (prefix, operation, name, val) {

    // Perform a get, set, or equals on a session variable which represents
    // a dict within a dict.
    // So we can save 'shortlist_filter_value.disease' with a unique Session
    // variable name of 'shortlist_filter_value_disease'.

    var key;

    // Build the key from the prefix and name
    if (prefix === 'filter_show') {
        key = 'shortlist_filter_show_' + name;
    } else if (prefix === 'filter_value') {
        key = 'shortlist_filter_value_' + name;
    } else if (prefix === 'filter_built') {
        key = 'shortlist_filter_built_' + name;
    } else {
        exports.banner('error', 'Illegal prefix on session(): ' + prefix);
        console.trace();
    }

    if (operation === 'get') {
        return Session.get(key);

    } else if (operation === 'equals') {
        return Session.equals(key, val);

    } else if (operation === 'set') {
        Session.set(key, val);

    } else {
        exports.banner('error', 'Illegal operation on session()');
        console.trace();
    }
}

exports.is_continuous = function (layer_name) {
    return (ctx.cont_layers.indexOf(layer_name.toString()) > -1);
}

exports.is_categorical = function (layer_name) {
        var is_cat;
        if ( _.isUndefined(layer_name) ){
            is_cat = false
        } else {
            is_cat = (ctx.cat_layers.indexOf(layer_name.toString()) > -1)
}
        return is_cat;
    }

exports.is_cat_or_bin = function (layer_name){
        return (exports.is_categorical(layer_name) ||
            exports.is_binary(layer_name));
    }

exports.is_binary = function (layer_name) {
        var is_bin;
        if ( _.isUndefined(layer_name) ){
            is_bin = false
        } else {
            is_bin = (ctx.bin_layers.indexOf(layer_name.toString()) > -1)
}
        return is_bin;
    }

exports.round = function (x, n) {
    if (!n) {
        n = 0;
    }
    var m = Math.pow(10, n);
    return Math.round(x * m) / m;
}

exports.getHumanProject = function (project) {

    // Transform a project from dir structure to display for humans
    return project.slice(0, -1);
}

exports.projectNotFound = function (dataId) {
    if (!ctx.projectNotFoundNotified) {

        ctx.projectNotFoundNotified = true;
    
        Session.set('mapSnake', false);
    
        // Alert the user that essential data is missing for this project.
         exports.banner('error', '"' + exports.getHumanProject(ctx.project) +
            '" does not seem to be a valid project.\nPlease select ' +
            'another.\n(' + dataId + ')');
    }
}

exports.parseTsv = function (data) {

    // Separate the data into an array of rows
    var rows = data.split('\n'),

    // Separate each row into an array of values
    parsed = _.map(rows, function(row) {
        return row.split('\t');
    });
    
    // Remove any empty row left from the new-line split
    if (parsed[parsed.length-1].length === 1 &&
            parsed[parsed.length-1][0] === '') {
        parsed.pop();
    }
    return parsed;
}

exports.removeFromDataTypeList = function (layer_name) {

    // Remove this layer from the appropriate data type list
    var index = ctx.bin_layers.indexOf(layer_name);
    if (index > -1) {
        ctx.bin_layers.splice(index, 1);
    } else {
        index = ctx.cat_layers.indexOf(layer_name);
        if (index > -1) {
            ctx.cat_layers.splice(index, 1);
        } else {
            index = ctx.cont_layers.indexOf(layer_name);
            if (index > -1) {
                ctx.cont_layers.splice(index, 1);
            }
        }
    }
}

function setHeightSelect2 ($el) {

    // Make the bottom of the list no longer than the main window
    $el.parent().on('select2-open', function () {
        var results = $('#select2-drop .select2-results');
        results.css(
            'max-height', $(window).height() - results.offset().top - 15);
    });
}

exports.createOurSelect2 = function ($el, optsIn, defaultSelection) {

    // Create a select2 drop-down.

    // Including our favorite options
    var opts = {
        dropdownAutoWidth: true,
        minimumResultsForSearch: -1,
    };

    // The caller's options override our favorite options
    for (var key in optsIn) {
        if (optsIn.hasOwnProperty(key)) {
            opts[key] = optsIn[key];
        }
    }

    // Create the select2 object
    $el.select2(opts);

    // Set the default selection
    if (defaultSelection) {
        $el.select2('val', defaultSelection);
    }

    setHeightSelect2($el);
}

exports.addToDataTypeList = function (layer_name, dataType) {
    if (dataType === 'binary') {
        ctx.bin_layers.push(layer_name);
    } else if (dataType === 'categorical') {
        ctx.cat_layers.push(layer_name);
    } else {
        ctx.cont_layers.push(layer_name);
    }
}