
// ---------------------------------------------
// Data loading and subscriptions
// ---------------------------------------------
Meteor.subscribe("heroes", function(heroes) {
});

Meteor.subscribe("comics", function(comics) {
});

Meteor.startup(function () {
  console.log("client", "settings", Meteor.settings.public.apikey);
  // $(".loading").removeClass("loading");
});


// ---------------------------------------------
// General Application Block
// ---------------------------------------------
Template.statusbar.status = function() {
  return Meteor.status();
};

Template.statusbar.count = function() {
  return Heroes.find().count();
};

Template.statusbar.selectedHero = function() {
  return Session.get("selectedHero") ? Session.get("selectedHero").name : "Unknown";
}

Template.statusbar.events({
  'click input#loadHeroes': function() {
    initializeHeroes();
  }
});


// ---------------------------------------------
// Character/Hero display
// ---------------------------------------------
Template.heroes.heroes = function() {
  var cutoff = 30; // Has to appear in at least this many comics
  return Heroes.find({comicCount: {$gt: cutoff}});
};

Template.heroes.events({
  'click .hero': function (event, node) {
    selectHero(this);
  }
});

Template.graph.selectedHero = function() {
  return Session.get("selectedHero") ? Session.get("selectedHero").name : "Unknown";
}

Template.graph.timestamp = function() {
  return Session.get("lastSelection");
}

Template.graph.rendered = function() {
  var svg = d3.select("svg");
  var charge = -1500;
  
  Deps.autorun(function () {
    var hero = Session.get("selectedHero");
    var timestamp = Session.get("lastSelection");
    if (typeof(Session.get("selectedHero")) === "undefined") {
      return;
    }
    var relatedHeroes = Heroes.find({_id: {$in: hero.characterIds}}).fetch();
    // relatedHeroes.push(hero);
    // console.log(relatedHeroes)
  
    var colors = d3.scale.category10();
    var nodes = relatedHeroes,
        links = relatedHeroes.map(function (rHero, index) {
          return { source: relatedHeroes.length - 1, target: index };
        });

    var force = d3.layout.force()
        .size([1000, 650])
        .nodes(nodes)
        .links(links)
        .charge(charge)
        // .chargeDistance([50])
        .on("tick", tick)
        .start();

    var svgLinks = svg.selectAll(".link").data(links)
      .enter().append("line")
        .attr("class", "link");

    var svgNodes = svg.selectAll(".node").data(nodes);

    var svgWrapper = svgNodes.enter()
        .append("g")
        .attr("class", "node");
        

    var svgCircles = svgWrapper.append("circle")
      .attr("r", 3)
      .style("fill", "white");

    svgWrapper.append("text")
      .text(function(d) { return d.name; });

    svgCircles.transition().duration(800)
        .attr("r", function (d) { return 0.05 * d.comicCount })
        .style("fill", function (d) { return colors(d.comicCount) });

    svgLinks.transition().duration(800)
        .style("stroke-width", 3);

    svgNodes.exit()
      .transition()
        .duration(3000)
        .style("opacity", 0)
        .remove();

    svgNodes.on("click", function(hero, index) {
      selectHero(hero);
      // console.log(this);
    });

    function tick () {
      svgNodes
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      svgLinks
          .attr("x1", function(d) { return d.source.x })
          .attr("y1", function(d) { return d.source.y })
          .attr("x2", function(d) { return d.target.x })
          .attr("y2", function(d) { return d.target.y });
    }
    
    

  }); // End Deps.autorun
};

// ---------------------------------------------
// Selector Dialog
// ---------------------------------------------
Template.selector.currentHero = function() {
  return (Session.get("selectedHero") === undefined) ? "" : Session.get("selectedHero").name;
}
Template.selector.thumbnail = function() {
  return (Session.get("selectedHero") === undefined) ? "" : Session.get("selectedHero").thumbnail;
}
Template.selector.selected = function() {
  return (Session.get("selectedHero") === undefined) ? "" : "selected";
}
Template.selector.settings = function() {
  return {
   position: "bottom",
   limit: 5,
   rules: [
     {
       token: '',
       collection: Heroes,
       field: "name",
       template: Template.heroAutocomplete,
       callback: selectHero
     }
   ]
  }
};

// ---------------------------------------------
// Utility functions
// ---------------------------------------------
function selectHero(hero) {
  Session.set("selectedHero", hero);
  Session.set("lastSelection", Date.now());
  console.log(hero);

  // TODO: Should we skip building the graph
  // when hero.comicIds or hero.characterIds is > 0?
  if (typeof(hero.comicIds) === "undefined" || hero.comicIds.length === 0) {
    buildHeroGraph(hero);
  }
}

function deselectHero(hero) {
  Session.set("selectedHero", null);
}

function currentHero() {
  Session.get("selectedHero");  
}

// Grabs hero data from Marvel API (in batches since there's a 100 character)
// limit and loads them into Mongo.
function initializeHeroes() {
  if (Heroes.find().count() === 0) {
    var limit = 1300;
    var requests = [];

    for (var offset = 0; offset <= limit; offset = offset + 100) {
      console.log("Loading 100 characters at offset " + offset);

      requests.push($.getJSON("http://gateway.marvel.com/v1/public/characters?apikey=" + Meteor.settings.public.apikey, {
        limit:  100,
        offset: offset
      }));
    }

    $.when.apply($, requests).done(function() {
      $.each(arguments, function (index, response) {
        console.log(response);

        _.each(response[0].data.results, function(hero) {
          if (Heroes.findOne({name: hero.name})) {
            console.log("Found " + hero.name);
          } else {
            console.log("Inserting " + hero.name);
            Heroes.insert(heroDocument(hero), function(error, _id) {
              if (error) {
                console.log("ERROR", error);
              }
              else {
                console.log("Inserted hero", _id);
              }
            });
          }
        });
      });
    });

    dataLoaded = true;
  }
  else {
    console.log("Heroes already loaded");
  }
}

function heroDocument(heroResponse) {
  return {
    _id: heroResponse.id.toString(),
    name: heroResponse.name,
    description: heroResponse.description,
    resourceURI: heroResponse.resourceURI,
    detailURI: heroResponse.urls[0].url,
    thumbnail: heroResponse.thumbnail ? (heroResponse.thumbnail.path + "." + heroResponse.thumbnail.extension) : null,
    comicCount: heroResponse.comics.available,
    eventCount: heroResponse.events.available,
    seriesCount: heroResponse.series.available,
    storyCount: heroResponse.stories.available,
    comicIds: [],
    characterIds: []
  }
}

// Grabs comic data from Marvel API, populates it into Mongo
// and then grabs related characters from the comics in order
// to build relationships with the currently selected hero
function buildHeroGraph(hero) {
  console.log(hero.resourceURI);
  // FIXME: It would be great if we could cache the response here
  $.getJSON("http://gateway.marvel.com:80/v1/public/characters/" + hero._id + "/comics?apikey=" + Meteor.settings.public.apikey,
  {
    limit: 100
  },
  function(response, status, xhr) {
    var comicIds = [];
    var characterIds = [];
    
    _.each(response.data.results, function(comicResponse) {
      var includedCharacters = _.map(comicResponse.characters.items, function(character) {
        return idFromResourceURI(character.resourceURI);
      });
      
      if (Comics.findOne({_id: comicResponse.id.toString()})) {
        console.log("Found " + comicResponse.title);
      } else {
        var comicDoc = comicDocument(comicResponse, _.uniq(includedCharacters));
        console.log("Inserting " + comicDoc.title);
        Comics.insert(comicDoc, function(error, _id) {
          if (error) {
            console.log("ERROR", error);
          }
          else {
            console.log("Inserted comic", _id);
          }
        });

        // We haven't seen this comic before, push it on the list
        // to update the character with
        comicIds.push(comicDoc._id);
        characterIds = characterIds.concat(_.uniq(includedCharacters));
      }
    });
    
    if (comicIds.length > 0 || characterIds.length > 0) {
      console.log("Update " + hero.name + " with comics " + comicIds.sort());
      console.log("Update " + hero.name + " with characters" + _.uniq(characterIds).sort());

      Heroes.update({_id: hero._id}, {
        $set: {
          comicIds: (hero.comicIds || []).concat(comicIds),
          characterIds: (hero.characterIds || []).concat(_.uniq(characterIds))
        }
      // });
      }, function(error, count) {
        console.log("Finished loading hero's comics and relationships. Re-display graph.");
        selectHero(hero)
      });

    }
  });
}

function comicDocument(comicResponse, characterIds) {
  return {
    _id: comicResponse.id.toString(),
    title: comicResponse.title,
    characterIds: characterIds
  }
}


function idFromResourceURI(resourceURI) {
  return resourceURI.match(/\d+$/)[0];
}