
//create object to hold references to 3 google maps
var hubwayMaps = {
    startMap: null,
    endMap: null,
    routeMap: null
}

//other global variables
var mapOptions;
var allStationsArray = [];
var startLatLng;
var endLatLng;
var startStationsWithDist = [];
var endStationsWithDist = [];
var selectedStartStation = {};
var selectedEndStation = {};
var startMarkersArray = [];
var endMarkersArray = [];
var usingCurrent = true;

$(function () {

    //set initial event handlers
    $(".btnReset").click(resetPage);
    $("#btnFindStart").click(findStartAddress);
    $("#btnFindEnd").click(findEndAddress);
	$("#endOK").click(showBigMap);

    //enable or disable Start Address input depending whether current location should be used
    $("#useCurrentLoc").change(function () {
        if (this.value == "yes") {
            $("#startAddress").textinput('disable');
            $("#startAddress").val("");
            usingCurrent = true;
        }
        else {
            $("#startAddress").textinput('enable');
            usingCurrent = false;
        }
    });


    //create 2 google maps using same options
    mapOptions = {
        zoom: 10,
        center: new google.maps.LatLng(42.4, -71.1),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    //Make AJAX request to get the currect feed of all hubway stations
    makeRequest("http://www.thehubway.com/data/stations/bikeStations.xml"); 
    //makeRequestBackup("bikeStations.xml");  //use a local copy for demo purposes if feed is down

    //pre-populate initial addresses using local storage, if they exist
        if(window.localStorage.StartAddress){
            $("#startAddress").val(window.localStorage.StartAddress);
        }
        if (window.localStorage.EndAddress) {
            $("#endAddress").val(window.localStorage.EndAddress);
        }

    setTableSelections(); //allow clicking on table rows to highlight markers on maps

});          //end init


//CHANGE PAGE LAYOUT FUNCTIONS

function showStartTable() {
    $("#startTable").fadeIn(1000);
}

function showEndTable() {
    $("#endTable").fadeIn(1000);
}

function showBigMap() {
    setTimeout(function () {
        $(".bigMap").fadeIn(createRouteMap); //create the biking directions map
        $("#directionsDiv").fadeIn();
    },
    1000
    );
}

function resetPage() { //START OVER
            location.href= "../mobile/index.html";
}


//GOOGLE MAPS FUNCTIONS

function createStartMap() {
    //create End map
    var mapElement = document.getElementById("startMap");
    hubwayMaps.startMap = new google.maps.Map(mapElement, mapOptions);
}

function createEndMap() {
    //create End map
    var mapElement = document.getElementById("endMap");
    hubwayMaps.endMap = new google.maps.Map(mapElement, mapOptions);
}

// create the final map showing biking directions
function createRouteMap() {
    var mapElement = document.getElementById("finalMap");
    hubwayMaps.routeMap = new google.maps.Map(mapElement, mapOptions);
    calculateDirections();
}

function findStartAddress() {
    //disable start controls and create map
    $("#startForm").hide();
	$("#btnFindStart").closest('.ui-btn').hide();
	$("#startMap").fadeIn();
	createStartMap();
    //validate
    if (usingCurrent) {
        getCurrentLocation();
        return;
    }
    var startAddress = $("#startAddress").val(); 
    if (!startAddress) { //make sure an address was entered
        return;
    }
    var numStartStations = $("#numStarts").val();
    //geocode address
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: startAddress }, function (results) {
        if (results.length != 0) {
            if (window.localStorage) {
                window.localStorage.setItem("StartAddress", $("#startAddress").val());
            }
            $('.errorSpan').html(""); //clear any errors
            $("#startDialog").dialog("close");
            $("#chooseStation1").fadeIn();
            showStartTable();
            //activateRouteButton();
            //create position object from returned coords and show on map
            var startPosition = {
                latitude: results[0].geometry.location.lat(),
                longitude: results[0].geometry.location.lng()
            };
            showOnStartMap(startPosition, hubwayMaps.startMap);
            //set global variable
            startLatLng = new google.maps.LatLng(startPosition.latitude, startPosition.longitude);
            findClosestStartStations(startLatLng, numStartStations);
        } //end if OK
        else {
            $('.errorSpan').html("Invalid Start Address<br>");
        }
    });    //end geocode

} //end findStartAddress

function findEndAddress() {
	//disable end controls and create map
    $("#endForm").hide();
    $("#btnFindEnd").closest('.ui-btn').hide();
	$("#endMap").fadeIn();
    createEndMap();
    //validate
    var endAddress = $("#endAddress").val();
    if (!endAddress) {  //make sure an address was entered
        return;
    }
    var numEndStations = $("#numEnds").val();
    if (parseInt(numEndStations, 10) != numEndStations) { //make sure an integer
        $('.errorSpan').html("The number of Hubway stations must be an integer between 1 and 10<br>");
        return;
    }
    if (numEndStations < 1 || numEndStations > 10) { //make sure it's in range
        $('.errorSpan').html("The number of Hubway stations must be an integer between 1 and 10<br>");
        return;
    }
    //geocode address
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: endAddress }, function (results) {
        if (results.length != 0) {
            if (window.localStorage) {
                window.localStorage.setItem("EndAddress", $("#endAddress").val());
            }
            $('.errorSpan').html(""); //clear any errors
            $("#endDialog").dialog("close");
            $("#chooseStation2").fadeIn();
            showEndTable();
            //activateRouteButton();
            //create position object from returned coords and show on map
            var endPosition = {
                latitude: results[0].geometry.location.lat(),
                longitude: results[0].geometry.location.lng()
            };
            showOnEndMap(endPosition, hubwayMaps.endMap);
            //set global variable
            endLatLng = new google.maps.LatLng(endPosition.latitude, endPosition.longitude);
            findClosestEndStations(endLatLng, numEndStations);
        } //end if OK
        else {
            $('.errorSpan').html("Invalid End Address<br>");
        }
    });   //end geocode

} //end findEndAddress

function getCurrentLocation() {
    if (!navigator.geolocation) {
        $(".errorSpan").html("Geolocation is not available. Please enter an address.<br>");
        return;
    }
    $(".errorSpan").html("Obtaining Location information...");
    // asynchronous call with callback success, 
    var options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    navigator.geolocation.getCurrentPosition(
        displayStartLocation, handleError, options);
} //end getCurrentLocation

function displayStartLocation(position) {
    $('.errorSpan').html(""); //clear any errors
    $("#chooseStation1").fadeIn();
    showStartTable();
    var numStartStations = $("#numStarts").val();
    // Show the google map with the position  
    showOnStartMap(position.coords, hubwayMaps.startMap);
    startLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    findClosestStartStations(startLatLng, numStartStations);
} //end displayStartLocation

function showOnStartMap(pos, passedMap) {
    var googlePosition =
        new google.maps.LatLng(pos.latitude, pos.longitude);
    // add the marker to the map
    var title = "Start Location " + "(" + Math.round(pos.latitude * 1000) / 1000 + ", " + Math.round(pos.longitude * 1000) / 1000 + ")";
    addMarker(passedMap, googlePosition, title);
} //end showOnStartMap

function showOnEndMap(pos, passedMap) {
    var googlePosition =
        new google.maps.LatLng(pos.latitude, pos.longitude);
    // add the marker to the map
    var title = "Final Destination " + "(" + Math.round(pos.latitude * 1000) / 1000 + ", " + Math.round(pos.longitude * 1000) / 1000 + ")";
    addMarker(passedMap, googlePosition, title);
} //end showOnStartMap

// add start or end position marker to the map
function addMarker(map, latlongPosition, title) {
    var options = {
        position: latlongPosition,
        map: map,
        title: title,
        clickable: true
    };
    var marker = new google.maps.Marker(options);
    return marker;
} //end addMarker

// add station marker to the map
function addStationMarker(map, latlongPosition, station, endOrStart) {
    var options = {
        position: latlongPosition,
        map: map,
        //icon: 'images/Markers/blue_MarkerH.png',
        icon: 'http://www.googlemapsmarkers.com/v1/' + station.id + '/0099FF/', //use station id as marker label
        title: station.name,
        clickable: true,
        id: station.id,
        bikes: station.nbBikes,
        docks: station.nbEmptyDocks
    };
    var marker = new google.maps.Marker(options);
    //put marker in appropriate global array
    if (endOrStart == "start") {//Start Stations
        startMarkersArray.push(marker);
    }
    else { //Start Stations
        endMarkersArray.push(marker);
    }
    google.maps.event.addListener(marker, 'click', function () {
        if (endOrStart == "start") {//Start Stations
            //turn all other markers blue
            for (var i = 0; i < startMarkersArray.length; i++) {
                startMarkersArray[i].setIcon('http://www.googlemapsmarkers.com/v1/' + startMarkersArray[i].id + '/0099FF/');
            }
            //set attributes of selected start station object
            selectedStartStation.id = marker.id;
            selectedStartStation.lat = marker.position.lat();
            selectedStartStation.long = marker.position.lng();
            selectedStartStation.name = marker.title;
            selectedStartStation.icon = marker.icon;
            var className = ".startClass" + station.id;
            //highlight table row with this class
            $("#startTable tr").removeClass('highlighted');
            $(className).addClass('highlighted'); //add the 'highlighted' class to the row in the start table with this new class
            //warn user if bikes are low
            if (marker.bikes == 0) {
                $(".lowBikesSpan").html("WARNING: This starting station has no available bikes.<br>");
            }
            else if (marker.bikes < 3) {
                $(".lowBikesSpan").html("WARNING: This starting station is low on available bikes.<br>");
            }
            else {
                $(".lowBikesSpan").html("");
            }
            $(".errorSpan").html("");
            $("#startOK").removeClass("ui-disabled");
        } //end if Start Stations
        else if (endOrStart == "end") {//End Stations
            //turn all other markers blue
            for (var i = 0; i < endMarkersArray.length; i++) {
                endMarkersArray[i].setIcon('http://www.googlemapsmarkers.com/v1/' + endMarkersArray[i].id + '/0099FF/');
            }
            //set attributes of selected end station object
            selectedEndStation.id = marker.id;
            selectedEndStation.lat = marker.position.lat();
            selectedEndStation.long = marker.position.lng();
            selectedEndStation.name = marker.title;
            selectedEndStation.icon = marker.icon;
            var className = ".endClass" + station.id;
            //highlight table row with this class
            $("#endTable tr").removeClass('highlighted');
            $(className).addClass('highlighted'); //add the 'highlighted' class to the row in the end table with this new class
            //warn user if docks are low
            if (marker.docks == 0) {
                $(".lowDocksSpan").html("WARNING: This destination station is out of empty docks.");
            }
            else if (marker.docks < 3) {
                $(".lowDocksSpan").html("WARNING: This destination station is low on empty docks.");
            }
            else {
                $(".lowDocksSpan").html("");
            }
            $(".errorSpan").html("");
            $("#endOK").removeClass("ui-disabled");
        } //end else if End Stations
        //change this marker icon to yellow
        marker.setIcon('http://www.googlemapsmarkers.com/v1/' + marker.id + '/FFFF00/');
    });  //end marker click eventListener
} //end addStationMarker

//handle geolocation errors
function handleError(error) {
    switch (error.code) {
        case 1:
            $('.errorSpan').html("The user denied permission<br>");
            break;
        case 2:
            $('.errorSpan').html("Position is unavailable<br>");
            break;
        case 3:
            $('.errorSpan').html("Timed out<br>");
            break;
    }
} //end handleError

//calculate biking directions
function calculateDirections() {
    var directionsService = new google.maps.DirectionsService();
    var directionsRenderer = new google.maps.DirectionsRenderer({
        polylineOptions: {
            strokeColor: "red",
            strokeWeight: 4
        },
        suppressMarkers: true
      });

    directionsRenderer.setMap(hubwayMaps.routeMap);
    directionsRenderer.setPanel($("#directionsDiv").get(0));
    $("#directionsDiv").bind('DOMNodeInserted', function () {
        //set custom icons in directions div
        $('#directionsDiv img:first').attr("src", 'http://www.googlemapsmarkers.com/v1/A/FFFF00/');
        $('#directionsDiv img:last').attr("src", 'http://www.googlemapsmarkers.com/v1/B/FFFF00/');
        //make footer stay at bottom by removing absolute positioning
    });
    var startStationLL = new google.maps.LatLng(selectedStartStation.lat, selectedStartStation.long);
    var endStationLL = new google.maps.LatLng(selectedEndStation.lat, selectedEndStation.long);
    var request = {
        origin: startStationLL,
        destination: endStationLL,
        travelMode: google.maps.TravelMode.BICYCLING
    }//end request object
    directionsService.route(request, function (result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } //end if
    } //end function
    );  //end route
    //add custom start and end icons to map
    var startMarker = addMarker(hubwayMaps.routeMap, startStationLL, "Starting Station");
    startMarker.setIcon('http://www.googlemapsmarkers.com/v1/A/FFFF00/');
    var endMarker = addMarker(hubwayMaps.routeMap, endStationLL, "Destination Station");
    endMarker.setIcon('http://www.googlemapsmarkers.com/v1/B/FFFF00/');
	//create coordinate strings to pass to navigation
	var startCoordsString = selectedStartStation.lat + "," + selectedStartStation.long;
	var endCoordsString = selectedEndStation.lat + "," + selectedEndStation.long;
	setNavigationURL(startCoordsString, endCoordsString);
}//end calculateDirections

//open vooice navigation using phone's native GPS and Google Maps app
function setNavigationURL(startCoords, endCoords){
	var navURL = "https://maps.google.com/maps?saddr=" + startCoords + "&daddr=" + endCoords + "&dirflg=b";
	$("#btnNavigate").attr("href", navURL);
}

//AJAX & HUBWAY DATA FUNCTIONS

function makeRequest(url) {
    //Must use YQL to get around cross-domain issue
    var yql = 'http://query.yahooapis.com/v1/public/yql?' + 'q=select%20*%20from%20xml%20where%20url%3D%22' + encodeURIComponent(url) + '%22&format=xml&callback=?';
    $('.errorSpan').html("Attempting to obtain live Hubway feed...");
    $.getJSON(yql, function (data) {
        try { //sometimes yql request times out...
            if (data.results.length == 0) {
                throw "(No results were returned.)";
            } //end if
            $('.errorSpan').html("");
            var stationsObject = {};
            // get all the station elements as xml
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(data.results, "text/xml");
            var allStations = xmlDoc.getElementsByTagName("station");
            for (var i = 0; i < allStations.length; i++) { //loop through all stations in returned XML
                //get info for each station
                var id = allStations[i].getElementsByTagName("id")[0].textContent;
                var name = allStations[i].getElementsByTagName("name")[0].textContent;
                var nbBikes = allStations[i].getElementsByTagName("nbBikes")[0].textContent;
                var nbEmptyDocks = allStations[i].getElementsByTagName("nbEmptyDocks")[0].textContent;
                var lat = allStations[i].getElementsByTagName("lat")[0].textContent;
                var long = allStations[i].getElementsByTagName("long")[0].textContent;
                // create a new JSON object for each station
                var newStation = {
                    "id": id,
                    "name": name,
                    "nbBikes": nbBikes,
                    "nbEmptyDocks": nbEmptyDocks,
                    "lat": lat,
                    "long": long
                };
                //add it to global array
                allStationsArray.push(newStation);
            } //end for
        } //end try
        catch (e) {
            if (e == "(No results returned.)") {
                $('.errorSpan').html(e);
            }
            $('.errorSpan').html("An error occurred loading the Hubway XML feed. Please try again later. " + e + "<br>");
        } //end catch
    });      //end callback function

} // end makeRequest(url)

//This is a backup function to be used for demosntration purposes during the winter months, 
//when the live Hubway feed may be down. This function will take a local xml file as its url parameter
function makeRequestBackup(url) {
    var xhr;
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    }
    else if (window.ActiveXObject) {
        xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }

    if (xhr) {
        xhr.onreadystatechange = loadStationsLocallyFromAJAX; //inner callback function to load senators after request is returned
        xhr.open("GET", url, true);
        xhr.send(null);
    }
    else {
        document.getElementById("errorSpan").innerHTML = "Sorry, couldn't create an XMLHttpRequest<br>";
    }
    //inner callback function
    function loadStationsLocallyFromAJAX() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var stationsObject = {};
                // get all the station elements from xml
                var allStations = xhr.responseXML.getElementsByTagName("station");
                for (var i = 0; i < allStations.length; i++) { //loop through all stations in returned XML
                    //get info for each station
                    var id = allStations[i].getElementsByTagName("id")[0].textContent;
                    var name = allStations[i].getElementsByTagName("name")[0].textContent;
                    var nbBikes = allStations[i].getElementsByTagName("nbBikes")[0].textContent;
                    var nbEmptyDocks = allStations[i].getElementsByTagName("nbEmptyDocks")[0].textContent;
                    var lat = allStations[i].getElementsByTagName("lat")[0].textContent;
                    var long = allStations[i].getElementsByTagName("long")[0].textContent;
                    // create a new JSON object for each station
                    var newStation = {
                        "id": id,
                        "name": name,
                        "nbBikes": nbBikes,
                        "nbEmptyDocks": nbEmptyDocks,
                        "lat": lat,
                        "long": long
                    };
                    //add it to global array
                    allStationsArray.push(newStation);
                } //end for
            } //end if
            else {
                document.getElementById("errorSpan").innerHTML = "There was a problem with the request " + xhr.status + "<br>";
            } //end else
        } //end if
    } // end loadStationsFromAJAX
} // end makeRequestBackup(url)


function findClosestStartStations(passedLatLng, numStartStations) {
    //loop through all stations
    for (var i = 0; i < allStationsArray.length; i++){
        //get lat long for this station
        var stationLat = allStationsArray[i].lat;
        var stationLon = allStationsArray[i].long;
        //create latlong object
        var stationLatLng = new google.maps.LatLng(stationLat, stationLon);
        //get distance from passed latlong
        var distanceToStation = google.maps.geometry.spherical.computeDistanceBetween(passedLatLng, stationLatLng);
        var stationObject = {
            "id": allStationsArray[i].id,
            "name": allStationsArray[i].name,
            "nbBikes": allStationsArray[i].nbBikes,
            "nbEmptyDocks": allStationsArray[i].nbEmptyDocks,
            "lat": allStationsArray[i].lat,
            "long": allStationsArray[i].long,
            "distance": distanceToStation
        };//end object
        startStationsWithDist.push(stationObject);
    }//end for
    //sort the array and take only top 4 by shortest distance
    startStationsWithDist.sort(compare);
    startStationsWithDist = startStationsWithDist.slice(0, numStartStations);
    //add top stations to table and map
    if (startStationsWithDist.length != numStartStations) {
        $('.errorSpan').html("An error occurred, please try again.<br>");
    }
    addStartStationsToDOM();
} //end findClosestStartStations

function findClosestEndStations(passedLatLng, numEndStations) {
    //loop through all stations
    for (var i = 0; i < allStationsArray.length; i++) {
        //get lat long for this station
        var stationLat = allStationsArray[i].lat;
        var stationLon = allStationsArray[i].long;
        //create latlong object
        var stationLatLng = new google.maps.LatLng(stationLat, stationLon);
        //get distance from passed latlong
        var distanceToStation = google.maps.geometry.spherical.computeDistanceBetween(passedLatLng, stationLatLng);
        var stationObject = {
            "id": allStationsArray[i].id,
            "name": allStationsArray[i].name,
            "nbBikes": allStationsArray[i].nbBikes,
            "nbEmptyDocks": allStationsArray[i].nbEmptyDocks,
            "lat": allStationsArray[i].lat,
            "long": allStationsArray[i].long,
            "distance": distanceToStation
        }; //end object
        endStationsWithDist.push(stationObject);
    } //end for
    //sort the array and take only top 4 by shortest distance
    endStationsWithDist.sort(compare);
    endStationsWithDist = endStationsWithDist.slice(0, numEndStations);
    if (endStationsWithDist.length != numEndStations) {
        $('.errorSpan').html("An error occurred, please try again.<br>");
    }
    //add top stations to table and map
    addEndStationsToDOM();
} //end findClosestEndStations

function addStartStationsToDOM() {
    // latlng: an array of google.maps.LatLng objects
    var latLngArray = [startLatLng];
    for (var i = 0; i < startStationsWithDist.length; i++) {
        //add to table
        var id = startStationsWithDist[i].id;
        var name = startStationsWithDist[i].name;
        var bikes = startStationsWithDist[i].nbBikes;
        var docks = startStationsWithDist[i].nbEmptyDocks;
        var distance = (Math.round(startStationsWithDist[i].distance * 0.000621371*100)/100) + "mi"; //convert from meters to miles and round to 2 decimal places
        if (bikes < 3) { //see if bikes are running low
            $("#startTable").append("<tr class='startClass" + id + "'><td>" + id + "</td><td>" + name + "</td><td>" + distance + "</td><td  class='lowBikes'>" + bikes + "</td></tr>");
        }
        else{
            $("#startTable").append("<tr  class='startClass" + id + "'><td>" + id + "</td><td>" + name + "</td><td>" + distance + "</td><td>" + bikes + "</td></tr>");
        }
        //add to map
        var newStationLatLng = new google.maps.LatLng(startStationsWithDist[i].lat, startStationsWithDist[i].long);
        addStationMarker(hubwayMaps.startMap, newStationLatLng, startStationsWithDist[i], "start");
        latLngArray.push(newStationLatLng);
    } //end for

    var latlngbounds = new google.maps.LatLngBounds();
    for (var i = 0; i < latLngArray.length; i++) {
        latlngbounds.extend(latLngArray[i]);
    }
    //zoom to stations and location
    hubwayMaps.startMap.fitBounds(latlngbounds);
    var zoomlevel = hubwayMaps.startMap.getZoom();
    hubwayMaps.startMap.setZoom(zoomlevel - 1);
    //Zoom to extent of these stations
} //end addStartStationsToDOM

function addEndStationsToDOM() {
    // latlng: an array of google.maps.LatLng objects
    var latLngArray = [endLatLng];
    for (var i = 0; i < endStationsWithDist.length; i++) {
        //add to table
        var id = endStationsWithDist[i].id;
        var name = endStationsWithDist[i].name;
        var bikes = endStationsWithDist[i].nbBikes;
        var docks = endStationsWithDist[i].nbEmptyDocks;
        var distance = (Math.round(endStationsWithDist[i].distance * 0.000621371 * 100) / 100) + "mi"; //convert from meters to miles and round to 2 decimal places
        if (docks < 3) { //see if docks are running low
            $("#endTable").append("<tr class='endClass" + id + "'><td>" + id + "</td><td>" + name + "</td><td>" + distance + "</td><td  class='lowDocks'>" + docks + "</td></tr>");
        }
        else {
            $("#endTable").append("<tr class='endClass" + id + "'><td>" + id + "</td><td>" + name + "</td><td>" + distance + "</td><td>" + docks + "</td></tr>");
        }
        //add to map
        var newStationLatLng = new google.maps.LatLng(endStationsWithDist[i].lat, endStationsWithDist[i].long);
        addStationMarker(hubwayMaps.endMap, newStationLatLng, endStationsWithDist[i], "end");
        latLngArray.push(newStationLatLng);
    } //end for

    var latlngbounds = new google.maps.LatLngBounds();
    for (var i = 0; i < latLngArray.length; i++) {
        latlngbounds.extend(latLngArray[i]);
    }
    //zoom to stations and location
    hubwayMaps.endMap.fitBounds(latlngbounds);
    var zoomlevel = hubwayMaps.endMap.getZoom();
    hubwayMaps.endMap.setZoom(zoomlevel - 1);

    //Zoom to extent of these stations
} //end addEndStationsToDOM

//Compare function to sort array of station objects based on distance
function compare(a, b) {
    if (a.distance < b.distance)
        return -1;
    if (a.distance > b.distance)
        return 1;
    return 0;
}//end compare

//TABLE SELECTION

//set up table row selecting so it synchronizes with map markers
function setTableSelections() {
    $('#startTable').on('click', 'tr[class!=headerRow]', function () {
        var state = $(this).hasClass('highlighted');
        $('#startTable .highlighted').removeClass('highlighted');
        if (!state) {
            $(this).addClass('highlighted');
        } //end if
        //get station ID of clicked row
        var startClass = $(this).attr('class').split(' ')[0];
        var stationID = startClass.slice(10);
        //loop through array of markers
        for (var i = 0; i < startMarkersArray.length; i++) {
            if (startMarkersArray[i].id == stationID) {
                new google.maps.event.trigger(startMarkersArray[i], 'click'); //trigger click event of marker that matches the row, which will highlight the marker
            } //end if
        } //end for
    }); //end onclick
    $('#endTable').on('click', 'tr[class!=headerRow]', function () {
        var state = $(this).hasClass('highlighted');
        $('#endTable .highlighted').removeClass('highlighted');
        if (!state) {
            $(this).addClass('highlighted');
        } //end if
        //get station ID of clicked row
        var endClass = $(this).attr('class').split(' ')[0];
        var stationID = endClass.slice(8);
        //loop through array of markers
        for (var i = 0; i < endMarkersArray.length; i++) {
            if (endMarkersArray[i].id == stationID) {
                new google.maps.event.trigger(endMarkersArray[i], 'click'); //trigger click event of marker that matches the row, which will highlight the marker
            } //end if
        } //end for
    });  //end onclick
} //end setTableSelections
