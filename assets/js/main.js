requirejs.config({
    baseUrl: 'assets/js/',
    paths: {
        bootstrap: 'lib/bootstrap',
        jquery:   'lib/jquery-2.2.4.min',
        three:    'lib/three.min',
        mustache: 'lib/mustache.min',
        moment:   'lib/moment.min'
    },
    shim: {
        "bootstrap":  {"deps": ['jquery']}
    }
});


require(['model', 'view', 'controller', 'gui'],
function(FMODEL, FVIEW, FCONTROLLER, FGUI) {

console.log([
' ___ _ ___ __ __  __  __ __ ___ __  _ _____  ',
'| __| | _ \\  V  |/  \\|  V  | __|  \\| |_   _| ',
'| _|| | v / \\_/ | /\\ | \\_/ | _|| | | | | |   ',
'|_| |_|_|_\\_| |_|_||_|_| |_|___|_|\\__| |_|   ',
' '].join('\n'));

FMODEL.init();
FVIEW.init();
FGUI.init();
FCONTROLLER.init();

// expose global variables for debugging purposes
window.FIRMAMENT_EXPOSE = function() {
	window.fm = FMODEL;
	window.fv = FVIEW;
	window.fg = FGUI;
	window.fc = FCONTROLLER;
};

});
