// hexagon.js
// Handle things to do with hexagons.

import Ajax from '/imports/ajax.js';
import InfoWindow from '/imports/reactCandidates/infoWindow.js';

var app = app || {}; 

(function (hex) {

    // Global: hold objects of polygons by signature name
    polygons = {};

    // What's the minimum number of pixels that sideLen must represent at the
    // current zoom level before we start drawing hex borders?
    var MIN_BORDER_SIZE = 10;

    // And how thick should the border be when drawn?
    var HEX_STROKE_WEIGHT = 2;
 
    // The node assignments in honeycomb space
    var assignments;
 
    // The hover info flag
    var hoverInfoShowing = false;

    function renderHexagon (row, column, overlayNode) {

        // Make a new hexagon representing the hexagon at the given xy object
        // space before transform to xy world space.
        // Returns the Google Maps polygon.
 
        var xy = get_xyWorld_from_xyHex(column, row);
 
        var coords = getHexLatLngCoords(xy, sideLen);

        // TODO can we process many polygons in one call?
        // Can we leave out the fill color until we have one?
        // Construct the Polygon
        var hexagon = new google.maps.Polygon({
            paths: coords,
            strokeOpacity: 1.0,
            fillColor: Colors.noDataColor(),
            fillOpacity: 1.0,
            zIndex: overlayNode ? 200 : 1, // overlays are on top
        });
        setHexagonStroke(hexagon);
        
        // Attach the hexagon to the global map
        hexagon.setMap(googlemap);
 
        // Save the honeycomb coordinates with the hexagon
        hexagon.xHex = column;
        hexagon.yHex = row;

        // Save the xy coordinates for later.
        hexagon.xy = xy;
 
        // Set up the click listener to move the global info window to this hexagon
        // and display the hexagon's information
        google.maps.event.addListener(hexagon, "click", function (event) {
            InfoWindow.show(event, hexagon);
        });

        // Listen to mouse events on this hexagon
        Tool.subscribe_listeners(hexagon);
        
        return hexagon;
    } 

    function setHexagonStroke(hexagon) {
 
        // Given a polygon, set the weight of hexagon's border stroke, in number of
        // screen pixels, and the border color.

        // API docs say: pixelCoordinate = worldCoordinate * 2 ^ zoomLevel
        // So this holds the number of pixels that the global length sideLen 
        // corresponds to at this zoom level.
        var weight = (sideLen * Math.pow(2, ctx.zoom) >= MIN_BORDER_SIZE)
                ? HEX_STROKE_WEIGHT
                : 0;

        hexagon.setOptions({
            strokeWeight: weight,
            strokeColor: Session.get('background'),
        });
    }

    createHexagons = function (draw) {

        // Create the hexagons from the assignments.
        polygons = {};
        _.each(assignments, function (hex, id) {
            addHexagon (hex.x, hex.y, id);
        });
        if (draw) {
            refreshColors();
        }
    }

    removeHexagon = function (label) {
        google.maps.event.clearInstanceListeners(polygons[label]);
        polygons[label].setMap(null);
        delete polygons[label];
    }
 
    function removeHoverListeners (hexagon) {
        google.maps.event.removeListener(hexagon.mouseover);
        google.maps.event.removeListener(hexagon.mouseout);
        delete hexagon.mouseover;
        delete hexagon.mouseout;
    }
 
    function addHoverListeners (hexagon) {
        if (hoverInfoShowing) {
 
            // Set up the hover listeners to move the infowindow to this node
            // with just a node ID displayed.
            hexagon.mouseover = google.maps.event.addListener(hexagon,
                "mouseover", function (event) {
                    InfoWindow.show(event, hexagon, null, null, true);
                });
            hexagon.mouseout = google.maps.event.addListener(hexagon,
                "mouseout", function (event) {
                    InfoWindow.close(true);
                });
        }
    }

    addHexagon = function (x, y, label, overlayNode) {

        // Make a hexagon on the Google map and store that.
        // x and y are in object coordinates before transform to world xy coords
        // overlayNode is optional
        var hexagon = renderHexagon(y, x, overlayNode);

        // Store by label
        polygons[label] = hexagon;
 
        if (hoverInfoShowing) {
            addHoverListeners(hexagon);
        }
        
        // Set the polygon's signature so we can look stuff up for it when 
        // it's clicked.
        hexagon.signature = label;
    }

    setHexagonStrokes = function () {

        // Turns off hex borders if we zoom out far enough, and turn them on
        // again if we come back.
        for (var signature in polygons) {
            setHexagonStroke(polygons[signature]);
        }
    }

    setHexagonColor = function (hexagon, color) {

        // Given a polygon, set the hexagon's fill color.
        hexagon.setOptions({
            fillColor: color
        });
    };

    function showHoverInfo () {
        var el = $('#navBar .showHoverInfo');
        if (hoverInfoShowing) {
            hoverInfoShowing = false;
            _.each(polygons, removeHoverListeners);
            el.text('Show Node Hover');
        } else {
            hoverInfoShowing = true;
            _.each(polygons, addHoverListeners);
            el.text('Hide Node Hover');
        }
    }

    initHexagons = function (draw) {
    
        // Download the signature assignments to hexagons and fill in the global
        // hexagon assignment grid.
        var id = 'assignments' + Session.get('layoutIndex');
        $('#navBar .showHoverInfo').on('click', showHoverInfo)
        Ajax.get({
            id: id,
            success: function (parsed) {

                // This is an array of rows, which are arrays of values:
                // id, x, y

                // Show the number of nodes on the UI
                Session.set('nodeCount', parsed.length);

                // This holds the maximum observed x & y
                var max_x = max_y = 0;

                // Find the max x and y while storing the assignments
                assignments = {};
                for (var i = 0; i < parsed.length; i++) {
                    var x = parseInt(parsed[i][1]),
                        y = parseInt(parsed[i][2]);
                    assignments[parsed[i][0]] = {x: x, y: y};
                    max_x = Math.max(x, max_x);
                    max_y = Math.max(y, max_y);
                }

                findDimensions(max_x, max_y);
                Session.set('initedHexagons', true);
                if (draw) {
                    createHexagons(draw);
                }
            },
            error: function (error) {
                projectNotFound(id);
                return;
            },
        });
    }
})(app);
