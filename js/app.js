(function(){

  // Geo namespace
  var HappyPointer;
  if (typeof exports !== 'undefined') {
    HappyPointer = exports;
  } else {
    HappyPointer = this.HappyPointer = {};
  }

  // options
  HappyPointer.options = {
    search: "coffee",
    simplegeokey: 'yXPesMqDrYfbHGvNzFYvGKxEbWmKmvC5'
  };

  // contains set of helpers for interaction
  // with simplegeo service
  HappyPointer.Service = (function(key) {
    // simplegeo clients
    var placesClient = new simplegeo.PlacesClient(key);
    var client = new simplegeo.Client(key);

    // public api
    return {
      // searches for data for given lat/lng and query
      fetch: function(latLng, query, callbacks) {
        var locations = [];
        callbacks = callbacks || {};
        placesClient.search(latLng.latitude, latLng.longitude, {q: query}, function(err, data) {
          // data is present
          if (data) {
            _.each(data.features, function(item) {
              var properties = {};
              _.extend(properties, 
                item.properties, 
                {latitude: item.geometry.coordinates[1], longitude: item.geometry.coordinates[0]});
                           
              locations.push(properties);
            });
            if (callbacks.success) {
              callbacks.success(locations);
            }
          }
          else {
            if (callbacks.error) {
              callbacks.error();
            }
          }
        });
      },

      // searches for given query and populates currentLocation 
      // and locations collection
      search: function(query, currentLocation, locations) {
        var self = this;
        this.getCurrentLoc({
          success: function(position) {
            currentLocation.set({latitude: position.coords.latitude, longitude: position.coords.longitude});
            locations.remove(locations.models);
            self.fetch(position.coords, query, {
              success: function(locs) {
                locations.add(locs);
              }
            });
          }
        });
      },
      
      // gets current location based
      // uses navigation object and falls back
      // to simplegeo client in navigation object 
      // is not present
      getCurrentLoc: function(callbacks) {
        callbacks = callbacks || {};
        // navigator object is present
        if (navigator) {
          navigator.geolocation.getCurrentPosition(function(position) {
            if (callbacks.success) {
              callbacks.success(position);
            }
          });
        }
        // fall back to simplegeo
        else {
          this.client.getLocation(function(err, position) {
            if (typeof err !== "undefined") {
              if (callbacks.success) {
                callbacks.success(position);
              }
            }
          });
        }
      }
    }
  });
    
  // init
  HappyPointer.init = function(ops) {
    _.extend(HappyPointer.options, ops);

    var currentLocation = new Location(),
      locations = new Locations(),
      geoService = HappyPointer.Service(HappyPointer.options.simplegeokey);

    // create views
    new MapView({collection: locations, model: currentLocation});
    new ClosestView({collection: locations});
    new LocationListView({collection: locations});
    geoService.search(HappyPointer.options.search, currentLocation, locations);
  }

  // represents location model
  var Location = Backbone.Model.extend({
    // creates and returns google latLng
    getLatLng: function() {
      return new google.maps.LatLng(this.get('latitude'), this.get('longitude'));
    },
    phone: function() {
      var phone = this.get('phone');
      if (typeof phone !== "undefined") {
        phone = phone.replace('+1', '');
      }
      return phone;
    }
  });

  // represents location collection
  var Locations = Backbone.Collection.extend({
    model: Location
  });

  // map view handles interaction with 
  // google maps
  var MapView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, "render");
          
      var self = this;
      this.el = $('#map_canvas');
      this.directionsService = new google.maps.DirectionsService();
      this.directionsDisplay = new google.maps.DirectionsRenderer();

      // map options
      var options = {
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
		  
      this.map = new google.maps.Map(this.el.get(0), options);
      // wire map with directions display
      this.directionsDisplay.setMap(this.map);

      this.el.parent().bind('pageshow',function(e) {
        self.render();
        google.maps.event.trigger(self.map, 'resize');
        self.el.parent().unbind('pageshow');
      });
     
      var renderDeb = _.debounce(this.render, 400);
      this.collection.bind('add', renderDeb);
      this.collection.bind('change:active', this.render);
      this.model.bind('change', function(e){
        $('#options').show();
      });
    },

    render: function(desModel) {
      desModel = desModel || this.collection.at(0);
      this.map.setCenter(this.model.getLatLng());
      
      var self = this;
      var request = { 
        origin: this.model.getLatLng(), 
        destination: desModel.getLatLng(),
        travelMode: google.maps.DirectionsTravelMode.DRIVING 
      };

      this.directionsService.route(request, function(response, status) { 
        if (status == google.maps.DirectionsStatus.OK) { 
          self.directionsDisplay.setDirections(response); 
        } 
      }); 
    }
  });

  // closest location view
  var ClosestView = Backbone.View.extend({
    initialize: function() {
      this.el = $('#closest');
       _.bindAll(this, "render");
      var renderDeb = _.debounce(this.render, 400);
      this.collection.bind('add', renderDeb);
    },

    render: function() {
      var loc = this.collection.at(0);
      this.el.html(loc.get('name') + " <br /> " + loc.phone() + " <br /> " + 
        loc.get('address') + " " + loc.get('city') + ", " + loc.get('province'));
    }
  });

  // location list view
  var LocationListView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, "render");
      var self = this;
      this.el = $('#locList');
      this.template = _.template($('#location-template').html());
      var renderDeb = _.debounce(this.render, 400);
      this.collection.bind('add', renderDeb);

      this.el.delegate('a', 'click', function(e){
        var index = $(e.currentTarget).data('index');
        self.collection.at(index).set({active: true});
      });
    },

    render: function() {
      var self = this;
      this.el.html('');
      this.collection.each(function(location, index) {
        _.extend(location.attributes, {index: index});
        self.el.append(self.template(location.attributes));
      });
    }
  });
  
})(this);

$(function(){
  HappyPointer.init({search: "coffee"});
});
