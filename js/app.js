﻿//The google maps map
var map;

//The infoWindow object that is showing at the moment
var infoWindow;

//Venues list
var venues = [
	{idVenue: "4bdafa28c79cc928177a80e9", name: "Theatro Municipal de São Paulo", latlng: {lat: -23.545118, lng: -46.637804}},
	{idVenue: "4b93a848f964a520e44b34e3", name: "Mosteiro de São Bento", latlng: {lat: -23.543426, lng: -46.633737}},
	{idVenue: "4b1aa247f964a520f8ed23e3", name: "Galeria do Rock", latlng: {lat: -23.544295, lng: -46.638985}},
	{idVenue: "4b45fb9ff964a5207c1326e3", name: "Shopping Light", latlng: {lat: -23.546590, lng: -46.638769}},
	{idVenue: "4dd80c911838b8561cf71d18", name: "Marco Zero de São Paulo", latlng: {lat: -23.550377, lng: -46.633952}}
];

//Fired when google maps don't load.
function mapsFail(){
	alert("Google maps could not be loaded =-'(");
}

//Fired when google maps load successfully.
function loadApp(){
	try {
		map = new google.maps.Map($("#googleMap").get(0), {
			center: {lat: -23.545320, lng: -46.636676},
			zoom: 15,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControl: false
		});

		infoWindow = new google.maps.InfoWindow();

		var vw = new ViewModel();
		ko.applyBindings(vw);
	}
	catch(err) {
		alert("Something went wrong while loading the app. =-'(");
	}
}

//Creates the html for the Info Window Object
//https://developers.google.com/maps/documentation/javascript/infowindows?hl=pt-br
function createInfoWindowContent(venue) {

	var categories = '';

	for(var i = 0; i < venue.categories.length; ++i){
		categories += venue.categories[i].name;

		if(i != (venue.categories.length - 1))
			categories += ', ';
	}

	var htmlContent =
	'<div>' +
		'<h2>' + venue.name + '</h2>' +
		'<h4>' + categories + '</h4>' +
		'<hr>' +
		'<div>' +
			'<p>' + venue.location.formattedAddress[0] + ' - ' + venue.location.formattedAddress[1] + '</p>' +
			'<p>' + venue.location.formattedAddress[2] + '</p>' +
			'<br>' +
			'<sup>Power by Foursquare API</sup>' +
		'</div>' +
	'</div>';

	return htmlContent;
}

//Request Foursquare content
//https://developer.foursquare.com/docs/
function configureFoursquareData(venue, methodRef, callbackSuccess){

	var CLIENT_ID = 'N1SSOGZ0VWZGXYUCF5NXYCMNOSK4FR0PCFWZRZCDELIPKNLY';
	var CLIENT_SECRET = 'NRPURZOOR2MEMZG4MSIDAITYP3YT00UOCLBD4FLG3UW0XQSY';

	$.ajax({
		type: "GET",
		dataType: 'jsonp',
		cache: false,
		url: 'https://api.foursquare.com/v2/venues/' + venue.idVenue + '?client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&v=20130815',
		async: true,
		success: function(data) {

			if(data === undefined || data === null){
				alert('Could not retrieve foursquare data.');
				return;
			}

			infoWindow.setContent(createInfoWindowContent(data.response.venue));
			infoWindow.open(map, methodRef);

			venue.marker.setAnimation(google.maps.Animation.BOUNCE);
			setTimeout(function () {
					venue.marker.setAnimation(null);
			}, 1400);

			map.setZoom(17);

			if(callbackSuccess !== undefined)
				callbackSuccess(data.response.venue);
		},
		error: function(data) {
			alert("Something went wrong while loading the Foursquare content. =-'(");
		}
	});
}

function ViewModel (){

	var self = this;
	self.markers = [];

	//The list of venues in knockout
	self.venueKO = ko.observableArray(venues);

	//The text to filter the list
	self.textToFilter = ko.observable('');

	//More info about a venue
	self.venueName = ko.observable('');
	self.venueLikes = ko.observable('');
	self.venueImage = ko.observable('');
	self.venueUrl = ko.observable('');

	//Sets the additional info getted by foursquare
	self.setFoursquareAditionalInfo = function(venue){

		self.venueName(venue.name ? venue.name : 'No venue name available.');

		if(venue.likes !== undefined && venue.likes !== null)
			self.venueLikes(venue.likes.summary ? venue.likes.summary : 'No likes summary available');

		self.venueUrl(venue.url ? venue.url : '');

		if(venue.photos !== undefined && venue.photos !== null &&
			venue.photos.groups !== undefined && venue.photos.groups !== null &&
			venue.photos.groups.length > 0)
			self.venueImage(venue.photos.groups[0].items !== undefined && venue.photos.groups[0].items.length > 0 ? 
							venue.photos.groups[0].items[0].prefix + 'width' + venue.photos.groups[0].items[0].width + venue.photos.groups[0].items[0].suffix :
							'');
	};

	//Processes the venues list adding a google marker to each one
	self.venueKO().forEach(function(venue) {
		var marker = new google.maps.Marker({
			position: venue.latlng,
			map: map,
			icon: 'img/down_arrow.png',
			animation: google.maps.Animation.DROP
		});

		marker.setVisible(true);

		self.markers.push(marker);

		venue.marker = marker;

		venue.marker.addListener('click', function () {
			configureFoursquareData(venue, this, self.setFoursquareAditionalInfo);

			map.panTo(venue.latlng);
		});
	});

	//Filters the venues list
	//http://www.knockmeout.net/2011/04/utility-functions-in-knockoutjs.html
	self.filteredVenues = ko.computed(function () {
		return ko.utils.arrayFilter(self.venueKO(), function (listResult) {
			var result = listResult.name.toLowerCase().indexOf(self.textToFilter().toLowerCase());

			listResult.marker.setVisible(result != -1);

			return result != -1;
		});
	});

	//Processes a click in an list item showing at the map and getting additional info
	//http://knockoutjs.com/documentation/click-binding.html
	self.listItemClick = function(venue){

		if (venue.name) {
			map.panTo(venue.latlng);
			venue.marker.setAnimation(google.maps.Animation.BOUNCE); //https://developers.google.com/maps/documentation/javascript/examples/marker-animations?hl=pt-br
			configureFoursquareData(venue, venue.marker, self.setFoursquareAditionalInfo);
		}
	};
}