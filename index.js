const express = require('express')
const port = 3000
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const gpc = require('generate-pincode') // For generating entry code
const { nanoid } = require("nanoid"); // For generating meeting id

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static('public'))

var meetings = []

// GET Routes

app.get('/', (req, res) => {
  res.render('logo')
})

app.get('/m/:id', function(req, res, next){
  let id = req.params.id
  res.render('meeting',meetings[id])
})

app.param('id', function(req, res, next){

  if (meetings[req.params.id]){
    next()
  } else {
    res.render('logo')
  }
});

// APIs - POST Routes

app.post('/m/create', (req, res) => {

  if ( !req.body || !req.body.name ) {
    res.json({success:false})
    return
  }

  let meeting = createMeeting(req.body.name)
  console.log(`created meeting "${meeting.name}" with id "${meeting.id}"`)
  res.json(meeting)
})

app.post('/m/destroy', loadMeetingMiddleware, (req,res) => {

  if (destroyMeeting(req.meetingObj.id)){
    res.json({success:true})
  } else {
    res.json({success:false})
  }
})

app.post('/m/next', loadMeetingMiddleware, function(req, res){
    io.of(req.meetingObj.hostns).emit('next')
    res.json({success:true})
})

app.post('/m/prev', loadMeetingMiddleware, function(req, res){
    io.of(req.meetingObj.hostns).emit('prev')
    res.json({success:true})
})

app.post('/m/validate', loadMeetingMiddleware, function(req,res) {
  res.json({success:true})
})

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

// Helper functions

function createMeeting(name) {

  meetingObj = {}
  meetingObj.id = nanoid()
  meetingObj.name = name
  meetingObj.entrycode = gpc(4)
  meetingObj.participants = []
  meetingObj.ns = '/copresent-' + meetingObj.id
  meetingObj.hostns = meetingObj.ns + '-host'

  meetings[meetingObj.id] = meetingObj

  var host = io.of(meetingObj.hostns)
  host.on('connection',(socket) => {

    socket.on('disconnect',function() {
      destroyMeeting(meetingObj.id)
    })
  });

  // Create socket for that meeting
  var t = io.of(meetingObj.ns)

  t.on('connection', (socket) => {

    var participantName = socket.handshake.query.name ? socket.handshake.query.name : "Guest"

    meetingObj.participants[ socket.id ] = participantName
    updateParticipants(meetingObj.id)

    socket.on('disconnect',function() {
      if (!meetingObj) return;

      delete meetingObj.participants[ socket.id ]
      updateParticipants(meetingObj.id)
    })
  });

  return meetingObj
}

function updateParticipants(id) {

  var meetingObj = meetings[id]
  if (!meetingObj) return;
  var friendlyParticipants = []

  for (var key in meetingObj.participants) {
    friendlyParticipants.push(meetingObj.participants[key])
  }

  io.of(meetingObj.hostns).emit('updateParticipants',friendlyParticipants)
}

function destroyMeeting(id) {

  console.log('destroy meeting with id', id)

  if (!meetings[id]) return false

  const namespaceObject = io.of(meetings[id].ns); // Get Namespace

  namespaceObject.removeAllListeners(); // Remove all Listeners for the event emitter

  namespaceObject.clients((error, clients) => {
    if (error) throw error;

    clients.forEach(function(client) {
        namespaceObject.sockets[client].disconnect()
    })
  });

  delete meetings[id]

  if (!io['_nsps'] ) return true
  delete io['_nsps'][namespace]; // Remove from the server namespaces

  return true
}

function loadMeetingMiddleware(req, res, next) {

  if ( !req.body || !req.body.id || !meetings[req.body.id] ) {
    res.json({success:false})
    return
  }

  var meetingObj = meetings[req.body.id]
  if ( meetingObj.entrycode != req.body.entrycode ) {
    res.json({success:false})
    return
  }

  req.meetingObj = meetingObj;

  next()
}
