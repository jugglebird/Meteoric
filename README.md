Meteoric
========

A sample project to explore both Meteor.js and the Marvel API. 

## Design

There's still a lot that could be improved from a design standpoint, including:
* Bucketing the sizes of displayed circles in order to avoid too large or too small elements
* Minimizing overlap through winnowed data or adjustments to the graph layout algorithm
* Make the left hand menu of characters collapsible
* Use character image circles throughout, rather than for just the selected character
* Use the links between nodes to encode information or better display relationships

Technically, I'd be interested in:
* Moving the calls to the Marvel API to the server side -- while they're cached heavily at the client side, it would be nice to persist and share that data.
* Exploring shared state at the server for multiple simultaneous users


## Installation

In order to be able to run this application, you'll have to:

1. Install Meteor http://docs.meteor.com/
2. Copy settings.json.sample to settings.json and edit to add your copy of the Marvel API key
3. Start the app with:

```
meteor run --settings settings.json
```
