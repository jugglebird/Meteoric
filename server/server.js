Meteor.startup(function () {

  Meteor.publish("heroes", function () {
    return Heroes.find();
  });

  Meteor.publish("comics", function () {
    return Comics.find();
  });

});
