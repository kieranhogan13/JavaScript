/**
 * Created by Kieran on 11/02/2016.
 */

/**
 * Variables for map application
 */
var map;
var arrowImage;
var radius;
var markers;
var url = "http://mf2.dit.ie:8080/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dit:dublin_food&outputFormat=json&srsName=epsg:4326";
var canvas;
var context;
var target;
var targetLatLng;
var positionLatLng;
var bearing = 0;
var distanceToTarget;
var polyCounter;
var currentCircle;
var currentMarker;
var polyline;
var newDistance;
var newTime;
var oldTime;
var oldPosLatLng;
var movementSpeed;
var diffTime;
var targetBool;

/**
 * Food outlet icons assigned and formatted
 */

var foodblack = L.icon({
    iconUrl: 'images/foodblack.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

var foodred = L.icon({
    iconUrl: 'images/foodred.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

var foodblue = L.icon({
    iconUrl: 'images/foodblue.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

var foodgreen = L.icon({
    iconUrl: 'images/foodgreen.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

/**
 * Main function of application, creates and manages map, anc calls functions for data etc
 */
function main() {

    map = L.map('map', {attributionControl: false}).setView([53.33729, -6.26726], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
    }).addTo(map);

    map.locate({setView: false, maxZoom: 16, watch: true, enableHighAccuracy: false});

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    showCluster(url);

    drawCanvas(bearing);

    function onLocationError(e)
    {
        alert(e.message);
    }


    /**
     * Finds users location, tracks in relation to target distance, changes onscreen info using methods
     */
    function onLocationFound(e)
    {
        radius = e.accuracy / 5;
        if (positionLatLng != null)
        {
            oldPosLatLng = positionLatLng;
            currentCircle.setLatLng(e.latlng, radius);
            currentMarker.setLatLng(e.latlng);
            currentMarker.unbindPopup();
            currentMarker.bindPopup("You are within " + radius + " meters from this point");
            if (targetBool == true)
            {
                $( ".distance" ).replaceWith( "<p class='distance'>Distance: " + distanceToTarget +" meters</p>" );
            }
            positionLatLng = e.latlng;
            distanceToTarget = haversineDistance(targetLatLng, positionLatLng);
            createLine(targetLatLng, positionLatLng);
            bearing = getBearing(positionLatLng, targetLatLng);
            rotateCanvas(bearing);
            calculateSpeed();
            if (targetBool == true)
            {
                $(".speed").replaceWith("<p class='speed'>Your speed: " + movementSpeed + " met/sec</p>");
            }
        }
        else
        {
            document.getElementById('arrow-canvas').style.visibility = 'hidden';
            currentMarker = L.marker(e.latlng).addTo(map).bindPopup("You are within " + radius + " meters from this point");
            currentCircle = L.circle(e.latlng, radius).addTo(map);
            positionLatLng = e.latlng;
        }
        if (distanceToTarget < 25)
        {
            if (targetLatLng != positionLatLng && targetBool == true)
            {
                document.getElementById('reachedPopup').style.visibility = 'visible';
            }
        }
    }
}

/**
 * Called when closing the destination reached popup
 */
function closeReachedPopup()
{
    document.getElementById('reachedPopup').style.visibility = 'hidden';
    releaseTarget();
}

/**
 * View switched to dublin when button pressed
 */
function setViewDub()
{
    map = map.setView([53.33729, -6.26726], 14);
}

/**
 * View switched to users location when button pressed
 */
function setViewLoc()
{
    map.setView(positionLatLng, 18);
}

/**
 * Method to assign geoJson data to cluster layer with icons and popup information
 */
function showCluster(url)
{
    markers = L.markerClusterGroup();
    var myIcon;

    var geoJsonLayer = L.geoJson.ajax(url,
        {
            onEachFeature: function (feature){

                var popupText = "";

                if (feature.properties.name)
                {
                    popupText += "<b>" + feature.properties.name + "</b><br />";
                }
                if (feature.properties.category)
                {
                    popupText += "<i>" + feature.properties.category + "</i><br />";
                }
                if (feature.properties.cuisine)
                {
                    popupText += feature.properties.cuisine + "<br />";
                }
                if (feature.properties.website)
                {
                    popupText += "<a href ='" + feature.properties.website + "'>" +
                        feature.properties.website + "</a><br />";
                }

                var stringified = JSON.stringify(feature);
                stringified = stringified.replace("'", "\'");
                popupText += "<button id='target' class='btn btn-primary' onclick=\'selectTarget(" + stringified + ")\'>Give me directions</button>";

                switch (feature.properties.category){
                    case "restaurant" :
                        myIcon = foodred;
                        break;
                    case "fast_food" :
                        myIcon = foodblue;
                        break;
                    case "cafe" :
                        myIcon = foodgreen;
                        break;
                    default:
                        myIcon = foodblack;
                        break;
                }

                var marker = L.marker(
                    L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
                    {
                        icon: myIcon
                    }
                );
                marker.bindPopup(popupText);
                markers.addLayer(marker);
                markers.addTo(map);
            }
        }
    )
}

/**
 * Calculates the speed of the user, semi functional (extra functionality)
 */
function calculateSpeed()
{
    if (oldTime != null)
    {
        oldTime = newTime;
        newTime = new Date();
        newTime = newTime.getTime();
        newDistance = haversineDistance(oldPosLatLng, positionLatLng);
        diffTime = newTime - oldTime;
        console.info("Distance: " + newDistance);
        console.info("Time: " + diffTime);
        movementSpeed = newDistance / diffTime;
        movementSpeed = Math.round(movementSpeed * 100) / 100;
    }
    else
    {
        newTime = new Date();
        newTime = newTime.getTime();
        oldTime = newTime;
        newDistance = haversineDistance(oldPosLatLng, positionLatLng);
        diffTime = newTime - oldTime;
        console.info("Distance: " + newDistance);
        console.info("Time: " + diffTime);
        movementSpeed = newDistance / diffTime;
        movementSpeed = Math.round(movementSpeed * 100) / 100;
    }
}

/**
 * Selects the target for the directions, calls distance and bearing methods
 */
function selectTarget(feature)
{
    targetBool = true;
    targetLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
    console.info("target: " + targetLatLng);
    console.info("position: " + positionLatLng);
    target = feature.properties.name;
    distanceToTarget = haversineDistance(targetLatLng, positionLatLng);
    bearing = getBearing(positionLatLng, targetLatLng);

    createLine(targetLatLng, positionLatLng);
    map.fitBounds(polyline.getBounds());

    rotateCanvas(bearing);
    console.info("Destination: " + target);
    console.info("Distance in meters: " + distanceToTarget);
    console.info("Bearing in degrees: " + bearing);
    document.getElementById('cancel').style.visibility = 'visible';
    document.getElementById('arrow-canvas').style.visibility = 'visible';
    $( ".destination" ).replaceWith( "<p class='destination'><b>Destination: " + target + " </b></p>" );
    $( ".distance" ).replaceWith( "<p class='distance'><i>Distance: " + distanceToTarget +" metres</i></p>" );
    $( ".speed" ).replaceWith( "<p class='speed'>Your speed: "+ movementSpeed +" met/sec</p>" );
}

/**
 * Called when cancelling directions or destination reached
 */
function releaseTarget()
{
    targetBool = false;
    document.getElementById('arrow-canvas').style.visibility = 'hidden';
    document.getElementById('cancel').style.visibility = 'hidden';
    targetLatLng = positionLatLng;
    createLine(targetLatLng, targetLatLng);
    $( ".destination" ).replaceWith( "<p class='destination'>Destination: </p>" );
    $( ".distance" ).replaceWith( "<p class='distance'>Distance: </p>" );
    $( ".speed" ).replaceWith( "<p class='speed'>Your speed: </p>" );
    setViewDub();
}

/**
 * Creates a line on the screen between target and users position
 */
function createLine()
{
    console.info("creating line");
    if (polyCounter != null)
    {
        polyline.setLatLngs(targetLatLng, positionLatLng);
    }
    polyline = L.polyline([
            targetLatLng,
            positionLatLng]
            ).addTo(map);
    polyCounter++;
}

/**
 * Draws the initial arrow/crosshair onto the screen
 */
function drawCanvas(degs)
{
    // 'arrow' is a div containing the canvas element
    // 'arrow-canvas' is the HTML canvas element

    document.getElementById('arrow').style.visibility = 'visible';
    document.getElementById('arrow-canvas').style.visibility = 'visible';

    canvas = document.getElementById('arrow-canvas');
    context = canvas.getContext('2d');

    var mapSize = map.getSize();
    canvas.style.top = ((mapSize.y / 2) - (canvas.height / 2)).toFixed() + "px";
    canvas.style.left = ((mapSize.x / 2) - (canvas.width / 2)).toFixed() + "px";

    arrowImage = new Image();
    arrowImage.onload = function ()
    {
        context.drawImage(arrowImage, ((canvas.width / 2) - (arrowImage.width / 2)), ((canvas.height / 2) - (arrowImage.height / 2)));
        rotateCanvas(degs);
    };
    arrowImage.src = 'images/crosshairs.png';
}

/**
 * Rotates the image of the arrow, uses bearing
 */
function rotateCanvas(degs)
{
    context.restore();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(degs * Math.PI / 180);
    context.drawImage(arrowImage, -arrowImage.width / 2, -arrowImage.width / 2);
}

/**
 * Used to retrieve bearing/direction of the target in relation to user, takes both points
 */
function getBearing(latLng1, latLng2)
{
    // updated - φ is latitude, λ is longitude, note that angles need to be in radians to pass to trig functions!
    var lat1 = latLng1.lat * (Math.PI / 180);
    var lat2 = latLng2.lat * (Math.PI / 180);
    var lon1 = latLng1.lng * (Math.PI / 180);
    var lon2 = latLng2.lng * (Math.PI / 180);

    var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

    //var brng = Math.atan2(y, x).toDegrees();
    return (Math.atan2(y, x)) * (180 / Math.PI);
}

/**
 * Accurately calculates distance between both points, taking into account curviture of earth
 */
function haversineDistance(latLng1, latLng2)
{
    var R = 6371000; // metres
    var lat1 = latLng1.lat * (Math.PI / 180);
    var lat2 = latLng2.lat * (Math.PI / 180);
    var deltaLat = (latLng2.lat - latLng1.lat) * (Math.PI / 180);
    var deltaLon = (latLng2.lng - latLng1.lng) * (Math.PI / 180);

    var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var result = R * c
    result = Math.round(result * 100) / 100;
    return result;
}
