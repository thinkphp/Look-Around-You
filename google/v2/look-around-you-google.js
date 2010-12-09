YUI().use('node',function(Y){

      document.getElementsByTagName('body')[0].className = 'js';
      yqlgeo.get('visitor',function(o){
             yqlgeo.getInfo(o);
      });

      yqlgeo.getInfo = function(o) {
             var curr = o.place ? o.place : o;
             yqlgeo.rendermap('*',curr.centroid.latitude,
                                  curr.centroid.longitude,
                                  curr.boundingBox.northEast.latitude,
                                  curr.boundingBox.northEast.longitude,
                                  curr.boundingBox.southWest.latitude,
                                  curr.boundingBox.southWest.longitude);
             Y.one('#sights').set('innerHTML','Loading sights&hellip;');

             //REST for neighbours
             var yql = 'select * from geo.places.neighbors where neighbor_woeid = "'+ curr.woeid + '"';  
             if(window.console) {console.log(yql);}
             var url = 'http://query.yahooapis.com/v1/public/yql?q='+
                        encodeURIComponent(yql) + '&format=json&callback=yqlgeo.neighbours';
             Y.one('#neighbours').set('innerHTML','Loading neighbouring areas...');
             yqlgeo.get(url);    

             //REST for wikipedia     
             var yqlwiki = 'http://ws.geonames.org/findNearbyWikipediaJSON?formatted=true&'+
                           'lat='+curr.centroid.latitude+'&lng='+curr.centroid.longitude+
                           '&style=full&callback=yqlgeo.wiki';
             yqlgeo.get(yqlwiki);                     

             //REST for children
             var yql = 'select * from geo.places.children where parent_woeid = "'+ curr.woeid + '"';  
             if(window.console) {console.log(yql);}
             var url = 'http://query.yahooapis.com/v1/public/yql?q='+
                        encodeURIComponent(yql) + '&format=json&callback=yqlgeo.children';
             Y.one('#children').set('innerHTML','Loading children areas...');
             yqlgeo.get(url);    

      };       

      yqlgeo.get = function(url) {
            var s = document.createElement('script');
                s.setAttribute('type','text/javascript');       
                s.setAttribute('src',url);
                document.getElementsByTagName('head')[0].appendChild(s);
      }

      yqlgeo.rendermap = function() {
           var x = arguments;
           if(GBrowserIsCompatible()) {
               if(x[1]) { 
                 yqlgeo.map = new GMap2(document.getElementById('map'));
                 yqlgeo.map.addControl(new GSmallMapControl());
                 yqlgeo.map.addControl(new GMapTypeControl());
                 yqlgeo.map.setMapType(G_NORMAL_MAP);
                 var points = [];
                 var point = new GLatLng(x[1],x[2]);
                     points.push(point);
                 var m = new GMarker(point);
                     m.bindInfoWindowHtml('Here I am');  
                 yqlgeo.map.addOverlay(m);
              }//end if

              if(x[3] && x[4]) {
                 point = new GLatLng(x[3],x[4]);
                 points.push(point);
              }
 
              if(x[5] && x[6]) {
                 point = new GLatLng(x[5],x[6]);
                 points.push(point);
              }
              yqlgeo.map.setCenter(points[0], 4);
           }//end if GBrowserCompatible
      };

      yqlgeo.neighbours = function(o) {
            //if we not have an error then go ahead
            if(!o.error && o.query.results && o.query.results.place) {
                var out = '<ul><li>Neighbours for this area:<ul>';
                //save vector places
                yqlgeo.neighbourdata = o.query.results.place;
                //get vector length
                var all = o.query.results.place.length;
                //if we have more neighbours
                if(all>0) { 
                  for(var i=0;i<all;i++) {
                     var curr = o.query.results.place[i];
                     out += '<li><a href="#n'+i+'">'+curr.name+'</a></li>';  
                  }  
                  out += '</ul></li></ul>';
                  Y.one('#neighbours').set('innerHTML',out);
                //if we have one neighbour
                } else {
                     var curr = o.query.results.place; 
                     yqlgeo.neighbourdata[0] = o.query.results.place;
                     out += '<li><a href="#n0">'+curr.name+'</a></li></ul>';  
                     Y.one('#neighbours').set('innerHTML',out);
                }

            //otherwise set neighbours'innerHTML with not found
            } else {
                     Y.one('#neighbours').set('innerHTML','Neighbours: were not found.');
            }
      }; 

      yqlgeo.wiki = function(o) {
             //if we have geonames the go ahead
             if(o.geonames) {
                //define bounds
                var bounds = new GLatLngBounds();
                //define a vector of markers
                var markers = [];
                //create a markup '<UL>'
                var out = '<ul>';
                //for each geoname execute
                for(var i=0;i<o.geonames.length;i++) {                    
                        var sight = o.geonames[i];
                        out += '<li><h2><span>'+String.fromCharCode(markers.length+65)+'.</span><a href="http://'+sight.wikipediaUrl+'">'+sight.title+'</a></h2><p>';
                        //if we have an image from this place then display it
                        if(sight.thumbnailImg) {
                              out += '<img src="'+sight.thumbnailImg+'" alt="img">';
                        }
                        out += sight.summary + '</p>' + 
                        '<p class="distance">' + sight.distance + ' miles away</p>' +
                        '<p class="url"><a href="http://'+sight.wikipediaUrl+'">http://'+sight.wikipediaUrl+'</a></p>'+
                         '</li>';
                     //create a point with this latitude, this longitude
                     var point = new GLatLng(sight.lat,sight.lng);
                         bounds.extend(point);
                         markers.push(point);     
                     var img = new GIcon(G_DEFAULT_ICON);
                         img.image = "http://maps.google.com/mapfiles/marker" + String.fromCharCode(markers.length+64) + ".png";
                     //create a marker with this point
                     var marker = new GMarker(point,{icon: img}); 
                         //added infowindow
                         marker.bindInfoWindowHtml(sight.title);                         
                         //added marker to the map
                         yqlgeo.map.addOverlay(marker); 
                 }//endfor o.geonames.length
                 out += '</ol>'; 
                 yqlgeo.map.setCenter(bounds.getCenter(),yqlgeo.map.getBoundsZoomLevel(bounds))
            }//end if o.geonames

            Y.one('#sights').set('innerHTML',out); 
      };

      
      //adding event delegation for div #sights
      Y.delegate('click',function(e){
            e.preventDefault();
            var dad = Y.one(e.target).ancestor('li');
            if(dad.hasClass('show')) {
              dad.removeClass('show');
            } else {
              dad.addClass('show');
            }            
      },'#sights','h2 a');   

      //adding event delegation for div #neighbours
      Y.delegate('click',function(e){
            e.preventDefault();
            var current = Y.one(e.target).get('href').replace(/.*#n/,'');
            if(yqlgeo.neighbourdata[current]) {
               yqlgeo.getInfo(yqlgeo.neighbourdata[current]); 
            }
      },'#neighbours','a');      


      yqlgeo.children = function(o) {
            //if we not have an error then go ahead
            if(!o.error && o.query.results && o.query.results.place) {
                var out = '<ul><li>Children for this area:<ul>';
                //save vector places
                yqlgeo.childrendata = o.query.results.place;
                //get vector length
                var all = o.query.results.place.length;
                //if we have more children
                if(all>0) { 
                  for(var i=0;i<all;i++) {
                     var curr = o.query.results.place[i];
                     out += '<li><a href="#c'+i+'">'+curr.name+'</a></li>';  
                  }  
                  out += '</ul></li></ul>';
                  Y.one('#children').set('innerHTML',out);
                //if we have one child
                } else {
                     var curr = o.query.results.place; 
                     yqlgeo.childrendata[0] = o.query.results.place;
                     out += '<li><a href="#c0">'+curr.name+'</a></li></ul>';  
                     Y.one('#children').set('innerHTML',out);
                }
            //otherwise set children'innerHTML with not found
            } else {
                     Y.one('#children').set('innerHTML','Children: were not found.');
            }
      };

      //adding event delegation for div #neighbours
      Y.delegate('click',function(e){
            e.preventDefault();
            var current = Y.one(e.target).get('href').replace(/.*#c/,'');
            if(yqlgeo.childrendata[current]) {
               yqlgeo.getInfo(yqlgeo.childrendata[current]); 
            }
      },'#children','a');
});
