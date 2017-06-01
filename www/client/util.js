// util.js
// This contains various utilities used throughout the code.

var app = app || {};
(function (hex) { // jshint ignore: line
Util = (function () { // jshint ignore: line

    function get_username (callback) {
        
        // Callback will be called with one parameter: the username or undefined
        Meteor.call('get_username', function (error, results) {
            if (error || !results) {
                callback(undefined);
            } else {
                callback(results);
            }
        });
    }
    
    function clean_file_name (dirty) {
        
        // Make a directory or file name out of some string
        // Valid characters:
        //     a-z, A-Z, 0-9, dash (-), dot (.), underscore (_)
        // All other characters are replaced with underscores.
        
        if (!dirty) { return undefined; }
        
        return dirty.replace(/[^A-Za-z0-9_\-\.]/g, "_");
    }
    
    function banner (title, text) {
    
        // Display a message, either as a timed banner when 'title' is one of
        // 'warn' or 'info', otherwise a dialog that requires the user to
        // dismiss the message. For a dialog when 'title' is 'error', the dialog
        // title will be 'Error'. Otherwise the given title will be used.
        if (title === 'warn' || title === 'info') {
        
            // Display a temporary message to the user on a banner.
            $("#banner")
                .removeClass('info warn error stay')
                .addClass(title)
                .text(text)
                .show();
            $("#banner").delay(5000).fadeOut(1500);
        } else if (title === 'error') {
            Message.display('Error', text);
        } else {
            Message.display(title, text);
        }

        // Also inform the browser console of this issue.
        console.log(title + ':', text);
    }

    function credentialCheck (credential) {
    
        // Bail with a message if the user is not logged in or does not have
        // the credentials.
        if (!(Session.get('loggedIn'))) {
            banner('Credentials Required',
                'Please log in ' + credential + '.');
            return false;
        } else if (!(Session.get('jobCredential'))) {
            banner('Credentials Required',
                'Sorry, you do not have credentials ' + credential + '. Please ' +
                'request access from hexmap at ucsc dot edu.')
            return false;
        }
        return true;
    }
 
    function session (prefix, operation, name, val) {
 
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
        } else {
            banner('error', 'Illegal key on session()');
            console.trace();
        }
 
        if (operation === 'get') {
            return Session.get(key);

        } else if (operation === 'equals') {
            return Session.equals(key, val);

        } else if (operation === 'set') {
            Session.set(key, val);

        } else {
            banner('error', 'Illegal operation on session()');
            console.trace();
        }
    }
 
    function is_continuous (layer_name) {
        return (ctx.cont_layers.indexOf(layer_name.toString()) > -1);
    }
 
    function is_categorical (layer_name) {
        return (ctx.cat_layers.indexOf(layer_name.toString()) > -1);
    }
 
    function is_binary (layer_name) {
        return (ctx.bin_layers.indexOf(layer_name.toString()) > -1);
    }
 
    function round (x, n) {
        if (!n) {
            n = 0;
        }
        var m = Math.pow(10, n);
        return Math.round(x * m) / m;
    }

    function getHumanProject (project) {
 
        // Transform a project from dir structure to display for humans
        return project.slice(0, -1);
	}

    function projectNotFound (filename) {
        if (!ctx.projectNotFoundNotified) {

            // make the project name look it would in the URL & alert the user
            var proj = ctx.project.slice(5, -1).replace('/', '.');
            alert('"' + proj +
                '" does not seem to be a valid project.\nPlease select ' +
                'another.\n(' + filename + ')');
            ctx.projectNotFoundNotified = true;
        }
    }

    function tsvParseRows (tsv_data) {

        // Even though the retrieved file has no new line or carriage return,
        // the browser inserts '\n\r' at the end of the file. So, remove any
        // trailing new line and carriage return so that we don't end up with
        // an extra empty row.

        if (tsv_data.lastIndexOf('\n') === tsv_data.length - 1) {
            tsv_data = tsv_data.slice(0, -1);
        }

        // Remove any trailing microslop carriage return
        if (tsv_data.lastIndexOf('\r') === tsv_data.length - 1) {
            tsv_data = tsv_data.slice(0, -1);
        }
        return $.tsv.parseRows(tsv_data);
    }

    function removeFromDataTypeList (layer_name) {

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

    function createOurSelect2 ($el, optsIn, defaultSelection) {
 
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
    
    function timestamp () {

        // This returns a timestamp of the form: Jan 26 2017 11:20:48:295
        var now = new Date();
        return now.toString().slice(4, -15) + ':' + now.getMilliseconds()
    }
        
    return { // Public methods
        credentialCheck: credentialCheck,
        get_username: get_username,
        clean_file_name: clean_file_name,
        session: session,
        is_continuous: is_continuous,
        is_categorical: is_categorical,
        is_binary: is_binary,
        round: round,
        getHumanProject: getHumanProject,
        projectNotFound: projectNotFound,
        banner: banner,
        tsvParseRows: tsvParseRows,
        removeFromDataTypeList: removeFromDataTypeList,
        setHeightSelect2: setHeightSelect2,
        createOurSelect2: createOurSelect2,
        timestamp: timestamp,
    };
}());

// TODO needed while transitioning to more scope protection
session = Util.session;
is_continuous = Util.is_continuous;
is_categorical = Util.is_categorical;
is_binary = Util.is_binary;
round = Util.round;
getHumanProject = Util.getHumanProject;
projectNotFound = Util.projectNotFound;
banner = Util.banner;
tsvParseRows = Util.tsvParseRows;
removeFromDataTypeList = Util.removeFromDataTypeList;
setHeightSelect2 = Util.setHeightSelect2;
createOurSelect2 = Util.createOurSelect2;

})(app);

