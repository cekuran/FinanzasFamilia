// General

var Route = {
  "New":"new_main.html"
};

function doGet(e) {
  return HtmlService.createTemplateFromFile(Route.New).evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

//GET ALL VIEWS

function GetAllViews(){
  var Views = {};

  var keys = Object.keys(Route);
  keys.forEach(function(key){
    Views[key] = HtmlService.createTemplateFromFile(Route[key]).evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).getContent();
  });

  return Views;
}

//INCLUDE FILES
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



