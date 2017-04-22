define(['jquery'],
function($) {

  // object holding all channels
  var channels = {};

  function fire(channel, paramObj) {
    if (typeof channels[channel] === 'undefined') {
      console.warn("No subscribers on channel " + channel);
    } else {
      channels[channel].forEach(function(cb) {cb(paramObj);});
    }
  }

  function on(channel, callback) {
    if (typeof channel === 'undefined') {
      console.warn("Subscribed on undefined channel");
      channel = "all";
    }
    if (!channels.hasOwnProperty(channel)) {
      channels[channel] = [];
    }
    return channels[channel].push(callback);
  }

  return {
    fire: fire,
    on: on
  };
});
