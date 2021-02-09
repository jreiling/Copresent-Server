var entryCode = ''

$(document).ready(function(){

  $( "#validation-form" ).submit(function( event ) {
    event.preventDefault();

    var params = {};
    params.entrycode = $("#inputEntryCode").val()
    params.id = id

    $.post("/m/validate", params , function( data ) {
      console.log(data,data.success)
      if (data.success) {
        setupPage()
      }
    })

  });


  var urlParams = new URLSearchParams(window.location.search);
  if ( urlParams.get('entrycode') ) {
    $("#inputEntryCode").val(urlParams.get('entrycode'))
  }
  console.log(urlParams.get('entrycode'))

});

function setupPage() {

  entryCode = $("#inputEntryCode").val()
  var socket = io('/copresent-' + id,{query:"name=" + $("#inputName").val()});

  socket.on('disconnect',function() {
    location.reload(true);
  });

  $('#validation-form').css('display','none')
  $('#controls').css('display','inherit')

  $('#back-button').mousedown(function() {
    var params = {};
    params.entrycode = $("#inputEntryCode").val()
    params.id = id

    $.post("/m/prev", params , function( data ) {
    });

    flashStatus()
  })

  $('#forward-button').mousedown(function() {
    var params = {};
    params.entrycode = $("#inputEntryCode").val()
    params.id = id

    $.post("/m/next", params , function( data ) {
    });

    flashStatus()
  })

  $('#forward-button').mouseover(function() {
    $('#forward-arrow-over').css('display', 'inherit');

  })
  $('#forward-button').mouseout(function() {
    $('#forward-arrow-over').css('display', 'none');
  })

  $('#back-button').mouseover(function() {
    $('#back-arrow-over').css('display', 'inherit');

  })
  $('#back-button').mouseout(function() {
    $('#back-arrow-over').css('display', 'none');
  })
}

timeoutInterval = 0;
function flashStatus() {
  clearInterval(timeoutInterval);
  $('#status-on').css('display', 'inherit');
  timeoutInterval = setInterval(function() {
    $('#status-on').css('display', 'none');

  },200)
}
